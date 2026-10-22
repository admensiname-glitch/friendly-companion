-- Security/performance hardening for existing Direct and Community access paths.
-- Applied to production on 2026-10-21 and verified by querying pg_indexes and pg_policies.
begin;

create index if not exists idx_direct_blocks_blocked_id
  on public.direct_blocks (blocked_id);
create index if not exists idx_direct_conversation_members_user_id
  on public.direct_conversation_members (user_id);
create index if not exists idx_direct_group_notification_preferences_conversation_id
  on public.direct_group_notification_preferences (conversation_id);
create index if not exists idx_direct_message_hides_message_id
  on public.direct_message_hides (message_id);
create index if not exists idx_direct_request_permissions_requester_id
  on public.direct_request_permissions (requester_id);

drop policy if exists community_comments_delete_own on public.community_comments;
drop policy if exists community_comments_delete_author_or_post_owner on public.community_comments;

create policy community_comments_delete_author_or_post_owner
on public.community_comments
for delete to authenticated
using (
  author_id = (select auth.uid())
  or exists (
    select 1
    from public.community_posts p
    where p.id = community_comments.post_id
      and p.author_id = (select auth.uid())
  )
);

commit;
