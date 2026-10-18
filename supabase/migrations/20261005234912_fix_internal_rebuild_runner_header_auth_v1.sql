
create or replace function private.run_pedagogia_rebuild_batch(p_limit integer default 1)
returns bigint
language sql
security definer
set search_path to 'public','private','extensions','net'
as $function$
  select net.http_post(
    url := 'https://gcnbekkfulppfbsrgksd.supabase.co/functions/v1/rebuild-pedagogia-materials-v4',
    body := jsonb_build_object('limit', greatest(1, least(p_limit, 2))),
    headers := jsonb_build_object('Content-Type','application/json','x-rebuild-token',(select token from public.internal_content_rebuild_auth where id=1)),
    timeout_milliseconds := 120000
  );
$function$;