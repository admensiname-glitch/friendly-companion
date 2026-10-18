-- Keep the internal rebuild token out of URLs, proxy logs, and query-string telemetry.
-- The Edge Function checks the x-rebuild-token header and deliberately ignores query tokens.
create or replace function private.run_pedagogia_rebuild_batch(p_limit integer default 1)
returns bigint
language plpgsql
security definer
set search_path = public, private, extensions, net, pg_temp
as $$
declare
  v_token text;
begin
  select token
    into v_token
    from public.internal_content_rebuild_auth
   where id = 1;

  if v_token is null or btrim(v_token) = '' then
    raise exception 'Internal content rebuild token is not configured';
  end if;

  return net.http_post(
    url := 'https://gcnbekkfulppfbsrgksd.supabase.co/functions/v1/rebuild-pedagogia-materials-v4',
    body := jsonb_build_object('limit', greatest(1, least(coalesce(p_limit, 1), 2))),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-rebuild-token', v_token
    ),
    timeout_milliseconds := 120000
  );
end;
$$;

create or replace function private.run_pedagogia_rebuild_topic(p_topic_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, private, extensions, net, pg_temp
as $$
declare
  v_token text;
begin
  if p_topic_id is null then
    raise exception 'Topic id is required';
  end if;

  select token
    into v_token
    from public.internal_content_rebuild_auth
   where id = 1;

  if v_token is null or btrim(v_token) = '' then
    raise exception 'Internal content rebuild token is not configured';
  end if;

  return net.http_post(
    url := 'https://gcnbekkfulppfbsrgksd.supabase.co/functions/v1/rebuild-pedagogia-materials-v4',
    body := jsonb_build_object(
      'topic_ids', jsonb_build_array(p_topic_id::text),
      'limit', 1
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-rebuild-token', v_token
    ),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function private.run_pedagogia_rebuild_batch(integer) from public, anon, authenticated;
grant execute on function private.run_pedagogia_rebuild_batch(integer) to postgres, service_role;
revoke all on function private.run_pedagogia_rebuild_topic(uuid) from public, anon, authenticated;
grant execute on function private.run_pedagogia_rebuild_topic(uuid) to postgres, service_role;
