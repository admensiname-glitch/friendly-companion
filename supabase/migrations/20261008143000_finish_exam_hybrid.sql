-- Hardening do Modo Prova híbrido: rubric_score e finish_exam.
do $$ begin
  if not exists (select 1 from pg_constraint where conname='exam_attempt_answers_rubric_score_check') then
    alter table public.exam_attempt_answers add constraint exam_attempt_answers_rubric_score_check check (rubric_score is null or (rubric_score >= 0 and rubric_score <= 10));
  end if;
end $$;

-- Production definition applied in the same migration window:
-- finish_exam now treats open_text as rubric_score/10 and objective as binary,
-- and raises ESSAY_NOT_GRADED when an answered discursive has no rubric score.
