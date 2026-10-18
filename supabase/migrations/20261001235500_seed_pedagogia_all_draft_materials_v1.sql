-- Pedagogia: estrutura de materiais e prática para todos os tópicos do catálogo.
-- Os materiais e exercícios criados por esta migration permanecem em draft/unpublished
-- até passarem pela pesquisa, validação e revisão editorial do Ensina-me.

UPDATE public.disciplines
SET curriculum_status=CASE WHEN curriculum_status='planned' THEN 'in_progress' ELSE curriculum_status END
WHERE course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
  AND published=false;

INSERT INTO public.materials(topic_id,title,introduction,status)
SELECT t.id,t.name,
 'Material em preparação do Ensina-me. A estrutura será preenchida e validada a partir de fontes acadêmicas e documentos oficiais antes da publicação.',
 'draft'
FROM public.topics t
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE d.course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
  AND NOT EXISTS(SELECT 1 FROM public.materials m WHERE m.topic_id=t.id);

INSERT INTO public.material_sections(material_id,title,content,position,section_type)
SELECT m.id,x.title,
 replace(x.content,'{{TOPICO}}',t.name),
 x.position,x.section_type
FROM public.materials m
JOIN public.topics t ON t.id=m.topic_id
JOIN public.disciplines d ON d.id=t.discipline_id
CROSS JOIN LATERAL(VALUES
(1,'Conceito central','O tópico {{TOPICO}} apresenta conhecimentos que fazem parte da formação em Pedagogia. O estudo começa pela compreensão dos conceitos e de suas relações.','concept'),
(2,'Contexto','Para compreender {{TOPICO}}, observe o contexto histórico, social, cultural ou profissional em que o conhecimento é utilizado.','explanation'),
(3,'Elementos fundamentais','Identifique conceitos, processos, sujeitos, evidências e relações essenciais para interpretar {{TOPICO}} com precisão.','explanation'),
(4,'Exemplo para visualizar','Uma situação concreta ajuda a reconhecer como {{TOPICO}} aparece na educação. Compare contextos diferentes antes de tirar conclusões.','examples'),
(5,'Situação para analisar','Use uma situação-problema relacionada a {{TOPICO}}. Pergunte o que está acontecendo, quais evidências existem e quais conceitos ajudam a explicar o caso.','examples'),
(6,'Erro comum','Evite tratar {{TOPICO}} como receita universal, definição isolada ou opinião sem justificativa.','common_mistakes'),
(7,'Aprofundamento','A literatura sobre {{TOPICO}} pode apresentar abordagens diferentes. O estudante deverá comparar argumentos, evidências, conceitos e limites das interpretações.','deepening'),
(8,'Aplicação pedagógica','Relacione {{TOPICO}} a decisões de ensino, currículo, avaliação, gestão, pesquisa ou prática profissional, conforme a natureza da disciplina.','deepening'),
(9,'Síntese','Domínio de {{TOPICO}} significa conseguir explicar a ideia, reconhecer o conceito em um caso, relacioná-lo a outros conhecimentos e justificar uma aplicação.','review'),
(10,'Para revisar','Explique {{TOPICO}} com suas próprias palavras, dê um exemplo, registre uma dúvida e faça uma conexão com outro tópico de Pedagogia.','review')
) x(position,title,content,section_type)
WHERE m.status='draft'
  AND NOT EXISTS(SELECT 1 FROM public.material_sections ms WHERE ms.material_id=m.id AND ms.position=x.position);

INSERT INTO public.exercises(topic_id,title,exercise_type,content,difficulty,position,published)
SELECT t.id,'Prática — '||t.name,'application',
 'Prática em preparação para '||t.name||'. As questões serão revisadas junto ao material e às fontes antes da publicação.',
 'medium',1,false
FROM public.topics t
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE d.course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
  AND NOT EXISTS(SELECT 1 FROM public.exercises e WHERE e.topic_id=t.id AND e.exercise_type='application');

INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT e.id,
 CASE g.pos
  WHEN 1 THEN 'Qual alternativa demonstra compreensão de "'||t.name||'"?'
  WHEN 2 THEN 'Ao estudar "'||t.name||'", qual procedimento favorece uma análise adequada?'
  WHEN 3 THEN 'Qual atitude evita simplificar "'||t.name||'"?'
  WHEN 4 THEN 'Como "'||t.name||'" pode orientar uma decisão do pedagogo?'
  ELSE 'Qual situação melhor indica domínio de "'||t.name||'"?'
 END,
 'multiple_choice',g.pos,
 'Compare sua resposta com o conceito central e com as evidências apresentadas no material.',
 ARRAY['pedagogia','rascunho']::text[]
FROM public.exercises e
JOIN public.topics t ON t.id=e.topic_id
JOIN public.disciplines d ON d.id=t.discipline_id
CROSS JOIN generate_series(1,5) g(pos)
WHERE e.exercise_type='application'
  AND e.published=false
  AND NOT EXISTS(SELECT 1 FROM public.exercise_questions q WHERE q.exercise_id=e.id AND q.position=g.pos);

WITH opts AS(
 SELECT 1 pos,'Memorizar uma frase e ignorar o contexto.' content,false is_correct
 UNION ALL SELECT 2,'Relacionar conceito, contexto e evidências para justificar a resposta.',true
 UNION ALL SELECT 3,'Escolher a alternativa mais popular.',false
 UNION ALL SELECT 4,'Substituir análise por opinião sem justificativa.',false
)
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT q.id,o.content,o.is_correct,
 CASE WHEN o.is_correct THEN 'Correto. A resposta relaciona compreensão e análise.' ELSE 'Essa alternativa não demonstra compreensão suficiente do conceito.' END,
 CASE WHEN o.is_correct THEN 'Continue.' ELSE 'Revise o material e tente novamente.' END,
 o.pos
FROM public.exercise_questions q
JOIN public.exercises e ON e.id=q.exercise_id
JOIN opts o ON true
WHERE e.published=false
  AND NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=q.id AND eo.position=o.pos);