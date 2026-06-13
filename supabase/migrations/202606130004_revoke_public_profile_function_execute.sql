revoke execute on function public.disclosed_name(uuid) from public;
revoke execute on function public.get_counterparty_profile(uuid) from public;
revoke execute on function public.get_property_full_address(uuid) from public;

grant execute on function public.disclosed_name(uuid) to authenticated;
grant execute on function public.get_counterparty_profile(uuid) to authenticated;
grant execute on function public.get_property_full_address(uuid) to authenticated;
