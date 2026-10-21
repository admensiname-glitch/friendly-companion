-- Direct MVP foundation: requests, conversations, messages, privacy settings and anonymous suggestions.
create extension if not exists pgcrypto;
create schema if not exists direct_private;
revoke all on schema direct_private from public, anon;
grant usage on schema direct_private to authenticated;

create table if not exists public.direct_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allow_requests boolean not null default true,
  show_online_status boolean not null default true,
  show_last_seen boolean not null default true,
  read_receipts boolean not null default true,
  auto_play_voice boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.direct_settings enable row level security;
create policy "direct_settings_select_own" on public.direct_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "direct_settings_insert_own" on public.direct_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "direct_settings_update_own" on public.direct_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.direct_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.direct_blocks enable row level security;
create policy "direct_blocks_manage_own" on public.direct_blocks for all to authenticated using ((select auth.uid()) = blocker_id) with check ((select auth.uid()) = blocker_id);

create table if not exists public.direct_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  conversation_id uuid,
  check (sender_id <> recipient_id)
);
create index if not exists direct_requests_recipient_status_idx on public.direct_requests(recipient_id, status, created_at desc);
create index if not exists direct_requests_sender_status_idx on public.direct_requests(sender_id, status, created_at desc);
alter table public.direct_requests enable row level security;
create policy "direct_requests_read_participant" on public.direct_requests for select to authenticated using ((select auth.uid()) in (sender_id, recipient_id));
create policy "direct_requests_sender_insert" on public.direct_requests for insert to authenticated with check (
  (select auth.uid()) = sender_id and status = 'pending'
  and not exists (select 1 from public.direct_blocks b where (b.blocker_id = sender_id and b.blocked_id = recipient_id) or (b.blocker_id = recipient_id and b.blocked_id = sender_id))
);
create policy "direct_requests_sender_cancel" on public.direct_requests for update to authenticated using ((select auth.uid()) = sender_id and status = 'pending') with check ((select auth.uid()) = sender_id and status = 'cancelled');

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'individual' check (kind in ('individual','group')),
  title text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  pinned_at timestamptz,
  last_message_at timestamptz not null default now()
);
create table if not exists public.direct_conversation_members (
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  archived_at timestamptz,
  pinned_at timestamptz,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
alter table public.direct_conversations enable row level security;
alter table public.direct_conversation_members enable row level security;

create or replace function direct_private.is_member(p_conversation_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.direct_conversation_members m where m.conversation_id = p_conversation_id and m.user_id = p_user_id);
$$;
revoke all on function direct_private.is_member(uuid, uuid) from public, anon;
grant execute on function direct_private.is_member(uuid, uuid) to authenticated;

create policy "direct_conversations_member_read" on public.direct_conversations for select to authenticated using (direct_private.is_member(id));
create policy "direct_conversation_members_self_or_peer_read" on public.direct_conversation_members for select to authenticated using (direct_private.is_member(conversation_id));
create policy "direct_members_self_update" on public.direct_conversation_members for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text','voice','system')),
  body text,
  media_path text,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_for_everyone_at timestamptz,
  delivered_at timestamptz,
  check ((message_type = 'text' and body is not null and length(trim(body)) between 1 and 5000) or (message_type = 'voice' and media_path is not null) or message_type = 'system')
);
create index if not exists direct_messages_conversation_created_idx on public.direct_messages(conversation_id, created_at desc);
alter table public.direct_messages enable row level security;
create policy "direct_messages_member_read" on public.direct_messages for select to authenticated using (direct_private.is_member(conversation_id));
create policy "direct_messages_member_send" on public.direct_messages for insert to authenticated with check ((select auth.uid()) = sender_id and direct_private.is_member(conversation_id) and not exists (
  select 1 from public.direct_conversation_members other
  join public.direct_blocks b on (b.blocker_id = (select auth.uid()) and b.blocked_id = other.user_id) or (b.blocker_id = other.user_id and b.blocked_id = (select auth.uid()))
  where other.conversation_id = direct_messages.conversation_id and other.user_id <> (select auth.uid())
));
create policy "direct_messages_sender_edit" on public.direct_messages for update to authenticated using ((select auth.uid()) = sender_id and created_at > now() - interval '15 minutes') with check ((select auth.uid()) = sender_id);

