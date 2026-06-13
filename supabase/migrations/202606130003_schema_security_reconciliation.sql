-- Keep local migrations aligned with the live schema decisions:
-- profile images are stored on public.profiles.profile_image_url, not a
-- separate public.profile_images table, and profile/name RPCs should not leak
-- unrelated profile data to anonymous callers.

alter table public.profiles
  add column if not exists profile_image_url text;

alter table public.properties
  add column if not exists floor_level text,
  add column if not exists has_lift boolean,
  add column if not exists available_from date;

drop table if exists public.profile_images cascade;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  given text := nullif(new.raw_user_meta_data ->> 'first_name', '');
  middle text := nullif(new.raw_user_meta_data ->> 'middle_name', '');
  family text := nullif(new.raw_user_meta_data ->> 'last_name', '');
  legacy_name text := nullif(new.raw_user_meta_data ->> 'name', '');
  image text := nullif(new.raw_user_meta_data ->> 'profile_image_url', '');
begin
  given := coalesce(given, nullif(split_part(coalesce(legacy_name, ''), ' ', 1), ''), split_part(new.email, '@', 1));
  family := coalesce(family, nullif(regexp_replace(trim(coalesce(legacy_name, '')), '^.*\s', ''), ''), given);

  insert into public.profiles (id, email, name, first_name, middle_name, last_name, phone, role, profile_image_url)
  values (
    new.id,
    lower(new.email),
    trim(concat_ws(' ', given, middle, family)),
    given,
    middle,
    family,
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'tenant')::public.user_role,
    image
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    first_name = excluded.first_name,
    middle_name = excluded.middle_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    role = excluded.role,
    profile_image_url = coalesce(excluded.profile_image_url, public.profiles.profile_image_url),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.relationship_level(viewer uuid, target uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target is null then 'none'
    when viewer is null then 'public'
    when viewer = target then 'self'
    when exists (select 1 from public.deals d
      where (d.landlord_id = viewer and d.tenant_id = target)
         or (d.landlord_id = target and d.tenant_id = viewer)) then 'deal'
    when exists (select 1 from public.offers o
      where (o.landlord_id = viewer and o.tenant_id = target)
         or (o.landlord_id = target and o.tenant_id = viewer))
      or exists (select 1 from public.viewings v
      where (v.landlord_id = viewer and v.tenant_id = target)
         or (v.landlord_id = target and v.tenant_id = viewer)) then 'offer'
    else 'public'
  end;
$$;

create or replace function public.property_owner(p uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select landlord_id from public.properties where id = p;
$$;

create or replace function public.disclosed_name(target uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case public.relationship_level(auth.uid(), target)
    when 'self' then trim(concat_ws(' ', p.first_name, p.middle_name, p.last_name))
    when 'deal' then trim(concat_ws(' ', p.first_name, p.middle_name, p.last_name))
    when 'offer' then p.first_name || coalesce(' ' || upper(left(nullif(p.last_name, ''), 1)) || '.', '')
    else null
  end
  from public.profiles p
  where p.id = target;
$$;

create or replace function public.get_counterparty_profile(target uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.relationship_level(auth.uid(), target) in ('self', 'deal', 'offer') then json_build_object(
      'id', p.id,
      'display_name', public.disclosed_name(target),
      'first_name', case when public.relationship_level(auth.uid(), target) in ('self', 'deal', 'offer') then p.first_name else null end,
      'role', p.role,
      'disclosure_level', public.relationship_level(auth.uid(), target)
    )
    else null
  end
  from public.profiles p
  where p.id = target;
$$;

create or replace function public.get_property_full_address(p uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case when
       public.property_owner(p) = auth.uid()
    or exists (select 1 from public.viewings v
        where v.property_id = p and v.tenant_id = auth.uid()
          and v.status in ('accepted','completed'))
    or exists (select 1 from public.deals d
        where d.property_id = p and (d.tenant_id = auth.uid() or d.landlord_id = auth.uid()))
  then (
    select json_build_object(
      'address_line_1', pr.address_line_1,
      'address_line_2', pr.address_line_2,
      'postcode', pr.postcode,
      'latitude', pr.latitude,
      'longitude', pr.longitude,
      'full_address', coalesce(pr.address, concat_ws(', ', pr.address_line_1, pr.address_line_2, pr.area, pr.city, pr.postcode))
    ) from public.properties pr where pr.id = p)
  else null end;
$$;

revoke execute on function public.disclosed_name(uuid) from public;
revoke execute on function public.get_counterparty_profile(uuid) from public;
revoke execute on function public.get_property_full_address(uuid) from public;
grant execute on function public.disclosed_name(uuid) to authenticated;
grant execute on function public.get_counterparty_profile(uuid) to authenticated;
grant execute on function public.get_property_full_address(uuid) to authenticated;

drop policy if exists storage_property_photos_update on storage.objects;
create policy storage_property_photos_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'property-photos' and auth.uid() is not null)
  with check (bucket_id = 'property-photos' and auth.uid() is not null);

drop policy if exists storage_property_videos_update on storage.objects;
create policy storage_property_videos_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'property-videos' and auth.uid() is not null)
  with check (bucket_id = 'property-videos' and auth.uid() is not null);

drop policy if exists storage_profile_images_update on storage.objects;
create policy storage_profile_images_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'profile-images' and auth.uid() is not null)
  with check (bucket_id = 'profile-images' and auth.uid() is not null);

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
where id in ('property-photos', 'floorplans');

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'profile-images';

update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime']
where id = 'property-videos';
