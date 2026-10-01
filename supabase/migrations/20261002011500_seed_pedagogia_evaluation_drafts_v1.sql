-- Scaffold de avaliações formais para todos os tópicos de Pedagogia que ainda não possuíam avaliação.
-- Novas avaliações ficam unpublished/draft até revisão e validação editorial.

INSERT INTO public.exercises(topic_id,title,exercise_type,content,difficulty,position,published)
SELECT t.id,'Avaliação do tópico — '||t.name,'evaluation',
 'Avaliação formal em preparação. As questões serão revisadas e validadas antes da publicação.',
 'medium',2,false
FROM public.topics t
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE d.course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
AND NOT EXISTS(
  SELECT 1 FROM public.exercises e
  WHERE e.topic_id=t.id AND e.exercise_type='evaluation'
);

INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT e.id,
 CASE g.pos
  WHEN 1 THEN 'Qual afirmação melhor apresenta o conceito central de "'||t.name||'"?'
  WHEN 2 THEN 'Qual relação é mais coerente com o conteúdo de "'||t.name||'"?'
  WHEN 3 THEN 'Qual situação demonstra aplicação adequada de "'||t.name||'"?'
  WHEN 4 THEN 'Qual evidência ajuda a analisar "'||t.name||'" com maior precisão?'
  WHEN 5 THEN 'Qual interpretação evita uma simplificação de "'||t.name||'"?'
  WHEN 6 THEN 'Qual decisão pedagógica se relaciona melhor a "'||t.name||'"?'
  WHEN 7 THEN 'Qual alternativa diferencia adequadamente conceitos ligados a "'||t.name||'"?'
  WHEN 8 THEN 'Qual exemplo está mais próximo do que foi estudado em "'||t.name||'"?'
  WHEN 9 THEN 'Qual conclusão pode ser sustentada a partir do material sobre "'||t.name||'"?'
  ELSE 'Qual resposta demonstra domínio aplicado de "'||t.name||'"?'
 END,
 'multiple_choice',g.pos,
 'Questão em preparação: compare sua resposta com o material do tópico.',
 ARRAY['pedagogia','avaliacao_rascunho']::text[]
FROM public.exercises e
JOIN public.topics t ON t.id=e.topic_id
JOIN public.disciplines d ON d.id=t.discipline_id
CROSS JOIN generate_series(1,10) g(pos)
WHERE e.exercise_type='evaluation'
AND e.published=false
AND d.course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
AND NOT EXISTS(
 SELECT 1 FROM public.exercise_questions q
 WHERE q.exercise_id=e.id AND q.position=g.pos
);

WITH opts AS(
 SELECT 1 pos,'Uma definição isolada, sem considerar contexto ou finalidade.' content,false is_correct
 UNION ALL SELECT 2,'Uma resposta que relaciona conceito, contexto, evidências e finalidade.',true
 UNION ALL SELECT 3,'Uma opinião pessoal sem justificativa.',false
 UNION ALL SELECT 4,'Uma regra fixa que vale para qualquer situação.',false
)
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT q.id,o.content,o.is_correct,
 CASE WHEN o.is_correct THEN 'Correto. Essa alternativa demonstra compreensão relacional do conteúdo.' ELSE 'Essa alternativa não demonstra compreensão suficiente do tópico.' END,
 CASE WHEN o.is_correct THEN 'Continue.' ELSE 'Revise o material e tente novamente.' END,
 o.pos
FROM public.exercise_questions q
JOIN public.exercises e ON e.id=q.exercise_id
JOIN public.topics t ON t.id=e.topic_id
JOIN public.disciplines d ON d.id=t.discipline_id
CROSS JOIN opts o
WHERE e.exercise_type='evaluation'
AND e.published=false
AND d.course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
AND NOT EXISTS(
 SELECT 1 FROM public.exercise_options eo
 WHERE eo.question_id=q.id AND eo.position=o.pos
);