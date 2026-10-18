CREATE OR REPLACE FUNCTION public.guard_exercise_publication_quality()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_bad_question text;
BEGIN
  IF NEW.published IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.exercise_questions q WHERE q.exercise_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'PUBLICATION_BLOCKED_NO_QUESTIONS'
      USING ERRCODE = '23514';
  END IF;

  SELECT q.question_text
    INTO v_bad_question
  FROM public.exercise_questions q
  WHERE q.exercise_id = NEW.id
    AND (
      q.question_text ~* '^(qual alternativa demonstra compreensão de|qual situação melhor indica domínio de|qual afirmação melhor apresenta o conceito central de|qual conclusão pode ser sustentada a partir do material sobre|qual interpretação evita uma simplificação de|qual exemplo está mais próximo do que foi estudado em|qual alternativa diferencia adequadamente conceitos ligados a|qual resposta demonstra domínio aplicado de|qual situação demonstra aplicação adequada de|qual decisão pedagógica se relaciona melhor a|qual evidência ajuda a analisar|qual atitude evita simplificar|ao estudar .* qual procedimento favorece uma análise adequada)'
      OR (
        q.question_type = 'multiple_choice'
        AND EXISTS (
          SELECT 1
          FROM public.exercise_options o
          WHERE o.question_id = q.id
            AND o.is_correct = true
            AND lower(regexp_replace(trim(o.content), '[[:punct:]]+$', '', 'g')) IN (
              'uma resposta que relaciona conceito, contexto, evidências e finalidade',
              'relacionar conceito, contexto e evidências para justificar a resposta'
            )
        )
      )
    )
  LIMIT 1;

  IF v_bad_question IS NOT NULL THEN
    RAISE EXCEPTION 'PUBLICATION_BLOCKED_GENERIC_QUESTION: %', left(v_bad_question, 180)
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.exercise_questions q
    LEFT JOIN public.exercise_options o ON o.question_id = q.id
    WHERE q.exercise_id = NEW.id
    GROUP BY q.id, q.question_type, q.feedback_hint
    HAVING
      (q.question_type = 'multiple_choice'
        AND (count(o.id) <> 4 OR count(o.id) FILTER (WHERE o.is_correct) <> 1))
      OR
      (q.question_type = 'open_text'
        AND (count(o.id) <> 0 OR length(trim(coalesce(q.feedback_hint, ''))) < 30))
  ) THEN
    RAISE EXCEPTION 'PUBLICATION_BLOCKED_QUESTION_STRUCTURE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.guard_exercise_publication_quality() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS exercises_publication_quality_guard ON public.exercises;
CREATE TRIGGER exercises_publication_quality_guard
BEFORE INSERT OR UPDATE OF published ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.guard_exercise_publication_quality();
