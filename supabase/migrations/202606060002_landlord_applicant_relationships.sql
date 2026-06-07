create table if not exists public.landlords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  middle_name text,
  last_name text not null,
  display_name text not null,
  profile_photo_url text,
  bio text,
  landlord_type text not null default 'Private Landlord' check (landlord_type in ('Private Landlord', 'Professional Landlord')),
  properties_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  profile_image_url text,
  affordability_result integer,
  referencing_status text not null default 'In Review',
  employment_status text,
  move_date date,
  occupants text,
  pets text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landlords enable row level security;
alter table public.applicants enable row level security;

alter table public.properties
  add column if not exists landlord_id uuid references public.landlords(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists district text,
  add column if not exists address text,
  add column if not exists rent integer;

update public.properties
set
  district = coalesce(district, postcode_district),
  address = coalesce(address, concat_ws(', ', address_line_1, address_line_2, city)),
  rent = coalesce(rent, rent_pcm)
where district is null or address is null or rent is null;

alter table public.conversations
  add column if not exists property_id uuid references public.properties(id) on delete cascade,
  add column if not exists landlord_id uuid references public.landlords(id) on delete set null,
  add column if not exists applicant_id uuid references public.applicants(id) on delete set null;

alter table public.viewings
  add column if not exists applicant_id uuid references public.applicants(id) on delete set null,
  add column if not exists requested_time text,
  add column if not exists status text not null default 'Pending'
    check (status in ('Pending', 'Accepted', 'Declined', 'Reschedule Requested', 'Completed'));

alter table public.offers
  add column if not exists applicant_id uuid references public.applicants(id) on delete set null,
  add column if not exists occupants text,
  add column if not exists pets text,
  add column if not exists status text not null default 'Pending'
    check (status in ('Pending', 'Counter Offered', 'Accepted', 'Declined', 'Expired'));

create unique index if not exists one_accepted_offer_per_property
  on public.offers(property_id)
  where status = 'accepted';

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landlords' and policyname = 'landlords_public_select'
  ) then
    create policy landlords_public_select
      on public.landlords
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landlords' and policyname = 'landlords_self_insert'
  ) then
    create policy landlords_self_insert
      on public.landlords
      for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landlords' and policyname = 'landlords_self_update'
  ) then
    create policy landlords_self_update
      on public.landlords
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landlords' and policyname = 'landlords_self_delete'
  ) then
    create policy landlords_self_delete
      on public.landlords
      for delete
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'applicants' and policyname = 'applicants_self_or_landlord_select'
  ) then
    create policy applicants_self_or_landlord_select
      on public.applicants
      for select
      using (
        user_id = auth.uid()
        or exists (
          select 1
          from public.offers o
          where o.applicant_id = applicants.id
            and o.landlord_id = auth.uid()
        )
        or exists (
          select 1
          from public.viewings v
          where v.applicant_id = applicants.id
            and v.landlord_id = auth.uid()
        )
        or exists (
          select 1
          from public.conversations c
          where c.applicant_id = applicants.id
            and c.landlord_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'applicants' and policyname = 'applicants_self_insert'
  ) then
    create policy applicants_self_insert
      on public.applicants
      for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'applicants' and policyname = 'applicants_self_update'
  ) then
    create policy applicants_self_update
      on public.applicants
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

create or replace function public.refresh_landlord_type()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.landlords l
  set
    properties_count = coalesce(counts.total, 0),
    landlord_type = case when coalesce(counts.total, 0) >= 3 then 'Professional Landlord' else 'Private Landlord' end,
    updated_at = now()
  from public.landlords base
  left join (
    select landlord_id, count(*)::integer as total
    from public.properties
    where landlord_id is not null
    group by landlord_id
  ) counts on counts.landlord_id = base.id
  where l.id = base.id;
  return null;
end;
$$;

drop trigger if exists refresh_landlord_type_on_properties on public.properties;
create trigger refresh_landlord_type_on_properties
after insert or update of landlord_id or delete on public.properties
for each statement execute function public.refresh_landlord_type();

create or replace function public.close_other_offers_when_accepted()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'accepted' then
    update public.offers
    set status = 'declined'
    where property_id = new.property_id
      and id <> new.id
      and status in ('submitted', 'countered');
  end if;
  return new;
end;
$$;

drop trigger if exists close_other_offers_when_accepted on public.offers;
create trigger close_other_offers_when_accepted
after insert or update of status on public.offers
for each row execute function public.close_other_offers_when_accepted();
