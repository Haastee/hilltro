alter table public.properties
  add column if not exists features text[] not null default '{}';

update public.properties
set features = coalesce(features, '{}')
where features is null;