create table if not exists public.direct_group_notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);
alter table public.direct_group_notification_preferences enable row level security;
create policy "direct_group_notifications_manage_own" on public.direct_group_notification_preferences for all to authenticated using ((select auth.uid()) = user_id and direct_private.is_member(conversation_id)) with check ((select auth.uid()) = user_id and direct_private.is_member(conversation_id));

create table if not exists public.direct_voice_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  storage_path text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  sync_status text not null default 'pending' check (sync_status in ('pending','synced','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.direct_voice_drafts enable row level security;
create policy "direct_voice_drafts_own" on public.direct_voice_drafts for all to authenticated using ((select auth.uid()) = user_id and direct_private.is_member(conversation_id)) with check ((select auth.uid()) = user_id and direct_private.is_member(conversation_id));

create table if not exists public.direct_anonymous_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggestion_text text not null check (length(trim(suggestion_text)) between 1 and 3000),
  created_at timestamptz not null default now()
);
alter table public.direct_anonymous_suggestions enable row level security;
revoke all on public.direct_anonymous_suggestions from anon, authenticated;
grant insert on public.direct_anonymous_suggestions to authenticated;
create policy "direct_suggestion_insert_only" on public.direct_anonymous_suggestions for insert to authenticated with check (length(trim(suggestion_text)) between 1 and 3000);

create or replace function public.direct_find_people(search_text text)
returns table(user_id uuid, display_name text, avatar_url text, allow_requests boolean)
language sql stable security definer set search_path = '' as $$
  select p.user_id, coalesce(nullif(trim(p.display_name), ''), 'Estudante') as display_name,
         p.avatar_url, coalesce(s.allow_requests, true) as allow_requests
  from public.student_profiles p
  left join public.direct_settings s on s.user_id = p.user_id
  where auth.uid() is not null and p.user_id <> auth.uid()
    and length(trim(coalesce(search_text,''))) >= 2
    and coalesce(nullif(trim(p.display_name), ''), '') ilike '%' || left(trim(search_text), 80) || '%'
    and coalesce(s.allow_requests, true)
  order by p.display_name limit 20;
$$;
revoke all on function public.direct_find_people(text) from public, anon;
grant execute on function public.direct_find_people(text) to authenticated;

create or replace function public.direct_send_request(recipient_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_request uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if recipient_user_id is null or recipient_user_id = auth.uid() then raise exception 'Invalid recipient'; end if;
  if not exists(select 1 from public.student_profiles p where p.user_id = recipient_user_id)
     or not coalesce((select s.allow_requests from public.direct_settings s where s.user_id = recipient_user_id), true) then
    raise exception 'Recipient unavailable';
  end if;
  if exists(select 1 from public.direct_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = recipient_user_id) or (b.blocker_id = recipient_user_id and b.blocked_id = auth.uid())) then
    raise exception 'Recipient unavailable';
  end if;
  if exists(select 1 from public.direct_requests r where r.sender_id = auth.uid() and r.recipient_id = recipient_user_id and r.status = 'declined') then
    raise exception 'Recipient has declined a previous request';
  end if;
  if exists(select 1 from public.direct_requests r where r.sender_id = auth.uid() and r.recipient_id = recipient_user_id and r.status = 'pending') then
    raise exception 'Request already pending';
  end if;
  insert into public.direct_requests(sender_id, recipient_id) values (auth.uid(), recipient_user_id) returning id into new_request;
  return new_request;
end;
$$;
revoke all on function public.direct_send_request(uuid) from public, anon;
grant execute on function public.direct_send_request(uuid) to authenticated;

create or replace function public.direct_decline_request(request_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.direct_requests set status = 'declined', updated_at = now()
    where id = request_id and recipient_id = auth.uid() and status = 'pending';
  return found;
end;
$$;
revoke all on function public.direct_decline_request(uuid) from public, anon;
grant execute on function public.direct_decline_request(uuid) to authenticated;

create or replace function public.direct_accept_request(request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare req public.direct_requests%rowtype; new_conversation uuid; existing_conversation uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into req from public.direct_requests where id = request_id for update;
  if not found or req.recipient_id <> auth.uid() or req.status <> 'pending' then
    raise exception 'Request unavailable';
  end if;
  if exists(select 1 from public.direct_blocks b where (b.blocker_id = req.sender_id and b.blocked_id = req.recipient_id) or (b.blocker_id = req.recipient_id and b.blocked_id = req.sender_id)) then
    update public.direct_requests set status = 'unavailable', updated_at = now() where id = request_id;
    raise exception 'Request unavailable';
  end if;
  select c.id into existing_conversation
  from public.direct_conversations c
  join public.direct_conversation_members a on a.conversation_id = c.id and a.user_id = req.sender_id
  join public.direct_conversation_members b on b.conversation_id = c.id and b.user_id = req.recipient_id
  where c.kind = 'individual' limit 1;
  if existing_conversation is not null then new_conversation := existing_conversation;
  else
    insert into public.direct_conversations(kind, created_by) values ('individual', auth.uid()) returning id into new_conversation;
    insert into public.direct_conversation_members(conversation_id, user_id, role) values
      (new_conversation, req.sender_id, 'member'), (new_conversation, req.recipient_id, 'member');
  end if;
  update public.direct_requests set status = 'accepted', conversation_id = new_conversation, updated_at = now() where id = request_id;
  return new_conversation;
end;
$$;
revoke all on function public.direct_accept_request(uuid) from public, anon;
grant execute on function public.direct_accept_request(uuid) to authenticated;

create or replace function public.direct_create_group(group_title text, member_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_conversation uuid; member_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(group_title,''))) not between 2 and 80 then raise exception 'Invalid group title'; end if;
  if coalesce(array_length(member_ids,1),0) < 1 or array_length(member_ids,1) > 49 then raise exception 'Invalid group members'; end if;
  if exists(select 1 from unnest(member_ids) x where x is null or x = auth.uid()) then raise exception 'Invalid group members'; end if;
  if exists(select 1 from unnest(member_ids) x where exists(select 1 from public.direct_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = x) or (b.blocker_id = x and b.blocked_id = auth.uid()))) then raise exception 'A selected member is blocked'; end if;
  insert into public.direct_conversations(kind, title, created_by) values ('group', trim(group_title), auth.uid()) returning id into new_conversation;
  insert into public.direct_conversation_members(conversation_id, user_id, role) values (new_conversation, auth.uid(), 'owner');
  foreach member_id in array member_ids loop
    insert into public.direct_conversation_members(conversation_id, user_id, role) values (new_conversation, member_id, 'member');
  end loop;
  return new_conversation;
end;
$$;
revoke all on function public.direct_create_group(text, uuid[]) from public, anon;
grant execute on function public.direct_create_group(text, uuid[]) to authenticated;

grant select, insert, update on public.direct_settings to authenticated;
grant select, insert, update, delete on public.direct_blocks to authenticated;
grant select, insert, update on public.direct_requests to authenticated;
grant select on public.direct_conversations, public.direct_conversation_members to authenticated;
grant update on public.direct_conversation_members to authenticated;
grant select, insert, update on public.direct_messages to authenticated;
grant select, insert, update on public.direct_group_notification_preferences to authenticated;
grant select, insert, update, delete on public.direct_voice_drafts to authenticated;


-- Direct preview hardening: enforce unique pending requests and isolate member preferences.
create unique index if not exists direct_requests_one_pending_pair
  on public.direct_requests(sender_id, recipient_id) where status = 'pending';

alter table public.direct_conversation_members
  add column if not exists hidden_at timestamptz;

-- Never allow a client to self-add to another conversation or promote its role.
drop policy if exists "direct_members_self_update" on public.direct_conversation_members;
create policy "direct_members_self_update" on public.direct_conversation_members
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and direct_private.is_member(conversation_id)
  );

