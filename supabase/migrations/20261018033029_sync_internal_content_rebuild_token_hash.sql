do $migration$
begin
  if not exists (
    select 1
    from public.internal_content_rebuild_auth
    where id = 1
      and token is not null
      and btrim(token) <> ''
  ) then
    raise exception 'Internal rebuild token is missing; refusing to update its hash';
  end if;

  update public.internal_content_rebuild_auth
     set token_hash = encode(digest(token, 'sha256'), 'hex')
   where id = 1;
end
$migration$;
