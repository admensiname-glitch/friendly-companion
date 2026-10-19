
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  image_path text,
  image_url text,
  course_id uuid references public.courses(id) on delete set null,
  discipline_id uuid references public.disciplines(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx on public.community_posts(created_at desc);
create index if not exists community_posts_author_id_idx on public.community_posts(author_id);
create index if not exists community_posts_topic_id_idx on public.community_posts(topic_id);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists community_comments_post_id_idx on public.community_comments(post_id, created_at asc);

create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_saves (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_saves enable row level security;
alter table public.community_follows enable row level security;

drop policy if exists community_posts_select_authenticated on public.community_posts;
create policy community_posts_select_authenticated on public.community_posts for select to authenticated using (true);

drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own on public.community_posts for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own on public.community_posts for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists community_posts_delete_own on public.community_posts;
create policy community_posts_delete_own on public.community_posts for delete to authenticated using (auth.uid() = author_id);

drop policy if exists community_comments_select_authenticated on public.community_comments;
create policy community_comments_select_authenticated on public.community_comments for select to authenticated using (true);

drop policy if exists community_comments_insert_own on public.community_comments;
create policy community_comments_insert_own on public.community_comments for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists community_comments_update_own on public.community_comments;
create policy community_comments_update_own on public.community_comments for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists community_comments_delete_own on public.community_comments;
create policy community_comments_delete_own on public.community_comments for delete to authenticated using (auth.uid() = author_id);

drop policy if exists community_likes_select_authenticated on public.community_likes;
create policy community_likes_select_authenticated on public.community_likes for select to authenticated using (true);

drop policy if exists community_likes_insert_own on public.community_likes;
create policy community_likes_insert_own on public.community_likes for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists community_likes_delete_own on public.community_likes;
create policy community_likes_delete_own on public.community_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists community_saves_select_authenticated on public.community_saves;
create policy community_saves_select_authenticated on public.community_saves for select to authenticated using (true);

drop policy if exists community_saves_insert_own on public.community_saves;
create policy community_saves_insert_own on public.community_saves for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists community_saves_delete_own on public.community_saves;
create policy community_saves_delete_own on public.community_saves for delete to authenticated using (auth.uid() = user_id);

drop policy if exists community_follows_select_authenticated on public.community_follows;
create policy community_follows_select_authenticated on public.community_follows for select to authenticated using (true);

drop policy if exists community_follows_insert_own on public.community_follows;
create policy community_follows_insert_own on public.community_follows for insert to authenticated with check (auth.uid() = follower_id);

drop policy if exists community_follows_delete_own on public.community_follows;
create policy community_follows_delete_own on public.community_follows for delete to authenticated using (auth.uid() = follower_id);

insert into storage.buckets (id, name, public)
values ('community-media','community-media',true)
on conflict (id) do update set public = true;

drop policy if exists community_media_select on storage.objects;
create policy community_media_select on storage.objects for select to public using (bucket_id = 'community-media');

drop policy if exists community_media_insert on storage.objects;
create policy community_media_insert on storage.objects for insert to authenticated with check (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists community_media_update on storage.objects;
create policy community_media_update on storage.objects for update to authenticated using (bucket_id = 'community-media' and owner_id = auth.uid()::text);

drop policy if exists community_media_delete on storage.objects;
create policy community_media_delete on storage.objects for delete to authenticated using (bucket_id = 'community-media' and owner_id = auth.uid()::text);
