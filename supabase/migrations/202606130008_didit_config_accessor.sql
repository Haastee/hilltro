-- Service-role-only accessor so Edge Functions can read the Didit secrets that
-- live in Supabase Vault (the `vault` schema is not exposed over PostgREST).
-- Returns ONLY the three Didit values — never arbitrary vault entries — and is
-- executable solely by the service_role (server-side; never anon/authenticated).

create or replace function public.get_didit_config()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'api_key',        (select decrypted_secret from vault.decrypted_secrets where name = 'DIDIT_API_KEY'),
    'workflow_id',    (select decrypted_secret from vault.decrypted_secrets where name = 'DIDIT_WORKFLOW_ID'),
    'webhook_secret', (select decrypted_secret from vault.decrypted_secrets where name = 'DIDIT_WEBHOOK_SECRET')
  );
$$;

revoke execute on function public.get_didit_config() from public, anon, authenticated;
grant execute on function public.get_didit_config() to service_role;
