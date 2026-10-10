-- Serialize the first-admin bootstrap so concurrent requests cannot both observe zero admins.
create or replace function public.bootstrap_admin_once(_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if _user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('ensina-me-bootstrap-admin-once')::bigint);

  if exists (
    select 1
    from public.user_roles
    where role = 'admin'
  ) then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (_user_id, 'admin');

  return true;
end;
$function$;

revoke all on function public.bootstrap_admin_once(uuid) from public;
revoke all on function public.bootstrap_admin_once(uuid) from anon;
revoke all on function public.bootstrap_admin_once(uuid) from authenticated;
grant execute on function public.bootstrap_admin_once(uuid) to service_role;
