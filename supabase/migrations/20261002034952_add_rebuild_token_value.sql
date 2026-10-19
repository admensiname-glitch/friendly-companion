-- A fresh environment gets its own unpredictable token. Production's already-applied
-- migration is not replayed there, and no production token is stored in source control.
alter table public.internal_content_rebuild_auth
  add column if not exists token text;

do $migration$
declare
  v_token text;
begin
  -- Use a branch-specific Vault secret when one is configured; otherwise create an
  -- environment-local random token so clean replay does not depend on production secrets.
  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
      into v_token
      using 'internal_content_rebuild_token';
  end if;

  if v_token is null or btrim(v_token) = '' then
    v_token := encode(gen_random_bytes(32), 'hex');
  end if;

  update public.internal_content_rebuild_auth
     set token = v_token,
         token_hash = encode(digest(v_token, 'sha256'), 'hex')
   where id = 1;

  if not found then
    raise exception 'Expected internal_content_rebuild_auth row id=1 before setting its token';
  end if;
end
$migration$;
