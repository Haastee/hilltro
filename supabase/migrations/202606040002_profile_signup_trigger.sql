create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'tenant')::public.user_role
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    phone = excluded.phone,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (id, email, name, phone, role)
select
  users.id,
  lower(users.email),
  coalesce(users.raw_user_meta_data ->> 'name', split_part(users.email, '@', 1)),
  users.raw_user_meta_data ->> 'phone',
  coalesce(users.raw_user_meta_data ->> 'role', 'tenant')::public.user_role
from auth.users users
where not exists (
  select 1 from public.profiles profiles where profiles.id = users.id
);
