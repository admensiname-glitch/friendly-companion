-- Harden Modo Prova RPCs, server-side deadline handling, and FK/RLS performance.

drop function if exists public.start_exam(uuid, uuid[], integer, integer);
create or replace function public.start_exam(
  _discipline_id uuid,
  _topic_ids uuid[],
  _question_count integer,
  _duration_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_attempt uuid;
  v_count integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if _question_count < 5 or _question_count > 40 then raise exception 'INVALID_QUESTION_COUNT'; end if;
  if _duration_seconds < 0 or _duration_seconds > 7200 then raise exception 'INVALID_DURATION'; end if;

  insert into public.exam_attempts(user_id, discipline_id, total_questions, duration_seconds)
  values(v_user, _discipline_id, _question_count, nullif(_duration_seconds, 0))
  returning id into v_attempt;

  insert into public.exam_attempt_questions(attempt_id, question_id, position)
  select v_attempt, q.id, row_number() over(order by random())::int
  from (
    select eq.id
    from public.exercise_questions eq
    join public.exercises e on e.id = eq.exercise_id
    join public.topics t on t.id = e.topic_id
    join public.disciplines d on d.id = t.discipline_id
    where e.published = true
      and eq.question_type = 'multiple_choice'
      and t.published = true
      and d.published = true
      and (_discipline_id is null or t.discipline_id = _discipline_id)
      and (coalesce(array_length(_topic_ids,1),0) = 0 or t.id = any(_topic_ids))
    order by random()
    limit _question_count
  ) q;

  select count(*) into v_count
  from public.exam_attempt_questions
  where attempt_id = v_attempt;

  if v_count < _question_count then
    delete from public.exam_attempts where id = v_attempt;
    raise exception 'NOT_ENOUGH_QUESTIONS';
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt,
    'total_questions', v_count,
    'duration_seconds', _duration_seconds,
    'questions', (
      select jsonb_agg(
        jsonb_build_object(
          'id', eq.id,
          'attempt_question_id', eaq.id,
          'position', eaq.position,
          'question_text', eq.question_text,
          'options', (
            select jsonb_agg(
              jsonb_build_object('id', eo.id, 'content', eo.content)
              order by eo.position
            )
            from public.exercise_options eo
            where eo.question_id = eq.id
          )
        )
        order by eaq.position
      )
      from public.exam_attempt_questions eaq
      join public.exercise_questions eq on eq.id = eaq.question_id
      where eaq.attempt_id = v_attempt
    )
  );
end
$$;

drop function if exists public.save_exam_answer(uuid, uuid);
create or replace function public.save_exam_answer(
  _attempt_question_id uuid,
  _selected_option_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt uuid;
  v_correct boolean;
  v_started_at timestamptz;
  v_duration integer;
begin
  select eaq.attempt_id, ea.started_at, ea.duration_seconds
    into v_attempt, v_started_at, v_duration
  from public.exam_attempt_questions eaq
  join public.exam_attempts ea on ea.id = eaq.attempt_id
  where eaq.id = _attempt_question_id
    and ea.user_id = auth.uid()
    and ea.status = 'in_progress';

  if v_attempt is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  if v_duration is not null and now() >= v_started_at + make_interval(secs => v_duration) then
    raise exception 'EXAM_EXPIRED';
  end if;

  select eo.is_correct into v_correct
  from public.exercise_options eo
  join public.exam_attempt_questions eaq on eaq.question_id = eo.question_id
  where eaq.id = _attempt_question_id
    and eo.id = _selected_option_id;

  if v_correct is null then raise exception 'INVALID_OPTION'; end if;

  insert into public.exam_attempt_answers(
    attempt_id, attempt_question_id, selected_option_id, is_correct
  )
  values(v_attempt, _attempt_question_id, _selected_option_id, v_correct)
  on conflict (attempt_id, attempt_question_id) do update
    set selected_option_id = excluded.selected_option_id,
        is_correct = excluded.is_correct,
        answered_at = now();

  update public.exam_attempts a set
    answered_questions = (
      select count(*) from public.exam_attempt_answers where attempt_id = a.id
    ),
    correct_answers = (
      select count(*) from public.exam_attempt_answers
      where attempt_id = a.id and is_correct
    ),
    updated_at = now()
  where a.id = v_attempt;

  return jsonb_build_object('saved', true);
end
$$;

drop function if exists public.finish_exam(uuid);
create or replace function public.finish_exam(_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_answered integer;
  v_correct integer;
  v_score numeric;
begin
  select total_questions into v_total
  from public.exam_attempts
  where id = _attempt_id
    and user_id = auth.uid()
    and status = 'in_progress';

  if v_total is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  select count(*), count(*) filter(where is_correct)
    into v_answered, v_correct
  from public.exam_attempt_answers
  where attempt_id = _attempt_id;

  v_score := round((v_correct::numeric / v_total::numeric) * 100, 2);

  update public.exam_attempts
  set status = 'completed',
      answered_questions = v_answered,
      correct_answers = v_correct,
      score = v_score,
      completed_at = now(),
      updated_at = now()
  where id = _attempt_id;

  return jsonb_build_object(
    'attempt_id', _attempt_id,
    'score', v_score,
    'correct_answers', v_correct,
    'total_questions', v_total,
    'answered_questions', v_answered
  );
end
$$;

revoke all on function public.start_exam(uuid, uuid[], integer, integer) from public;
revoke all on function public.start_exam(uuid, uuid[], integer, integer) from anon;
grant execute on function public.start_exam(uuid, uuid[], integer, integer) to authenticated;

revoke all on function public.save_exam_answer(uuid, uuid) from public;
revoke all on function public.save_exam_answer(uuid, uuid) from anon;
grant execute on function public.save_exam_answer(uuid, uuid) to authenticated;

revoke all on function public.finish_exam(uuid) from public;
revoke all on function public.finish_exam(uuid) from anon;
grant execute on function public.finish_exam(uuid) to authenticated;

drop policy if exists exam_attempts_own on public.exam_attempts;
create policy exam_attempts_own on public.exam_attempts
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists exam_attempt_questions_own on public.exam_attempt_questions;
create policy exam_attempt_questions_own on public.exam_attempt_questions
for select to authenticated
using (
  exists (
    select 1
    from public.exam_attempts a
    where a.id = attempt_id
      and a.user_id = (select auth.uid())
  )
);

drop policy if exists exam_attempt_answers_own on public.exam_attempt_answers;
create policy exam_attempt_answers_own on public.exam_attempt_answers
for select to authenticated
using (
  exists (
    select 1
    from public.exam_attempts a
    where a.id = attempt_id
      and a.user_id = (select auth.uid())
  )
);

create index if not exists exam_attempts_discipline_idx
  on public.exam_attempts(discipline_id);
create index if not exists exam_attempt_questions_question_idx
  on public.exam_attempt_questions(question_id);
create index if not exists exam_attempt_answers_attempt_question_idx
  on public.exam_attempt_answers(attempt_question_id);
create index if not exists exam_attempt_answers_selected_option_idx
  on public.exam_attempt_answers(selected_option_id);
