-- Older owner policies only checked landlord_id. The stricter
-- properties_owner_* policies also keep created_by aligned, so remove the
-- stale duplicates to avoid permissive RLS overlap.

drop policy if exists "properties_landlord_select" on public.properties;
drop policy if exists "properties_landlord_insert" on public.properties;
drop policy if exists "properties_landlord_update" on public.properties;
drop policy if exists "properties_landlord_delete" on public.properties;
