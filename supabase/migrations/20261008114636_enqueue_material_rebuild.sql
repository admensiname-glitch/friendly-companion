create or replace function private.enqueue_material_rebuild(_topic_ids uuid[])
returns bigint
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_token text;
  v_request_id bigint;
begin
  select token into v_token from public.internal_content_rebuild_auth where id=1;
  if v_token is null then raise exception 'rebuild token not configured'; end if;
  select net.http_post(
    url := 'https://gcnbekkfulppfbsrgksd.supabase.co/functions/v1/rebuild-pedagogia-materials-v4',
    headers := jsonb_build_object('Content-Type','application/json','x-rebuild-token',v_token),
    body := jsonb_build_object('topic_ids',to_jsonb(_topic_ids),'limit',least(greatest(coalesce(array_length(_topic_ids,1),1),1),2),'force',true)
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function private.enqueue_material_rebuild(uuid[]) from public;
