-- Unique friend codes for Direct discovery.
-- Codes identify a profile only; they do not bypass request acceptance or block rules.

create table if not exists public.student_friend_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  friend_code text not null unique,
  created_at timestamptz not null default now(),
  constraint student_friend_codes_format check (friend_code ~ '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$')
);

alter table public.student_friend_codes enable row level security;
revoke all on public.student_friend_codes from public, anon, authenticated;
grant select on public.student_friend_codes to authenticated;
create policy student_friend_codes_select_own
  on public.student_friend_codes for select to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.direct_friend_code_lookup_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists direct_friend_code_lookup_attempts_user_time_idx
  on public.direct_friend_code_lookup_attempts(user_id, attempted_at desc);
alter table public.direct_friend_code_lookup_attempts enable row level security;
revoke all on public.direct_friend_code_lookup_attempts from public, anon, authenticated;

create or replace function direct_private.ensure_friend_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if p_user_id is null then
    raise exception 'User required';
  end if;

  select c.friend_code into v_code
  from public.student_friend_codes c
  where c.user_id = p_user_id;
  if v_code is not null then
    return v_code;
  end if;

  loop
    v_code :=
      chr(65 + floor(random() * 26)::integer) ||
      (floor(random() * 10)::integer)::text ||
      chr(65 + floor(random() * 26)::integer) ||
      (floor(random() * 10)::integer)::text ||
      chr(65 + floor(random() * 26)::integer) ||
      (floor(random() * 10)::integer)::text;
    begin
      insert into public.student_friend_codes(user_id, friend_code)
      values (p_user_id, v_code)
      on conflict (user_id) do nothing;
    exception when unique_violation then
      -- A different user already owns this code; generate another.
      v_code := null;
    end;

    select c.friend_code into v_code
    from public.student_friend_codes c
    where c.user_id = p_user_id;
    if v_code is not null then
      return v_code;
    end if;
  end loop;
end;
$$;
revoke all on function direct_private.ensure_friend_code(uuid) from public, anon, authenticated;

create or replace function direct_private.create_profile_friend_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform direct_private.ensure_friend_code(new.user_id);
  return new;
end;
$$;
revoke all on function direct_private.create_profile_friend_code() from public, anon, authenticated;

drop trigger if exists student_profiles_create_friend_code on public.student_profiles;
create trigger student_profiles_create_friend_code
  after insert on public.student_profiles
  for each row execute function direct_private.create_profile_friend_code();

-- Backfill existing profiles without changing profile data.
do $$
declare
  v_user_id uuid;
begin
  for v_user_id in select p.user_id from public.student_profiles p loop
    perform direct_private.ensure_friend_code(v_user_id);
  end loop;
end;
$$;

create or replace function public.direct_my_friend_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.student_profiles p where p.user_id = auth.uid()
  ) then
    raise exception 'Student profile unavailable';
  end if;
  return direct_private.ensure_friend_code(auth.uid());
end;
$$;
revoke all on function public.direct_my_friend_code() from public, anon;
grant execute on function public.direct_my_friend_code() to authenticated;

create or replace function public.direct_find_by_friend_code(friend_code_input text)
returns table(user_id uuid, display_name text, avatar_url text, allow_requests boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(trim(coalesce(friend_code_input, '')));
  v_attempts integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if v_code !~ '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$' then
    return;
  end if;

  delete from public.direct_friend_code_lookup_attempts
  where user_id = v_user_id and attempted_at < now() - interval '15 minutes';
  select count(*) into v_attempts
  from public.direct_friend_code_lookup_attempts
  where user_id = v_user_id and attempted_at >= now() - interval '15 minutes';
  if v_attempts >= 20 then
    raise exception 'Rate limit exceeded';
  end if;
  insert into public.direct_friend_code_lookup_attempts(user_id) values (v_user_id);

  return query
  select p.user_id,
         coalesce(nullif(trim(p.display_name), ''), 'Estudante') as display_name,
         p.avatar_url,
         coalesce(s.allow_requests, true) as allow_requests
  from public.student_friend_codes c
  join public.student_profiles p on p.user_id = c.user_id
  left join public.direct_settings s on s.user_id = p.user_id
  where c.friend_code = v_code
    and p.user_id <> v_user_id
    and coalesce(s.allow_requests, true)
    and not exists (
      select 1 from public.direct_blocks b
      where (b.blocker_id = v_user_id and b.blocked_id = p.user_id)
         or (b.blocker_id = p.user_id and b.blocked_id = v_user_id)
    )
  limit 1;
end;
$$;
revoke all on function public.direct_find_by_friend_code(text) from public, anon;
grant execute on function public.direct_find_by_friend_code(text) to authenticated;
