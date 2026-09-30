-- ============================================================
-- student_topic_progress: rastreia progresso do aluno por tópico
-- ============================================================
create table if not exists public.student_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  exercises_completed integer not null default 0,
  attempts_count integer not null default 0,
  best_score numeric(5,2) null,
  last_position integer null,
  started_at timestamptz null,
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint unique_user_topic unique (user_id, topic_id)
);

alter table public.student_topic_progress enable row level security;

-- Aluno:_SELECT seu próprio progresso
create policy "Students select own topic progress"
on public.student_topic_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Aluno:INSERT seu próprio progresso
create policy "Students insert own topic progress"
on public.student_topic_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Aluno:UPDATE seu próprio progresso (sempre com user_id = auth.uid() na aplicação)
create policy "Students update own topic progress"
on public.student_topic_progress
for update
to authenticated
using ((select auth.uid()) = user_id);

-- Admin:SELECT qualquer progresso
create policy "Admins select all topic progress"
on public.student_topic_progress
for select
to authenticated
using (public.has_role('admin'));

-- Índice para buscas por usuário
create index if not exists idx_topic_progress_user_id on public.student_topic_progress(user_id);
create index if not exists idx_topic_progress_topic_id on public.student_topic_progress(topic_id);

-- Trigger para updated_at automático
create or replace function public.topic_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_topic_progress_updated_at on public.student_topic_progress;
create trigger trigger_topic_progress_updated_at
  before update on public.student_topic_progress
  for each row execute function public.topic_progress_updated_at();


-- ============================================================
-- student_topic_difficulties: rastreia tags de dificuldade por tópico
-- ============================================================
create table if not exists public.student_topic_difficulties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  difficulty_tag text not null,
  count integer not null default 0,
  first_occurrence timestamptz not null default now(),
  last_occurrence timestamptz not null default now(),
  review_status text not null default 'pending' check (review_status in ('pending', 'reviewed', 'mastered')),
  constraint unique_user_topic_difficulty_tag
    unique (user_id, topic_id, difficulty_tag)
);

alter table public.student_topic_difficulties enable row level security;

-- Aluno:SELECT suas próprias dificuldades
create policy "Students select own topic difficulties"
on public.student_topic_difficulties
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Admin:SELECT qualquer dificuldade
create policy "Admins select all topic difficulties"
on public.student_topic_difficulties
for select
to authenticated
using (public.has_role('admin'));

-- Índice para buscas por usuário
create index if not exists idx_topic_difficulties_user_id on public.student_topic_difficulties(user_id);
create index if not exists idx_topic_difficulties_topic_id on public.student_topic_difficulties(topic_id);


-- ============================================================
-- RPC: incremento atômico de dificuldade
-- Usa SECURITY DEFINER para garantir que user_id vem de auth.uid(),
-- nunca do cliente. Implementa INSERT ... ON CONFLICT para
-- incremento atômico sem UPDATE sem WHERE.
-- ============================================================
create or replace function public.record_topic_difficulty(
  _topic_id uuid,
  _difficulty_tag text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_topic_difficulties
    (user_id, topic_id, difficulty_tag, count, first_occurrence, last_occurrence)
  values
    (auth.uid(), _topic_id, _difficulty_tag, 1, now(), now())
  on conflict (user_id, topic_id, difficulty_tag)
  do update set
    count = student_topic_difficulties.count + 1,
    last_occurrence = now();
end;
$$;

revoke all on function public.record_topic_difficulty from public;
grant execute on function public.record_topic_difficulty to authenticated;
