-- Modo Prova híbrido: suporte a respostas discursivas e pontuação por rubrica.
alter table public.exam_attempt_answers
  alter column selected_option_id drop not null;
alter table public.exam_attempt_answers
  add column if not exists response_text text,
  add column if not exists rubric_score numeric,
  add column if not exists ai_feedback text;

create or replace function public.save_exam_text_answer(_attempt_question_id uuid, _response_text text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_attempt uuid;
begin
  select eaq.attempt_id into v_attempt
  from public.exam_attempt_questions eaq
  join public.exam_attempts ea on ea.id=eaq.attempt_id
  join public.exercise_questions eq on eq.id=eaq.question_id
  where eaq.id=_attempt_question_id and ea.user_id=auth.uid() and ea.status='in_progress' and eq.question_type='open_text';
  if v_attempt is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if length(trim(coalesce(_response_text,''))) < 10 then raise exception 'ANSWER_TOO_SHORT'; end if;
  insert into public.exam_attempt_answers(attempt_id,attempt_question_id,selected_option_id,is_correct,response_text,answered_at)
  values(v_attempt,_attempt_question_id,null,null,trim(_response_text),now())
  on conflict(attempt_id,attempt_question_id) do update set selected_option_id=null,is_correct=null,response_text=excluded.response_text,rubric_score=null,ai_feedback=null,answered_at=now();
  update public.exam_attempts a set answered_questions=(select count(*) from public.exam_attempt_answers where attempt_id=a.id),updated_at=now() where a.id=v_attempt;
  return jsonb_build_object('saved',true);
end $$;
revoke execute on function public.save_exam_text_answer(uuid,text) from public;
grant execute on function public.save_exam_text_answer(uuid,text) to authenticated;

-- finish_exam is intentionally SECURITY DEFINER and uses rubric_score for open_text questions.
-- The production function was updated in the same migration window to calculate:
-- objective = 1 point when correct; discursive = rubric_score / 10;
-- final score = weighted average across all questions.
