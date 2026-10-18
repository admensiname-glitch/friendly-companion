create or replace function private.run_pedagogia_rebuild_topic(p_topic_id uuid)
returns bigint
language sql
security definer
set search_path = public, private, extensions, net
as $$
  select net.http_post(
    url := 'https://gcnbekkfulppfbsrgksd.supabase.co/functions/v1/rebuild-pedagogia-materials-v4?token=' || (select token from public.internal_content_rebuild_auth where id=1),
    body := jsonb_build_object('topic_ids', jsonb_build_array(p_topic_id::text),'limit',1),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 120000
  );
$$;
revoke all on function private.run_pedagogia_rebuild_topic(uuid) from public, anon, authenticated;
grant execute on function private.run_pedagogia_rebuild_topic(uuid) to postgres, service_role;
