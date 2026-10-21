-- Let a student remove their own comment, or let the owner of a post
-- remove comments attached to that post. Row-level security remains the authority.
create policy "community_comments_delete_author_or_post_owner"
on public.community_comments
for delete
to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1
    from public.community_posts as post
    where post.id = community_comments.post_id
      and post.author_id = auth.uid()
  )
);
