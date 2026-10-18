-- Modo Prova: sessões multi-tópico com correção server-side.
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline_id uuid references public.disciplines(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  total_questions integer not null check (total_questions between 5 and 40),
  answered_questions integer not null default 0,
  correct_answers integer not null default 0,
  score numeric(5,2),
  duration_seconds integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id uuid not null references public.exercise_questions(id) on delete restrict,
  position integer not null,
  created_at timestamptz not null default now(),
  unique(attempt_id, question_id),
  unique(attempt_id, position)
);

create table if not exists public.exam_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  attempt_question_id uuid not null references public.exam_attempt_questions(id) on delete cascade,
  selected_option_id uuid references public.exercise_options(id) on delete restrict,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique(attempt_id, attempt_question_id)
);

create index if not exists exam_attempts_user_idx on public.exam_attempts(user_id, created_at desc);
create index if not exists exam_attempt_questions_attempt_idx on public.exam_attempt_questions(attempt_id, position);
create index if not exists exam_attempt_answers_attempt_idx on public.exam_attempt_answers(attempt_id);

alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_questions enable row level security;
alter table public.exam_attempt_answers enable row level security;

drop policy if exists exam_attempts_own on public.exam_attempts;
create policy exam_attempts_own on public.exam_attempts for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists exam_attempt_questions_own on public.exam_attempt_questions;
create policy exam_attempt_questions_own on public.exam_attempt_questions for select to authenticated
using (exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=auth.uid()));

drop policy if exists exam_attempt_answers_own on public.exam_attempt_answers;
create policy exam_attempt_answers_own on public.exam_attempt_answers for select to authenticated
using (exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=auth.uid()));

create or replace function public.start_exam(
  _discipline_id uuid,
  _topic_ids uuid[],
  _question_count integer,
  _duration_seconds integer
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_attempt uuid;
  v_count integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if _question_count < 5 or _question_count > 40 then raise exception 'INVALID_QUESTION_COUNT'; end if;
  if _duration_seconds < 0 or _duration_seconds > 7200 then raise exception 'INVALID_DURATION'; end if;

  insert into public.exam_attempts(user_id,discipline_id,total_questions,duration_seconds)
  values(v_user,_discipline_id,_question_count,nullif(_duration_seconds,0))
  returning id into v_attempt;

  insert into public.exam_attempt_questions(attempt_id,question_id,position)
  select v_attempt,q.id,row_number() over(order by random())::int
  from (
    select distinct eq.id
    from public.exercise_questions eq
    join public.exercises e on e.id=eq.exercise_id
    join public.topics t on t.id=e.topic_id
    where e.published=true and eq.question_type='multiple_choice'
      and (_discipline_id is null or t.discipline_id=_discipline_id)
      and (coalesce(array_length(_topic_ids,1),0)=0 or t.id=any(_topic_ids))
    order by random()
    limit _question_count
  ) q;

  select count(*) into v_count from public.exam_attempt_questions where attempt_id=v_attempt;
  if v_count < _question_count then
    delete from public.exam_attempts where id=v_attempt;
    raise exception 'NOT_ENOUGH_QUESTIONS';
  end if;

  return jsonb_build_object(
    'attempt_id',v_attempt,
    'total_questions',v_count,
    'duration_seconds',_duration_seconds,
    'questions',(
      select jsonb_agg(jsonb_build_object(
        'id',eq.id,'attempt_question_id',eaq.id,'position',eaq.position,
        'question_text',eq.question_text,
        'options',(select jsonb_agg(jsonb_build_object('id',eo.id,'content',eo.content) order by eo.position)
                   from public.exercise_options eo where eo.question_id=eq.id)
      ) order by eaq.position)
      from public.exam_attempt_questions eaq
      join public.exercise_questions eq on eq.id=eaq.question_id
      where eaq.attempt_id=v_attempt
    )
  );
end $$;

create or replace function public.save_exam_answer(
  _attempt_question_id uuid,
  _selected_option_id uuid
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_attempt uuid;
  v_correct boolean;
begin
  select eaq.attempt_id into v_attempt
  from public.exam_attempt_questions eaq
  join public.exam_attempts ea on ea.id=eaq.attempt_id
  where eaq.id=_attempt_question_id and ea.user_id=auth.uid() and ea.status='in_progress';
  if v_attempt is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  select eo.is_correct into v_correct
  from public.exercise_options eo
  join public.exam_attempt_questions eaq on eaq.question_id=eo.question_id
  where eaq.id=_attempt_question_id and eo.id=_selected_option_id;

  if v_correct is null then raise exception 'INVALID_OPTION'; end if;

  insert into public.exam_attempt_answers(attempt_id,attempt_question_id,selected_option_id,is_correct)
  values(v_attempt,_attempt_question_id,_selected_option_id,v_correct)
  on conflict (attempt_id,attempt_question_id) do update
    set selected_option_id=excluded.selected_option_id,is_correct=excluded.is_correct,answered_at=now();

  update public.exam_attempts a set
    answered_questions=(select count(*) from public.exam_attempt_answers where attempt_id=a.id),
    correct_answers=(select count(*) from public.exam_attempt_answers where attempt_id=a.id and is_correct),
    updated_at=now()
  where a.id=v_attempt;

  return jsonb_build_object('saved',true,'is_correct',v_correct);
end $$;

create or replace function public.finish_exam(_attempt_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_total integer; v_answered integer; v_correct integer; v_score numeric;
begin
  select total_questions into v_total from public.exam_attempts
  where id=_attempt_id and user_id=auth.uid() and status='in_progress';
  if v_total is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  select count(*),count(*) filter(where is_correct) into v_answered,v_correct
  from public.exam_attempt_answers where attempt_id=_attempt_id;
  v_score := round((v_correct::numeric / v_total::numeric) * 100,2);

  update public.exam_attempts set status='completed',answered_questions=v_answered,correct_answers=v_correct,
    score=v_score,completed_at=now(),updated_at=now()
  where id=_attempt_id;

  return jsonb_build_object('attempt_id',_attempt_id,'score',v_score,'correct_answers',v_correct,
    'total_questions',v_total,'answered_questions',v_answered);
end $$;

revoke all on function public.start_exam(uuid,uuid[],integer,integer) from public;
grant execute on function public.start_exam(uuid,uuid[],integer,integer) to authenticated;
revoke all on function public.save_exam_answer(uuid,uuid) from public;
grant execute on function public.save_exam_answer(uuid,uuid) to authenticated;
revoke all on function public.finish_exam(uuid) from public;
grant execute on function public.finish_exam(uuid) to authenticated;