create table if not exists public.direct_request_permissions (
  recipient_id uuid not null references auth.users(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (recipient_id, requester_id),
  check (recipient_id <> requester_id)
);
alter table public.direct_request_permissions enable row level security;
drop policy if exists direct_request_permissions_select_own on public.direct_request_permissions;
create policy direct_request_permissions_select_own on public.direct_request_permissions
  for select to authenticated using ((select auth.uid()) = recipient_id);
revoke all on public.direct_request_permissions from public, anon, authenticated;
grant select on public.direct_request_permissions to authenticated;

create or replace function public.direct_set_request_permission(requester_user_id uuid, is_allowed boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or requester_user_id is null or requester_user_id = auth.uid() then
    raise exception 'Invalid requester';
  end if;
  insert into public.direct_request_permissions(recipient_id, requester_id, allowed, updated_at)
  values (auth.uid(), requester_user_id, is_allowed, now())
  on conflict (recipient_id, requester_id) do update
    set allowed = excluded.allowed, updated_at = now();
  return true;
end;
$$;
revoke all on function public.direct_set_request_permission(uuid, boolean) from public, anon;
grant execute on function public.direct_set_request_permission(uuid, boolean) to authenticated;

create or replace function public.direct_block_user(target_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or target_user_id is null or target_user_id = auth.uid() then
    raise exception 'Invalid user';
  end if;
  insert into public.direct_blocks(blocker_id, blocked_id)
  values (auth.uid(), target_user_id) on conflict do nothing;
  update public.direct_requests set status = 'unavailable', updated_at = now()
  where status = 'pending'
    and ((sender_id = auth.uid() and recipient_id = target_user_id)
      or (sender_id = target_user_id and recipient_id = auth.uid()));
  update public.direct_conversation_members m set hidden_at = now()
  from public.direct_conversations c
  where m.conversation_id = c.id and c.kind = 'individual'
    and m.user_id = auth.uid()
    and exists (select 1 from public.direct_conversation_members peer
      where peer.conversation_id = c.id and peer.user_id = target_user_id);
  return true;
end;
$$;
revoke all on function public.direct_block_user(uuid) from public, anon;
grant execute on function public.direct_block_user(uuid) to authenticated;

create or replace function public.direct_unblock_user(target_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or target_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.direct_blocks where blocker_id = auth.uid() and blocked_id = target_user_id;
  return found;
end;
$$;
revoke all on function public.direct_unblock_user(uuid) from public, anon;
grant execute on function public.direct_unblock_user(uuid) to authenticated;

create or replace function public.direct_update_member_preferences(
  target_conversation_id uuid,
  should_archive boolean default null,
  should_pin boolean default null,
  mark_read boolean default false
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not direct_private.is_member(target_conversation_id) then
    raise exception 'Conversation unavailable';
  end if;
  update public.direct_conversation_members
  set archived_at = case when should_archive is null then archived_at when should_archive then now() else null end,
      pinned_at = case when should_pin is null then pinned_at when should_pin then now() else null end,
      last_read_at = case when mark_read then now() else last_read_at end
  where conversation_id = target_conversation_id and user_id = auth.uid();
  return found;
end;
$$;
revoke all on function public.direct_update_member_preferences(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.direct_update_member_preferences(uuid, boolean, boolean, boolean) to authenticated;

-- Private audio storage; only conversation members may read and only a member may upload into their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('direct-voice', 'direct-voice', false, 52428800, array['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav'])
on conflict (id) do nothing;
drop policy if exists direct_voice_member_read on storage.objects;
create policy direct_voice_member_read on storage.objects for select to authenticated
using (bucket_id = 'direct-voice' and direct_private.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists direct_voice_member_upload on storage.objects;
create policy direct_voice_member_upload on storage.objects for insert to authenticated
with check (bucket_id = 'direct-voice'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and direct_private.is_member(((storage.foldername(name))[1])::uuid));


-- Honor per-person re-allow controls and keep the request decision atomic.
create or replace function public.direct_find_people(search_text text)
returns table(user_id uuid, display_name text, avatar_url text, allow_requests boolean)
language sql stable security definer set search_path = '' as $$
  select p.user_id, coalesce(nullif(trim(p.display_name), ''), 'Estudante') as display_name,
         p.avatar_url, true as allow_requests
  from public.student_profiles p
  left join public.direct_settings s on s.user_id = p.user_id
  left join public.direct_request_permissions rp on rp.recipient_id = p.user_id and rp.requester_id = auth.uid()
  where auth.uid() is not null and p.user_id <> auth.uid()
    and length(trim(coalesce(search_text,''))) >= 2
    and coalesce(nullif(trim(p.display_name), ''), '') ilike '%' || left(trim(search_text), 80) || '%'
    and coalesce(s.allow_requests, true)
    and coalesce(rp.allowed, true)
  order by p.display_name limit 20;
$$;
revoke all on function public.direct_find_people(text) from public, anon;
grant execute on function public.direct_find_people(text) to authenticated;

create or replace function public.direct_send_request(recipient_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_request uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if recipient_user_id is null or recipient_user_id = auth.uid() then raise exception 'Invalid recipient'; end if;
  if not exists(select 1 from public.student_profiles p where p.user_id = recipient_user_id)
     or not coalesce((select s.allow_requests from public.direct_settings s where s.user_id = recipient_user_id), true)
     or not coalesce((select rp.allowed from public.direct_request_permissions rp where rp.recipient_id = recipient_user_id and rp.requester_id = auth.uid()), true) then
    raise exception 'Recipient unavailable';
  end if;
  if exists(select 1 from public.direct_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = recipient_user_id) or (b.blocker_id = recipient_user_id and b.blocked_id = auth.uid())) then
    raise exception 'Recipient unavailable';
  end if;
  if exists(select 1 from public.direct_requests r where r.sender_id = auth.uid() and r.recipient_id = recipient_user_id and r.status = 'pending') then
    raise exception 'Request already pending';
  end if;
  insert into public.direct_requests(sender_id, recipient_id) values (auth.uid(), recipient_user_id) returning id into new_request;
  return new_request;
end;
$$;
revoke all on function public.direct_send_request(uuid) from public, anon;
grant execute on function public.direct_send_request(uuid) to authenticated;

create or replace function public.direct_decline_request(request_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare requester uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.direct_requests set status = 'declined', updated_at = now()
    where id = request_id and recipient_id = auth.uid() and status = 'pending'
    returning sender_id into requester;
  if requester is not null then
    insert into public.direct_request_permissions(recipient_id, requester_id, allowed)
    values (auth.uid(), requester, false)
    on conflict (recipient_id, requester_id) do update set allowed = false, updated_at = now();
    return true;
  end if;
  return false;
end;
$$;
revoke all on function public.direct_decline_request(uuid) from public, anon;
grant execute on function public.direct_decline_request(uuid) to authenticated;

create or replace function public.direct_accept_request(request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare req public.direct_requests%rowtype; new_conversation uuid; existing_conversation uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into req from public.direct_requests where id = request_id for update;
  if not found or req.recipient_id <> auth.uid() or req.status <> 'pending' then raise exception 'Request unavailable'; end if;
  if exists(select 1 from public.direct_blocks b where (b.blocker_id = req.sender_id and b.blocked_id = req.recipient_id) or (b.blocker_id = req.recipient_id and b.blocked_id = req.sender_id)) then
    update public.direct_requests set status = 'unavailable', updated_at = now() where id = request_id;
    return null;
  end if;
  select c.id into existing_conversation
  from public.direct_conversations c
  join public.direct_conversation_members a on a.conversation_id = c.id and a.user_id = req.sender_id
  join public.direct_conversation_members b on b.conversation_id = c.id and b.user_id = req.recipient_id
  where c.kind = 'individual' and not exists (
    select 1 from public.direct_blocks bl where (bl.blocker_id = req.sender_id and bl.blocked_id = req.recipient_id) or (bl.blocker_id = req.recipient_id and bl.blocked_id = req.sender_id)
  ) limit 1;
  if existing_conversation is not null then new_conversation := existing_conversation;
  else
    insert into public.direct_conversations(kind, created_by) values ('individual', auth.uid()) returning id into new_conversation;
    insert into public.direct_conversation_members(conversation_id, user_id, role) values
      (new_conversation, req.sender_id, 'member'), (new_conversation, req.recipient_id, 'member');
  end if;
  update public.direct_requests set status = 'accepted', conversation_id = new_conversation, updated_at = now() where id = request_id;
  return new_conversation;
end;
$$;
revoke all on function public.direct_accept_request(uuid) from public, anon;
grant execute on function public.direct_accept_request(uuid) to authenticated;


-- Membership rows are managed only by trusted RPCs, never by clients.
revoke update on public.direct_conversation_members from authenticated;

-- Keep the message list current across web and Android sessions.
do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null;
when undefined_object then null;
end;
$$;

