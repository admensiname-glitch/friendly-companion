-- Prevent future exercise publication when the specific feedback for an option
-- is missing, too short, or matches known generic placeholder phrases.
-- This only gates future publication; it does not rewrite or unpublish existing rows.

create or replace function public.guard_exercise_publication_quality()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_bad_question text;
  v_bad_feedback text;
begin
  if new.published is distinct from true then
    return new;
  end if;

  if not exists (
    select 1 from public.exercise_questions q where q.exercise_id = new.id
  ) then
    raise exception 'PUBLICATION_BLOCKED_NO_QUESTIONS'
      using errcode = '23514';
  end if;

  select q.question_text
    into v_bad_question
  from public.exercise_questions q
  where q.exercise_id = new.id
    and (
      q.question_text ~* '^(qual alternativa demonstra compreensão de|qual situação melhor indica domínio de|qual afirmação melhor apresenta o conceito central de|qual conclusão pode ser sustentada a partir do material sobre|qual interpretação evita uma simplificação de|qual exemplo está mais próximo do que foi estudado em|qual alternativa diferencia adequadamente conceitos ligados a|qual resposta demonstra domínio aplicado de|qual situação demonstra aplicação adequada de|qual decisão pedagógica se relaciona melhor a|qual evidência ajuda a analisar|qual atitude evita simplificar|ao estudar .* qual procedimento favorece uma análise adequada)'
      or (
        q.question_type = 'multiple_choice'
        and exists (
          select 1
          from public.exercise_options o
          where o.question_id = q.id
            and o.is_correct = true
            and lower(regexp_replace(trim(o.content), '[[:punct:]]+$', '', 'g')) in (
              'uma resposta que relaciona conceito, contexto, evidências e finalidade',
              'relacionar conceito, contexto e evidências para justificar a resposta'
            )
        )
      )
    )
  limit 1;

  if v_bad_question is not null then
    raise exception 'PUBLICATION_BLOCKED_GENERIC_QUESTION: %', left(v_bad_question, 180)
      using errcode = '23514';
  end if;

  select format('question=%s; option=%s; side=%s; feedback=%s',
                q.id, o.position,
                case when o.is_correct then 'correct' else 'incorrect' end,
                left(case when o.is_correct then coalesce(o.feedback_correct, '')
                          else coalesce(o.feedback_incorrect, '') end, 180))
    into v_bad_feedback
  from public.exercise_questions q
  join public.exercise_options o on o.question_id = q.id
  where q.exercise_id = new.id
    and (
      (
        o.is_correct
        and (
          length(trim(coalesce(o.feedback_correct, ''))) < 25
          or lower(trim(coalesce(o.feedback_correct, ''))) in (
            'essa alternativa não demonstra compreensão suficiente do tópico.',
            'essa alternativa não demonstra compreensão suficiente do conceito.',
            'correto. essa alternativa demonstra compreensão relacional do conteúdo.',
            'correto. a resposta relaciona compreensão e análise.',
            'correto. a alternativa privilegia compreensão e análise.',
            'correto.',
            'a alternativa não corresponde ao conceito estudado.'
          )
        )
      )
      or
      (
        not o.is_correct
        and (
          length(trim(coalesce(o.feedback_incorrect, ''))) < 25
          or lower(trim(coalesce(o.feedback_incorrect, ''))) in (
            'revise o material e tente novamente.',
            'continue.',
            'revise a explicação e tente novamente.',
            'revise o material e procure a relação entre conceito, contexto e evidências.'
          )
        )
      )
    )
  limit 1;

  if v_bad_feedback is not null then
    raise exception 'PUBLICATION_BLOCKED_GENERIC_FEEDBACK: %', v_bad_feedback
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.exercise_questions q
    left join public.exercise_options o on o.question_id = q.id
    where q.exercise_id = new.id
    group by q.id, q.question_type, q.feedback_hint
    having
      (q.question_type = 'multiple_choice'
        and (count(o.id) <> 4 or count(o.id) filter (where o.is_correct) <> 1))
      or
      (q.question_type = 'open_text'
        and (count(o.id) <> 0 or length(trim(coalesce(q.feedback_hint, ''))) < 30))
  ) then
    raise exception 'PUBLICATION_BLOCKED_QUESTION_STRUCTURE'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;
