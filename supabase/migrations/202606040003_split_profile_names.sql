alter table public.profiles
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) then
    execute 'update public.profiles set name = coalesce(nullif(name, ''''), nullif(full_name, ''''), split_part(email, ''@'', 1))';
  end if;
end $$;

update public.profiles
set
  first_name = coalesce(nullif(first_name, ''), nullif(split_part(coalesce(name, ''), ' ', 1), ''), split_part(email, '@', 1)),
  middle_name = coalesce(
    nullif(middle_name, ''),
    case
      when array_length(regexp_split_to_array(trim(coalesce(name, '')), '\s+'), 1) > 2
      then nullif(array_to_string((regexp_split_to_array(trim(coalesce(name, '')), '\s+'))[2:array_length(regexp_split_to_array(trim(coalesce(name, '')), '\s+'), 1) - 1], ' '), '')
      else null
    end
  ),
  last_name = coalesce(
    nullif(last_name, ''),
    case
      when trim(coalesce(name, '')) <> '' then regexp_replace(trim(name), '^.*\s', '')
      else null
    end,
    nullif(split_part(coalesce(name, ''), ' ', 1), ''),
    split_part(email, '@', 1)
  );

update public.profiles
set middle_name = null
where middle_name = '';

alter table public.profiles
  alter column first_name set not null,
  alter column last_name set not null;

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
begin
  given := coalesce(given, nullif(split_part(coalesce(legacy_name, ''), ' ', 1), ''), split_part(new.email, '@', 1));
  family := coalesce(family, nullif(regexp_replace(trim(coalesce(legacy_name, '')), '^.*\s', ''), ''), given);

  insert into public.profiles (id, email, name, first_name, middle_name, last_name, phone, role)
  values (
    new.id,
    lower(new.email),
    trim(concat_ws(' ', given, middle, family)),
    given,
    middle,
    family,
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'tenant')::public.user_role
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    first_name = excluded.first_name,
    middle_name = excluded.middle_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

insert into public.profiles (id, email, name, first_name, middle_name, last_name, phone, role)
select
  users.id,
  lower(users.email),
  trim(concat_ws(
    ' ',
    coalesce(nullif(users.raw_user_meta_data ->> 'first_name', ''), nullif(split_part(coalesce(users.raw_user_meta_data ->> 'name', ''), ' ', 1), ''), split_part(users.email, '@', 1)),
    nullif(users.raw_user_meta_data ->> 'middle_name', ''),
    coalesce(nullif(users.raw_user_meta_data ->> 'last_name', ''), nullif(regexp_replace(trim(coalesce(users.raw_user_meta_data ->> 'name', '')), '^.*\s', ''), ''), split_part(users.email, '@', 1))
  )),
  coalesce(nullif(users.raw_user_meta_data ->> 'first_name', ''), nullif(split_part(coalesce(users.raw_user_meta_data ->> 'name', ''), ' ', 1), ''), split_part(users.email, '@', 1)),
  nullif(users.raw_user_meta_data ->> 'middle_name', ''),
  coalesce(nullif(users.raw_user_meta_data ->> 'last_name', ''), nullif(regexp_replace(trim(coalesce(users.raw_user_meta_data ->> 'name', '')), '^.*\s', ''), ''), split_part(users.email, '@', 1)),
  users.raw_user_meta_data ->> 'phone',
  coalesce(users.raw_user_meta_data ->> 'role', 'tenant')::public.user_role
from auth.users users
where not exists (
  select 1 from public.profiles profiles where profiles.id = users.id
);
