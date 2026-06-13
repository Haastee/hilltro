-- Service-role-only setter so an Edge Function can store the Didit webhook
-- signing secret into Vault without the value ever passing through application
-- logs or the client. Mirrors get_didit_config(): server-side use only.

create or replace function public.set_didit_webhook_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare existing uuid;
begin
  select id into existing from vault.secrets where name = 'DIDIT_WEBHOOK_SECRET';
  if existing is null then
    perform vault.create_secret(p_secret, 'DIDIT_WEBHOOK_SECRET', 'Didit webhook signing secret');
  else
    perform vault.update_secret(existing, p_secret);
  end if;
end;
$$;

revoke execute on function public.set_didit_webhook_secret(text) from public, anon, authenticated;
grant execute on function public.set_didit_webhook_secret(text) to service_role;
