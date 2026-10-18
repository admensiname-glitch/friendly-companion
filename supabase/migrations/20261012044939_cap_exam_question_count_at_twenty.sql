CREATE OR REPLACE FUNCTION public.start_exam(_discipline_id uuid, _topic_ids uuid[], _question_count integer, _duration_seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_attempt uuid;
  v_count integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if _question_count < 5 or _question_count > 20 then raise exception 'INVALID_QUESTION_COUNT'; end if;
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
          'question_type', eq.question_type,
          'question_text', eq.question_text,
          'minimum_lines', coalesce(eaq.minimum_lines,
            case
              when lower(eq.question_text) ~ '(compare|diferenc|relacione|distinga|contraste)' then 4
              when lower(eq.question_text) ~ '(analise|analisar|avalie|discuta|justifique|aplique|proponha|exemplifique)' then 5
              when lower(eq.question_text) ~ '(explique|descreva|como funciona|por que|por quê)' then 3
              else 2
            end),
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
$function$;
