create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null default 'Tutor Ensina-me',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_conversations enable row level security;

drop policy if exists "Students select own AI conversations" on public.ai_conversations;
create policy "Students select own AI conversations"
on public.ai_conversations
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Students insert own AI conversations" on public.ai_conversations;
create policy "Students insert own AI conversations"
on public.ai_conversations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Students update own AI conversations" on public.ai_conversations;
create policy "Students update own AI conversations"
on public.ai_conversations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists idx_ai_conversations_user_updated
  on public.ai_conversations(user_id, updated_at desc);

create index if not exists idx_ai_conversations_topic
  on public.ai_conversations(topic_id, updated_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_messages enable row level security;

drop policy if exists "Students select own AI messages" on public.ai_messages;
create policy "Students select own AI messages"
on public.ai_messages
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Students insert own AI messages" on public.ai_messages;
create policy "Students insert own AI messages"
on public.ai_messages
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
  )
);

create index if not exists idx_ai_messages_conversation_created
  on public.ai_messages(conversation_id, created_at);

create or replace function public.ai_conversations_updated_at()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists trigger_ai_conversations_updated_at
on public.ai_conversations;

create trigger trigger_ai_conversations_updated_at
before update on public.ai_conversations
for each row execute function public.ai_conversations_updated_at();

revoke all on function public.ai_conversations_updated_at() from public,anon,authenticated;
