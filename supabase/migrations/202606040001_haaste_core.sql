create extension if not exists "pgcrypto";

create type public.user_role as enum ('tenant', 'landlord');
create type public.property_status as enum ('draft', 'review', 'live', 'inactive', 'let');
create type public.viewing_status as enum ('requested', 'accepted', 'declined', 'completed', 'cancelled');
create type public.offer_status as enum ('submitted', 'countered', 'accepted', 'declined', 'expired');
create type public.deal_status as enum ('active', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  phone text,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null,
  postcode_district text,
  city text,
  borough text,
  neighbourhood text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  address_line_1 text not null,
  address_line_2 text,
  area text,
  city text not null,
  postcode text not null,
  postcode_district text not null,
  latitude double precision,
  longitude double precision,
  property_type text not null,
  bedrooms int not null,
  bathrooms int not null,
  receptions int default 0,
  outside_space text[] not null default '{}',
  parking text,
  furnishing text,
  description text,
  rent_pcm int,
  status public.property_status not null default 'draft',
  draft_step int not null default 0,
  draft_payload jsonb not null default '{}',
  compliance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.floorplans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.viewings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  requested_date date not null,
  requested_time time not null,
  message text,
  status public.viewing_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  offer_rent_pcm int not null,
  move_in_date date not null,
  notes text,
  counter_rent_pcm int,
  counter_move_in_date date,
  counter_notes text,
  status public.offer_status not null default 'submitted',
  expires_at timestamptz not null default (now() + interval '72 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  agreed_rent_pcm int not null,
  agreed_move_date date not null,
  status public.deal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  query text not null,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(property_id, tenant_id)
);

create unique index deals_one_active_per_property on public.deals(property_id) where status = 'active';
create index properties_status_idx on public.properties(status);
create index properties_landlord_idx on public.properties(landlord_id);
create index properties_search_idx on public.properties(postcode_district, city, area);
create index property_photos_property_sort_idx on public.property_photos(property_id, sort_order);
create index viewings_property_idx on public.viewings(property_id, status);
create index offers_property_idx on public.offers(property_id, status);
create index conversations_participants_idx on public.conversations(landlord_id, tenant_id, property_id);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index locations_lookup_idx on public.locations(kind, postcode_district, city);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_photos enable row level security;
alter table public.floorplans enable row level security;
alter table public.viewings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.offers enable row level security;
alter table public.deals enable row level security;
alter table public.search_history enable row level security;
alter table public.locations enable row level security;
alter table public.saved_properties enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid());
create policy profiles_self_insert on public.profiles for insert with check (id = auth.uid());

create policy properties_public_live_select on public.properties for select using (status = 'live' or landlord_id = auth.uid());
create policy properties_landlord_insert on public.properties for insert with check (landlord_id = auth.uid());
create policy properties_landlord_update on public.properties for update using (landlord_id = auth.uid());
create policy properties_landlord_delete on public.properties for delete using (landlord_id = auth.uid());

create policy property_photos_public_live_select on public.property_photos for select using (exists (select 1 from public.properties p where p.id = property_id and (p.status = 'live' or p.landlord_id = auth.uid())));
create policy property_photos_landlord_all on public.property_photos for all using (exists (select 1 from public.properties p where p.id = property_id and p.landlord_id = auth.uid())) with check (exists (select 1 from public.properties p where p.id = property_id and p.landlord_id = auth.uid()));

create policy floorplans_public_live_select on public.floorplans for select using (exists (select 1 from public.properties p where p.id = property_id and (p.status = 'live' or p.landlord_id = auth.uid())));
create policy floorplans_landlord_all on public.floorplans for all using (exists (select 1 from public.properties p where p.id = property_id and p.landlord_id = auth.uid())) with check (exists (select 1 from public.properties p where p.id = property_id and p.landlord_id = auth.uid()));

create policy viewings_participant_select on public.viewings for select using (landlord_id = auth.uid() or tenant_id = auth.uid());
create policy viewings_tenant_insert on public.viewings for insert with check (tenant_id = auth.uid());
create policy viewings_participant_update on public.viewings for update using (landlord_id = auth.uid() or tenant_id = auth.uid());

create policy conversations_participant_select on public.conversations for select using (landlord_id = auth.uid() or tenant_id = auth.uid());
create policy conversations_participant_insert on public.conversations for insert with check (landlord_id = auth.uid() or tenant_id = auth.uid());
create policy conversations_participant_update on public.conversations for update using (landlord_id = auth.uid() or tenant_id = auth.uid());

create policy messages_participant_select on public.messages for select using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.landlord_id = auth.uid() or c.tenant_id = auth.uid())));
create policy messages_sender_insert on public.messages for insert with check (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and (c.landlord_id = auth.uid() or c.tenant_id = auth.uid())));
create policy messages_participant_update on public.messages for update using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.landlord_id = auth.uid() or c.tenant_id = auth.uid())));

create policy offers_participant_select on public.offers for select using (landlord_id = auth.uid() or tenant_id = auth.uid());
create policy offers_tenant_insert on public.offers for insert with check (tenant_id = auth.uid());
create policy offers_participant_update on public.offers for update using (landlord_id = auth.uid() or tenant_id = auth.uid());

create policy deals_participant_select on public.deals for select using (landlord_id = auth.uid() or tenant_id = auth.uid());
create policy deals_landlord_insert on public.deals for insert with check (landlord_id = auth.uid());
create policy deals_landlord_update on public.deals for update using (landlord_id = auth.uid());

create policy search_history_self on public.search_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy locations_read_all on public.locations for select using (true);
create policy saved_properties_self on public.saved_properties for all using (tenant_id = auth.uid()) with check (tenant_id = auth.uid());

create policy storage_property_photos_read on storage.objects for select using (bucket_id = 'property-photos');
create policy storage_property_photos_write on storage.objects for insert with check (bucket_id = 'property-photos' and auth.uid() is not null);
create policy storage_property_photos_update on storage.objects for update using (bucket_id = 'property-photos' and auth.uid() is not null);
create policy storage_floorplans_read on storage.objects for select using (bucket_id = 'floorplans');
create policy storage_floorplans_write on storage.objects for insert with check (bucket_id = 'floorplans' and auth.uid() is not null);
create policy storage_compliance_private on storage.objects for all using (bucket_id = 'compliance-documents' and auth.uid() is not null) with check (bucket_id = 'compliance-documents' and auth.uid() is not null);

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true),
       ('floorplans', 'floorplans', true),
       ('compliance-documents', 'compliance-documents', false)
on conflict (id) do nothing;
