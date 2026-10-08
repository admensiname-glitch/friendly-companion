-- Modo Prova híbrido: objetivas + discursivas.
alter table public.exam_attempt_answers
  alter column selected_option_id drop not null;
alter table public.exam_attempt_answers
  add column if not exists response_text text,
  add column if not exists rubric_score numeric,
  add column if not exists ai_feedback text;

create or replace function public.save_exam_text_answer(_attempt_question_id uuid, _response_text text)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$ ... $$;
-- Production SQL is applied directly; this migration records the schema/function contract.
