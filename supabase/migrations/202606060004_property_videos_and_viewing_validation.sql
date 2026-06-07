create table if not exists public.property_videos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text,
  public_url text,
  external_url text,
  provider text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_videos_has_source check (public_url is not null or external_url is not null)
);

alter table public.property_videos enable row level security;

create index if not exists property_videos_property_idx on public.property_videos(property_id);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'property_videos' and policyname = 'property_videos_public_live_select'
  ) then
    create policy property_videos_public_live_select
      on public.property_videos
      for select
      using (
        exists (
          select 1
          from public.properties p
          where p.id = property_id
            and (p.status = 'live' or p.landlord_id = auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'property_videos' and policyname = 'property_videos_landlord_all'
  ) then
    create policy property_videos_landlord_all
      on public.property_videos
      for all
      using (
        exists (
          select 1
          from public.properties p
          where p.id = property_id
            and p.landlord_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.properties p
          where p.id = property_id
            and p.landlord_id = auth.uid()
        )
      );
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('property-videos', 'property-videos', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_property_videos_read'
  ) then
    create policy storage_property_videos_read
      on storage.objects
      for select
      using (bucket_id = 'property-videos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_property_videos_insert'
  ) then
    create policy storage_property_videos_insert
      on storage.objects
      for insert
      with check (bucket_id = 'property-videos' and auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_property_videos_update'
  ) then
    create policy storage_property_videos_update
      on storage.objects
      for update
      using (bucket_id = 'property-videos' and auth.uid() is not null)
      with check (bucket_id = 'property-videos' and auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_property_videos_delete'
  ) then
    create policy storage_property_videos_delete
      on storage.objects
      for delete
      using (bucket_id = 'property-videos' and auth.uid() is not null);
  end if;
end $$;

create or replace function public.enforce_valid_viewing_slot()
returns trigger
language plpgsql
as $$
declare
  requested_at timestamptz;
begin
  requested_at := ((new.requested_date::text || ' ' || new.requested_time::text)::timestamp at time zone 'Europe/London');

  if requested_at < now() + interval '1 hour' then
    raise exception 'Viewing requests must be at least one hour from now.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists viewings_valid_slot on public.viewings;

create trigger viewings_valid_slot
before insert or update of requested_date, requested_time
on public.viewings
for each row
execute function public.enforce_valid_viewing_slot();
