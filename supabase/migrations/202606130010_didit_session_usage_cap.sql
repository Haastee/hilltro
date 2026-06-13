-- Usage log so we can cap Didit verification checks at 500 per calendar month.
-- One row is written by the referencing-session Edge Function each time a Didit
-- session is created. Service-role only (no client policies).

create table if not exists public.didit_session_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);
alter table public.didit_session_log enable row level security;
create index if not exists didit_session_log_created_at_idx on public.didit_session_log (created_at);
