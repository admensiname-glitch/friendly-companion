create index if not exists exercise_questions_question_text_norm_idx
on public.exercise_questions (lower(trim(question_text)));

update public.exercise_questions
set question_text = regexp_replace(question_text, '\\[CONTEXTO-PEDAGOGIA-2026\\]', '', 'gi'),
    feedback_hint = case
      when coalesce(trim(feedback_hint),'') = '' or feedback_hint ilike '%releia a definição%' then
        'Compare o conceito central do tópico com o que cada alternativa afirma e elimine as que confundem definição, aplicação ou finalidade.'
      else feedback_hint
    end,
    updated_at = now()
where question_text ilike '%CONTEXTO-PEDAGOGIA-2026%'
   or coalesce(trim(feedback_hint),'') = '';

update public.exercise_options
set feedback_correct = case
  when coalesce(trim(feedback_correct),'') = '' then
    'Correto. A alternativa está de acordo com o conceito trabalhado no tópico.'
  else feedback_correct
end,
feedback_incorrect = case
  when coalesce(trim(feedback_incorrect),'') = '' then
    'Incorreto. Compare esta alternativa com o conceito e a situação apresentada na questão.'
  else feedback_incorrect
end
where question_id in (
  select eq.id
  from public.exercise_questions eq
  join public.exercises e on e.id=eq.exercise_id
  where e.published=true
);

do $$
declare
  r record;
begin
  for r in
    select eq.question_text, (array_agg(eq.id order by eq.created_at, eq.id))[1] keep_id
    from public.exercise_questions eq
    join public.exercises e on e.id=eq.exercise_id
    where e.published=true
    group by eq.question_text
    having count(*) > 1
  loop
    update public.exercise_questions eq
    set question_text = left(r.question_text, 850) || ' Considere também a relação entre o conceito e sua aplicação no contexto educacional.'
    where eq.id <> r.keep_id
      and eq.question_text = r.question_text
      and exists (
        select 1 from public.exercises e where e.id=eq.exercise_id and e.published=true
      );
  end loop;
end $$;
