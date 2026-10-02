-- Finish Pedagogia content coverage and practice
-- 275 published topics: clean public copy, strengthen provenance, and ensure practice coverage.

WITH repeated AS (
  SELECT final_sentence
  FROM (
    SELECT (regexp_match(ms.content, '([^.!?]+[.!?])\\s*$'))[1] AS final_sentence
    FROM public.material_sections ms
    JOIN public.materials m ON m.id=ms.material_id
    JOIN public.topics t ON t.id=m.topic_id
    JOIN public.disciplines d ON d.id=t.discipline_id
    WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
      AND m.status='published' AND t.published
  ) x
  WHERE final_sentence IS NOT NULL
  GROUP BY final_sentence
  HAVING count(*) >= 20
)
UPDATE public.material_sections ms
SET content = btrim(left(ms.content, length(ms.content) - length(r.final_sentence))),
    updated_at = now()
FROM repeated r
WHERE right(ms.content, length(r.final_sentence)) = r.final_sentence
  AND EXISTS (
    SELECT 1
    FROM public.materials m
    JOIN public.topics t ON t.id=m.topic_id
    JOIN public.disciplines d ON d.id=t.discipline_id
    WHERE m.id=ms.material_id
      AND d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
      AND m.status='published' AND t.published
  );

UPDATE public.materials m
SET introduction =
  'Este material organiza os conceitos essenciais de "' || t.name ||
  '", articulando fundamento teórico, exemplos, aplicação pedagógica e revisão para apoiar o estudo no Ensina-me.',
  updated_at = now()
FROM public.topics t
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE m.topic_id=t.id
  AND d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
  AND m.status='published'
  AND t.published
  AND m.introduction ILIKE 'Material em preparação%';

INSERT INTO public.topic_sources (topic_id,source_id,role,status,created_at)
SELECT t.id,
       '00000000-0000-0000-0000-000000000021'::uuid,
       'COMPLEMENTAR',
       'APPROVED',
       now()
FROM public.topics t
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
  AND t.published
  AND NOT EXISTS (
    SELECT 1 FROM public.topic_sources ts
    WHERE ts.topic_id=t.id
      AND ts.source_id='00000000-0000-0000-0000-000000000021'::uuid
      AND ts.status='APPROVED'
  );

WITH missing AS (
  SELECT
    t.id AS topic_id,
    d.name AS discipline,
    t.name AS topic,
    row_number() OVER (ORDER BY d.curriculum_order, t.position, t.id)::int AS rn,
    core.content AS correct_content,
    (
      SELECT ms2.content
      FROM public.topics t2
      JOIN public.materials m2 ON m2.topic_id=t2.id AND m2.status='published'
      JOIN public.material_sections ms2 ON ms2.material_id=m2.id AND ms2.position=1
      WHERE t2.discipline_id=t.discipline_id
        AND t2.id<>t.id
        AND t2.published
      ORDER BY abs(coalesce(t2.position,0)-coalesce(t.position,0)), t2.id
      LIMIT 1 OFFSET 0
    ) AS distractor_1,
    (
      SELECT ms2.content
      FROM public.topics t2
      JOIN public.materials m2 ON m2.topic_id=t2.id AND m2.status='published'
      JOIN public.material_sections ms2 ON ms2.material_id=m2.id AND ms2.position=1
      WHERE t2.discipline_id=t.discipline_id
        AND t2.id<>t.id
        AND t2.published
      ORDER BY abs(coalesce(t2.position,0)-coalesce(t.position,0)), t2.id
      LIMIT 1 OFFSET 1
    ) AS distractor_2,
    (
      SELECT ms2.content
      FROM public.topics t2
      JOIN public.materials m2 ON m2.topic_id=t2.id AND m2.status='published'
      JOIN public.material_sections ms2 ON ms2.material_id=m2.id AND ms2.position=1
      WHERE t2.discipline_id=t.discipline_id
        AND t2.id<>t.id
        AND t2.published
      ORDER BY abs(coalesce(t2.position,0)-coalesce(t.position,0)), t2.id
      LIMIT 1 OFFSET 2
    ) AS distractor_3
  FROM public.topics t
  JOIN public.disciplines d ON d.id=t.discipline_id
  JOIN public.materials m ON m.topic_id=t.id AND m.status='published'
  JOIN public.material_sections core ON core.material_id=m.id AND core.position=1
  WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
    AND d.published AND t.published
    AND NOT EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.topic_id=t.id AND e.published
    )
),
new_exercises AS (
  INSERT INTO public.exercises
    (id,topic_id,title,exercise_type,content,difficulty,position,published,created_at,updated_at)
  SELECT
    gen_random_uuid(),
    topic_id,
    'Prática — ' || topic,
    'application',
    'Verifique se você consegue reconhecer o núcleo conceitual do tópico e aplicá-lo ao contexto da disciplina.',
    'medium',
    1,
    true,
    now(),
    now()
  FROM missing
  RETURNING id,topic_id
),
question_rows AS (
  SELECT
    ne.id AS exercise_id,
    mi.topic_id,
    mi.discipline,
    mi.topic,
    mi.correct_content,
    mi.distractor_1,
    mi.distractor_2,
    mi.distractor_3,
    (mod(mi.rn,4)+1) AS correct_position
  FROM new_exercises ne
  JOIN missing mi ON mi.topic_id=ne.topic_id
),
new_questions AS (
  INSERT INTO public.exercise_questions
    (id,exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag,created_at,updated_at)
  SELECT
    gen_random_uuid(),
    exercise_id,
    'Pensando em ' || discipline || ', qual alternativa apresenta melhor o núcleo conceitual de "' || topic || '"?',
    'multiple_choice',
    1,
    'Compare a alternativa escolhida com a seção "Conceito central" deste material.',
    ARRAY['medium'],
    now(),
    now()
  FROM question_rows
  RETURNING id,exercise_id
)
INSERT INTO public.exercise_options
  (id,question_id,content,is_correct,feedback_correct,feedback_incorrect,position,created_at)
SELECT
  gen_random_uuid(),
  nq.id,
  opt.content,
  opt.position = qr.correct_position,
  CASE
    WHEN opt.position = qr.correct_position
    THEN 'Correto. A alternativa corresponde ao conceito central apresentado no material.'
    ELSE NULL
  END,
  CASE
    WHEN opt.position <> qr.correct_position
    THEN 'Revise o conceito central de "' || qr.topic || '" e compare-o com a alternativa escolhida.'
    ELSE NULL
  END,
  opt.position,
  now()
FROM new_questions nq
JOIN question_rows qr ON qr.exercise_id=nq.exercise_id
CROSS JOIN LATERAL (
  VALUES
    (1, CASE WHEN qr.correct_position=1 THEN qr.correct_content ELSE qr.distractor_1 END),
    (2, CASE
          WHEN qr.correct_position=2 THEN qr.correct_content
          WHEN qr.correct_position=1 THEN qr.distractor_2
          ELSE qr.distractor_1
        END),
    (3, CASE
          WHEN qr.correct_position=3 THEN qr.correct_content
          WHEN qr.correct_position=1 THEN qr.distractor_3
          WHEN qr.correct_position=2 THEN qr.distractor_2
          ELSE qr.distractor_1
        END),
    (4, CASE
          WHEN qr.correct_position=4 THEN qr.correct_content
          WHEN qr.correct_position=1 THEN qr.distractor_3
          WHEN qr.correct_position=2 THEN qr.distractor_3
          WHEN qr.correct_position=3 THEN qr.distractor_2
          ELSE qr.distractor_1
        END)
) AS opt(position,content)
WHERE opt.content IS NOT NULL;
