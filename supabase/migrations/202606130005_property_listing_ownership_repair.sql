-- Repair property ownership consistency for listings created before
-- created_by was consistently stamped, and keep owner RLS aligned with both
-- ownership columns.

update public.properties
set created_by = landlord_id
where created_by is null
  and landlord_id is not null;

drop policy if exists "properties_owner_select" on public.properties;
drop policy if exists "properties_owner_insert" on public.properties;
drop policy if exists "properties_owner_update" on public.properties;
drop policy if exists "properties_owner_delete" on public.properties;

create policy "properties_owner_select"
on public.properties
for select
to authenticated
using (
  landlord_id = (select auth.uid())
  or created_by = (select auth.uid())
);

create policy "properties_owner_insert"
on public.properties
for insert
to authenticated
with check (
  landlord_id = (select auth.uid())
  and (created_by is null or created_by = (select auth.uid()))
);

create policy "properties_owner_update"
on public.properties
for update
to authenticated
using (
  landlord_id = (select auth.uid())
  or created_by = (select auth.uid())
)
with check (
  landlord_id = (select auth.uid())
  and (created_by is null or created_by = (select auth.uid()))
);

create policy "properties_owner_delete"
on public.properties
for delete
to authenticated
using (
  landlord_id = (select auth.uid())
  or created_by = (select auth.uid())
);
