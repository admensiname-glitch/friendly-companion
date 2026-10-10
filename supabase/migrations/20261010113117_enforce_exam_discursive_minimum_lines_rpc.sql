create or replace function public.save_exam_text_answer(_attempt_question_id uuid, _response_text text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_attempt uuid;
  v_min_lines integer;
  v_lines integer;
begin
  select eaq.attempt_id,
         coalesce(eaq.minimum_lines,
           case
             when lower(eq.question_text) ~ '(compare|diferenc|relacione|distinga|contraste)' then 4
             when lower(eq.question_text) ~ '(analise|analisar|avalie|discuta|justifique|aplique|proponha|exemplifique)' then 5
             when lower(eq.question_text) ~ '(explique|descreva|como funciona|por que|por quê)' then 3
             else 2
           end)
    into v_attempt, v_min_lines
  from public.exam_attempt_questions eaq
  join public.exam_attempts ea on ea.id=eaq.attempt_id
  join public.exercise_questions eq on eq.id=eaq.question_id
  where eaq.id=_attempt_question_id
    and ea.user_id=auth.uid()
    and ea.status='in_progress'
    and eq.question_type='open_text';

  if v_attempt is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if length(trim(coalesce(_response_text,''))) < 10 then raise exception 'ANSWER_TOO_SHORT'; end if;

  select count(*) into v_lines
  from regexp_split_to_table(trim(coalesce(_response_text,'')), E'\r?\n') as line
  where length(trim(line)) > 0;

  if v_lines < v_min_lines then
    raise exception 'MINIMUM_LINES_REQUIRED:%', v_min_lines;
  end if;

  insert into public.exam_attempt_answers(
    attempt_id,attempt_question_id,selected_option_id,is_correct,response_text,answered_at
  )
  values(v_attempt,_attempt_question_id,null,null,trim(_response_text),now())
  on conflict(attempt_id,attempt_question_id) do update set
    selected_option_id=null,is_correct=null,response_text=excluded.response_text,
    rubric_score=null,ai_feedback=null,answered_at=now();

  update public.exam_attempts a set
    answered_questions=(select count(*) from public.exam_attempt_answers where attempt_id=a.id),
    updated_at=now()
  where a.id=v_attempt;
  return jsonb_build_object('saved',true,'minimum_lines',v_min_lines,'actual_lines',v_lines);
end;
$function$;
