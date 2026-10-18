alter table public.student_profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text;

alter table public.community_posts
  drop constraint if exists community_posts_body_check;
alter table public.community_posts
  add constraint community_posts_body_check check (char_length(trim(body)) between 0 and 2000);

drop policy if exists community_posts_delete_own on public.community_posts;
create policy community_posts_delete_own on public.community_posts
for delete to authenticated using (auth.uid() = author_id);

insert into storage.buckets (id,name,public)
values ('profile-media','profile-media',true)
on conflict (id) do update set public=true;

drop policy if exists profile_media_select on storage.objects;
create policy profile_media_select on storage.objects for select to public
using (bucket_id='profile-media');

drop policy if exists profile_media_insert on storage.objects;
create policy profile_media_insert on storage.objects for insert to authenticated
with check (bucket_id='profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists profile_media_update on storage.objects;
create policy profile_media_update on storage.objects for update to authenticated
using (bucket_id='profile-media' and owner_id=auth.uid()::text);

drop policy if exists profile_media_delete on storage.objects;
create policy profile_media_delete on storage.objects for delete to authenticated
using (bucket_id='profile-media' and owner_id=auth.uid()::text);
