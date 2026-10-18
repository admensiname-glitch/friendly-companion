begin;

alter table public.formal_evaluation_questions enable row level security;
alter table public.formal_evaluation_answers enable row level security;

drop policy if exists "Students select own formal evaluation questions"
  on public.formal_evaluation_questions;
create policy "Students select own formal evaluation questions"
on public.formal_evaluation_questions
for select
to authenticated
using (
  exists (
    select 1 from public.evaluation_attempts a
    where a.id = formal_evaluation_questions.attempt_id
      and a.user_id = (select auth.uid())
  )
);

drop policy if exists "Students select own formal evaluation answers"
  on public.formal_evaluation_answers;
create policy "Students select own formal evaluation answers"
on public.formal_evaluation_answers
for select
to authenticated
using (
  exists (
    select 1 from public.evaluation_attempts a
    where a.id = formal_evaluation_answers.attempt_id
      and a.user_id = (select auth.uid())
  )
);

drop policy if exists "Students insert own formal evaluation answers"
  on public.formal_evaluation_answers;
create policy "Students insert own formal evaluation answers"
on public.formal_evaluation_answers
for insert
to authenticated
with check (
  exists (
    select 1 from public.evaluation_attempts a
    where a.id = formal_evaluation_answers.attempt_id
      and a.user_id = (select auth.uid())
  )
);

alter function public.get_formal_evaluation_state(uuid) security invoker;
alter function public.get_formal_evaluation_history(uuid) security invoker;
alter function public.finalize_formal_evaluation(uuid, jsonb) security invoker;

revoke execute on function public.get_formal_evaluation_state(uuid) from anon;
revoke execute on function public.get_formal_evaluation_history(uuid) from anon;
revoke execute on function public.finalize_formal_evaluation(uuid, jsonb) from anon;

commit;