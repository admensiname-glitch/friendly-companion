-- A SECURITY DEFINER exam RPC must never return questions outside the student's course.
CREATE OR REPLACE FUNCTION public.start_exam(
  _discipline_id uuid,
  _topic_ids uuid[],
  _question_count integer,
  _duration_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_course_id uuid;
  v_attempt uuid;
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF _question_count < 5 OR _question_count > 20 THEN
    RAISE EXCEPTION 'INVALID_QUESTION_COUNT';
  END IF;

  IF _duration_seconds < 0 OR _duration_seconds > 7200 THEN
    RAISE EXCEPTION 'INVALID_DURATION';
  END IF;

  SELECT sp.course_id
    INTO v_course_id
  FROM public.student_profiles sp
  JOIN public.courses c
    ON c.id = sp.course_id
   AND c.published = true
  WHERE sp.user_id = v_user;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_COURSE_NOT_CONFIGURED';
  END IF;

  IF _discipline_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.disciplines d
    WHERE d.id = _discipline_id
      AND d.course_id = v_course_id
      AND d.published = true
  ) THEN
    RAISE EXCEPTION 'DISCIPLINE_NOT_AVAILABLE';
  END IF;

  IF coalesce(array_length(_topic_ids, 1), 0) > 0 AND EXISTS (
    SELECT 1
    FROM unnest(_topic_ids) AS requested(topic_id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.topics t
      JOIN public.disciplines d ON d.id = t.discipline_id
      WHERE t.id = requested.topic_id
        AND t.published = true
        AND d.published = true
        AND d.course_id = v_course_id
        AND (_discipline_id IS NULL OR t.discipline_id = _discipline_id)
    )
  ) THEN
    RAISE EXCEPTION 'TOPIC_NOT_AVAILABLE';
  END IF;

  INSERT INTO public.exam_attempts(user_id, discipline_id, total_questions, duration_seconds)
  VALUES (v_user, _discipline_id, _question_count, nullif(_duration_seconds, 0))
  RETURNING id INTO v_attempt;

  INSERT INTO public.exam_attempt_questions(attempt_id, question_id, position)
  SELECT v_attempt, q.id, row_number() OVER (ORDER BY random())::int
  FROM (
    SELECT eq.id
    FROM public.exercise_questions eq
    JOIN public.exercises e ON e.id = eq.exercise_id
    JOIN public.topics t ON t.id = e.topic_id
    JOIN public.disciplines d ON d.id = t.discipline_id
    WHERE e.published = true
      AND eq.question_type = 'multiple_choice'
      AND t.published = true
      AND d.published = true
      AND d.course_id = v_course_id
      AND (_discipline_id IS NULL OR t.discipline_id = _discipline_id)
      AND (coalesce(array_length(_topic_ids, 1), 0) = 0 OR t.id = ANY(_topic_ids))
    ORDER BY random()
    LIMIT _question_count
  ) q;

  SELECT count(*) INTO v_count
  FROM public.exam_attempt_questions
  WHERE attempt_id = v_attempt;

  IF v_count < _question_count THEN
    DELETE FROM public.exam_attempts WHERE id = v_attempt;
    RAISE EXCEPTION 'NOT_ENOUGH_QUESTIONS';
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt,
    'total_questions', v_count,
    'duration_seconds', _duration_seconds,
    'questions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', eq.id,
          'attempt_question_id', eaq.id,
          'position', eaq.position,
          'question_type', eq.question_type,
          'question_text', eq.question_text,
          'minimum_lines', coalesce(eaq.minimum_lines,
            CASE
              WHEN lower(eq.question_text) ~ '(compare|diferenc|relacione|distinga|contraste)' THEN 4
              WHEN lower(eq.question_text) ~ '(analise|analisar|avalie|discuta|justifique|aplique|proponha|exemplifique)' THEN 5
              WHEN lower(eq.question_text) ~ '(explique|descreva|como funciona|por que|por quê)' THEN 3
              ELSE 2
            END),
          'options', (
            SELECT jsonb_agg(
              jsonb_build_object('id', eo.id, 'content', eo.content)
              ORDER BY eo.position
            )
            FROM public.exercise_options eo
            WHERE eo.question_id = eq.id
          )
        )
        ORDER BY eaq.position
      )
      FROM public.exam_attempt_questions eaq
      JOIN public.exercise_questions eq ON eq.id = eaq.question_id
      WHERE eaq.attempt_id = v_attempt
    )
  );
END
$function$;
