create or replace function public.finish_exam(_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_total integer;
  v_answered integer;
  v_correct integer;
  v_score numeric;
  v_breakdown jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select total_questions into v_total from public.exam_attempts
  where id=_attempt_id and user_id=v_user and status='in_progress';
  if v_total is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  select count(*), count(*) filter(where is_correct) into v_answered,v_correct
  from public.exam_attempt_answers where attempt_id=_attempt_id;
  v_score := round((v_correct::numeric/v_total::numeric)*100,2);
  update public.exam_attempts set status='completed',answered_questions=v_answered,correct_answers=v_correct,score=v_score,completed_at=now(),updated_at=now() where id=_attempt_id;
  with topic_stats as (
    select e.topic_id,count(*)::int total_questions,count(eaa.id)::int answered_questions,
           count(*) filter(where eaa.is_correct)::int correct_answers,
           round((count(*) filter(where eaa.is_correct)::numeric/count(*)::numeric)*100,2) score
    from public.exam_attempt_questions eaq
    join public.exercise_questions eq on eq.id=eaq.question_id
    join public.exercises e on e.id=eq.exercise_id
    left join public.exam_attempt_answers eaa on eaa.attempt_question_id=eaq.id and eaa.attempt_id=_attempt_id
    where eaq.attempt_id=_attempt_id group by e.topic_id
  )
  insert into public.student_topic_progress(user_id,topic_id,status,attempts_count,best_score,last_learning_activity_at,updated_at)
  select v_user,ts.topic_id,'in_progress',1,ts.score,now(),now() from topic_stats ts
  on conflict(user_id,topic_id) do update set
    attempts_count=public.student_topic_progress.attempts_count+1,
    best_score=greatest(coalesce(public.student_topic_progress.best_score,0),excluded.best_score),
    last_learning_activity_at=now(),updated_at=now();
  select coalesce(jsonb_agg(jsonb_build_object('topic_id',ts.topic_id,'total_questions',ts.total_questions,'answered_questions',ts.answered_questions,'correct_answers',ts.correct_answers,'score',ts.score) order by ts.score asc,ts.topic_id),'[]'::jsonb)
  into v_breakdown
  from (
    select e.topic_id,count(*)::int total_questions,count(eaa.id)::int answered_questions,
           count(*) filter(where eaa.is_correct)::int correct_answers,
           round((count(*) filter(where eaa.is_correct)::numeric/count(*)::numeric)*100,2) score
    from public.exam_attempt_questions eaq join public.exercise_questions eq on eq.id=eaq.question_id
    join public.exercises e on e.id=eq.exercise_id
    left join public.exam_attempt_answers eaa on eaa.attempt_question_id=eaq.id and eaa.attempt_id=_attempt_id
    where eaq.attempt_id=_attempt_id group by e.topic_id
  ) ts;
  return jsonb_build_object('attempt_id',_attempt_id,'score',v_score,'correct_answers',v_correct,'total_questions',v_total,'answered_questions',v_answered,'topic_breakdown',v_breakdown);
end $$;