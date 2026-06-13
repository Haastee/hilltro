-- Referencing V1 — Didit identity verification + supporting tables.
-- Adds: current identity-verification state per user, a raw webhook audit log
-- (idempotency), internal notifications, and referencing wizard persistence.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Current identity-verification state (one row per user; updated on retries).
create table if not exists public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  didit_session_id text unique,
  didit_verification_id text,
  status text not null default 'pending'
    check (status in ('pending','in_progress','review','approved','declined','abandoned','expired')),
  decision jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.identity_verifications enable row level security;
drop policy if exists identity_verifications_self_select on public.identity_verifications;
create policy identity_verifications_self_select on public.identity_verifications
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policies: only the Edge Functions (service role,
-- which bypasses RLS) write these rows.
drop trigger if exists trg_identity_verifications_updated on public.identity_verifications;
create trigger trg_identity_verifications_updated before update on public.identity_verifications
  for each row execute function public.set_updated_at();

-- 2) Raw webhook payloads — audit + idempotency. Service-role only.
create table if not exists public.identity_verification_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,
  session_id text,
  user_id uuid,
  webhook_type text,
  status text,
  payload jsonb not null,
  signature_valid boolean,
  received_at timestamptz not null default now()
);
alter table public.identity_verification_events enable row level security;
-- Intentionally no policies (like public.agent_memory): not client-readable.

-- 3) Internal notifications (future admin tooling consumes these).
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  reason text,
  reference text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.notifications enable row level security;
drop policy if exists notifications_self_select on public.notifications;
create policy notifications_self_select on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- 4) Referencing wizard persistence (personal details + address history).
create table if not exists public.referencing_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  date_of_birth date,
  addresses jsonb not null default '[]'::jsonb,
  status text not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.referencing_applications enable row level security;
drop policy if exists referencing_applications_self_all on public.referencing_applications;
create policy referencing_applications_self_all on public.referencing_applications
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists trg_referencing_applications_updated on public.referencing_applications;
create trigger trg_referencing_applications_updated before update on public.referencing_applications
  for each row execute function public.set_updated_at();

-- 5) Realtime so the referencing dashboard updates without a manual refresh.
do $$ begin
  alter publication supabase_realtime add table public.identity_verifications;
exception when duplicate_object then null; end $$;
