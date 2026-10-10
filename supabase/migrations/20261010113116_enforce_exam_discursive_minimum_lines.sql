alter table public.exam_attempt_questions
  add column if not exists minimum_lines integer null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.exam_attempt_questions'::regclass
      and conname='exam_attempt_questions_minimum_lines_check'
  ) then
    alter table public.exam_attempt_questions
      add constraint exam_attempt_questions_minimum_lines_check
      check (minimum_lines is null or minimum_lines between 1 and 8);
  end if;
end $$;
