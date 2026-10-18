create schema if not exists private;

create or replace function private.run_pedagogia_rebuild_batch(p_limit integer default 1)
returns bigint
language sql
security definer
set search_path = public, private, extensions, net
as $$
  select net.http_post(
    url := 'https://gcnbekkfulppfbsrgksd.supabase.co/functions/v1/rebuild-pedagogia-materials-v4?token=' || (select token from public.internal_content_rebuild_auth where id=1),
    body := jsonb_build_object('limit', greatest(1, least(p_limit, 2))),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 120000
  );
$$;

revoke all on function private.run_pedagogia_rebuild_batch(integer) from public, anon, authenticated;
grant execute on function private.run_pedagogia_rebuild_batch(integer) to postgres, service_role;
