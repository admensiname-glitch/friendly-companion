-- Applied remotely as 20261002181348_harden_internal_rebuild_auth_policy_v1.
-- Anonymous and authenticated clients must never access this internal table.

drop policy if exists "internal_content_rebuild_auth_no_direct_access"
  on public.internal_content_rebuild_auth;

create policy "internal_content_rebuild_auth_no_direct_access"
on public.internal_content_rebuild_auth
for all
to anon, authenticated
using (false)
with check (false);