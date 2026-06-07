create extension if not exists postgis with schema extensions;

alter table public.profiles
  add column if not exists profile_image_url text;

alter table if exists public.landlords
  add column if not exists profile_photo_url text;

alter table if exists public.applicants
  add column if not exists profile_image_url text;

create table if not exists public.profile_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

alter table public.profile_images enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profile_images' and policyname = 'profile_images_public_select'
  ) then
    create policy profile_images_public_select
      on public.profile_images
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profile_images' and policyname = 'profile_images_owner_insert'
  ) then
    create policy profile_images_owner_insert
      on public.profile_images
      for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profile_images' and policyname = 'profile_images_owner_delete'
  ) then
    create policy profile_images_owner_delete
      on public.profile_images
      for delete
      using (user_id = auth.uid());
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_profile_images_read'
  ) then
    create policy storage_profile_images_read
      on storage.objects
      for select
      using (bucket_id = 'profile-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_profile_images_insert'
  ) then
    create policy storage_profile_images_insert
      on storage.objects
      for insert
      with check (bucket_id = 'profile-images' and auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_profile_images_update'
  ) then
    create policy storage_profile_images_update
      on storage.objects
      for update
      using (bucket_id = 'profile-images' and auth.uid() is not null)
      with check (bucket_id = 'profile-images' and auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_profile_images_delete'
  ) then
    create policy storage_profile_images_delete
      on storage.objects
      for delete
      using (bucket_id = 'profile-images' and auth.uid() is not null);
  end if;
end $$;

alter table public.properties
  add column if not exists address text,
  add column if not exists borough text,
  add column if not exists rent integer,
  add column if not exists geographic_point geography(Point, 4326);

update public.properties
set
  address = coalesce(address, concat_ws(', ', address_line_1, address_line_2, area, city)),
  rent = coalesce(rent, rent_pcm),
  geographic_point = case
    when latitude is not null and longitude is not null
    then st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
    else geographic_point
  end
where address is null or rent is null or geographic_point is null;

create index if not exists properties_geographic_point_idx
  on public.properties
  using gist (geographic_point);

create or replace function public.sync_property_geographic_point()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geographic_point := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  new.address := coalesce(new.address, concat_ws(', ', new.address_line_1, new.address_line_2, new.area, new.city));
  new.rent := coalesce(new.rent, new.rent_pcm);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_property_geographic_point_on_properties on public.properties;

create trigger sync_property_geographic_point_on_properties
before insert or update of latitude, longitude, address_line_1, address_line_2, area, city, rent_pcm
on public.properties
for each row execute function public.sync_property_geographic_point();
