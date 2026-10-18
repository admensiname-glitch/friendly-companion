-- The production token is intentionally not stored in source control.
-- Provision it in Supabase Vault as "internal_content_rebuild_token" before replaying this migration.
alter table public.internal_content_rebuild_auth
  add column if not exists token text;

do $migration$
declare
  v_token text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'Provision internal_content_rebuild_token in Supabase Vault before applying this migration';
  end if;

  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into v_token
    using 'internal_content_rebuild_token';

  if v_token is null or btrim(v_token) = '' then
    raise exception 'Provision a non-empty internal_content_rebuild_token in Supabase Vault before applying this migration';
  end if;

  update public.internal_content_rebuild_auth
     set token = v_token
   where id = 1;

  if not found then
    raise exception 'Expected internal_content_rebuild_auth row id=1 before setting its token';
  end if;
end
$migration$;
