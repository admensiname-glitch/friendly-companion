-- Ensina-me: identidade oficial do proprietário na Comunidade
-- Conta oficial: ADM.ensiname@gmail.com / Gabriel

insert into public.user_roles (user_id, role)
select 'bcebd090-39ae-4b5f-a641-3b0ac648c1d9'::uuid, 'admin'
where not exists (
  select 1 from public.user_roles
  where user_id='bcebd090-39ae-4b5f-a641-3b0ac648c1d9'::uuid and role='admin'
);

update public.student_profiles
set display_name='Gabriel', updated_at=now()
where user_id='bcebd090-39ae-4b5f-a641-3b0ac648c1d9'::uuid;

alter table public.community_posts
  add column if not exists is_official boolean not null default false,
  add column if not exists official_until timestamptz,
  add column if not exists author_display_name text,
  add column if not exists author_avatar_url text,
  add column if not exists author_is_verified boolean not null default false;

create table if not exists public.system_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.system_owners enable row level security;

drop policy if exists "Authenticated users can read system owners" on public.system_owners;
create policy "Authenticated users can read system owners"
on public.system_owners for select to authenticated using (true);

insert into public.system_owners(user_id)
values ('bcebd090-39ae-4b5f-a641-3b0ac648c1d9'::uuid)
on conflict (user_id) do nothing;

create or replace function public.apply_community_owner_identity()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  owner_record boolean;
  owner_name text;
  owner_avatar text;
begin
  select exists(
    select 1 from public.system_owners where user_id = new.author_id
  ) into owner_record;

  select display_name, avatar_url
    into owner_name, owner_avatar
  from public.student_profiles
  where user_id = new.author_id;

  new.author_display_name := coalesce(nullif(trim(owner_name), ''), 'Estudante Ensina-me');
  new.author_avatar_url := owner_avatar;
  new.author_is_verified := owner_record;
  new.is_official := owner_record;

  if owner_record then
    new.official_until := coalesce(new.official_until, now() + interval '24 hours');
  else
    new.official_until := null;
  end if;

  return new;
end;
$$;

drop trigger if exists community_posts_owner_identity on public.community_posts;
create trigger community_posts_owner_identity
before insert or update of author_id,body,image_url,image_path,course_id,discipline_id,topic_id
on public.community_posts
for each row execute function public.apply_community_owner_identity();

update public.community_posts p
set
  author_display_name='Gabriel',
  author_avatar_url=(select avatar_url from public.student_profiles sp where sp.user_id=p.author_id),
  author_is_verified=true,
  is_official=true,
  official_until=coalesce(p.official_until, p.created_at + interval '24 hours')
where p.author_id='bcebd090-39ae-4b5f-a641-3b0ac648c1d9'::uuid;

create index if not exists community_posts_official_until_idx
on public.community_posts(is_official, official_until desc, created_at desc);
