-- Final quality pass for Pedagogia
-- Editorial enrichment, audiovisual coverage, practice integrity and ordering.
-- Idempotent: safe to re-run after the prior Pedagogia coverage migration.

WITH thin_materials AS (
  SELECT m.id AS material_id
  FROM public.materials m
  JOIN public.topics t ON t.id=m.topic_id AND t.published
  JOIN public.disciplines d ON d.id=t.discipline_id
  JOIN public.material_sections ms ON ms.material_id=m.id
  WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
    AND m.status='published'
  GROUP BY m.id
  HAVING avg(length(ms.content)) < 280
),
ctx AS (
  SELECT ms.id,ms.content,ms.position,t.name AS topic,d.name AS discipline
  FROM public.material_sections ms
  JOIN thin_materials tm ON tm.material_id=ms.material_id
  JOIN public.materials m ON m.id=ms.material_id
  JOIN public.topics t ON t.id=m.topic_id
  JOIN public.disciplines d ON d.id=t.discipline_id
  WHERE coalesce(ms.content,'') NOT LIKE '%Roteiro de domínio:%'
),
enriched AS (
  SELECT id,
    content || E'\n\n' ||
    CASE position
      WHEN 1 THEN
        'Roteiro de domínio: comece definindo "' || topic || '" com suas próprias palavras. Em seguida, identifique quais conceitos próximos podem ser confundidos com ele e qual é a diferença essencial. O objetivo desta parte é formar uma definição que você consiga recuperar sem consultar o material.'
      WHEN 2 THEN
        'Para compreender melhor "' || topic || '", relacione o conceito à pergunta: o que muda quando ele é observado em uma situação educativa concreta? Procure identificar finalidade, sujeitos envolvidos, contexto e condições de aprendizagem. Essa leitura evita memorizar uma definição isolada do uso que o conceito tem na Pedagogia.'
      WHEN 3 THEN
        'Conecte "' || topic || '" a pelo menos dois conceitos vizinhos do campo de ' || discipline || '. Pergunte o que eles têm em comum, onde se diferenciam e em que situação cada um explica melhor o problema analisado. Essa comparação é especialmente útil em questões que apresentam alternativas conceitualmente parecidas.'
      WHEN 4 THEN
        'Exemplo aplicado: imagine uma situação real de escola, projeto educativo ou trabalho pedagógico relacionada a "' || topic || '". Descreva o que o professor ou pedagogo faria, qual aprendizagem ou decisão está em jogo e que evidência permitiria perceber se a ação está produzindo o efeito esperado. Depois compare seu exemplo com o princípio estudado.'
      WHEN 5 THEN
        'Situação para análise: diante de um caso envolvendo "' || topic || '", procure responder cinco perguntas — qual é o problema? quais informações já estão disponíveis? qual conceito do tópico ajuda a interpretar a situação? que decisão pedagógica pode ser tomada? que evidência deveria ser acompanhada depois?'
      WHEN 6 THEN
        'Atenção ao erro comum: não transforme "' || topic || '" em uma fórmula única, uma definição decorada ou uma receita que serve para todo contexto. Quando uma afirmação parecer absoluta, procure a condição, a finalidade e o contexto que poderiam mudar sua interpretação. Em prova, palavras como "sempre", "somente" e "nunca" merecem análise cuidadosa.'
      WHEN 7 THEN
        'Aprofundamento com fontes: retorne às fontes acadêmicas ou normativas vinculadas a "' || topic || '" e compare o que elas sustentam com a explicação deste material. Registre pelo menos uma ideia central, uma distinção conceitual e uma implicação pedagógica. O objetivo não é copiar a fonte, mas compreender como a evidência sustenta a explicação.'
      WHEN 8 THEN
        'Aplicação pedagógica: traduza "' || topic || '" em uma decisão observável. Defina o objetivo, escolha uma estratégia coerente, antecipe possíveis dificuldades e estabeleça qual evidência você usaria para acompanhar a aprendizagem ou o resultado da intervenção. Depois pense em como ajustaria a ação caso a evidência não confirmasse a hipótese inicial.'
      WHEN 9 THEN
        'Síntese de domínio: você deve conseguir explicar "' || topic || '" em três movimentos — definição, relação com outros conceitos e aplicação em uma situação concreta. Se uma dessas partes faltar, volte ao trecho correspondente antes de considerar o estudo concluído.'
      WHEN 10 THEN
        'Revisão ativa: feche o material e responda sem consultar: o que é "' || topic || '"? qual é a principal distinção que precisa ser lembrada? qual situação prática exemplifica o conceito? qual erro de interpretação você evitaria? Por fim, crie uma pergunta de prova e tente respondê-la justificando sua escolha.'
      ELSE ''
    END AS new_content
  FROM ctx
)
UPDATE public.material_sections ms
SET content=e.new_content,updated_at=now()
FROM enriched e
WHERE ms.id=e.id;

INSERT INTO public.sources(title,source_type,publisher,canonical_url,language,status,created_at)
SELECT v.title,'VIDEO',v.publisher,v.url,'pt-BR','active',now()
FROM (VALUES
 ('Aula 1 — Antropologia da Educação','ESTUDIOEAD IFNMG','https://www.youtube.com/watch?v=nVLdvv40PeY'),
 ('Webconferência — Avaliação educacional e da aprendizagem','UNIVESP','https://www.youtube.com/watch?v=YxByO70xZKA'),
 ('Educação Ambiental: Princípios e Práticas','Genebaldo Freire Dias','https://www.youtube.com/watch?v=PdcufPm9eAA'),
 ('Trabalho e Formação Docente na Educação Profissional e Tecnológica','ProfEPT / IFES','https://www.youtube.com/watch?v=R3BuhEai874'),
 ('Introdução aos Direitos Humanos — Educação em Direitos Humanos','UNESP / Prograd','https://www.youtube.com/watch?v=x0vHy1buq4c'),
 ('Estágio Supervisionado em Educação Fundamental Anos Iniciais — Docência: importância e fundamentos','UNIVESP','https://www.youtube.com/watch?v=vJ1NNzakVBA'),
 ('Extensão universitária na Unesp está mais próxima da comunidade, do ensino e da pesquisa','TV Unesp','https://www.youtube.com/watch?v=fhIwRK8oXNo'),
 ('Estatística Aplicada à Educação — Variáveis Aleatórias','UNIVESP','https://www.youtube.com/watch?v=VEeG7VEMolk'),
 ('Seminário Integrador — Pensando a prática pedagógica','UFPI / CEAD','https://www.youtube.com/watch?v=LdfiUB5FWbw')
) AS v(title,publisher,url)
WHERE NOT EXISTS (SELECT 1 FROM public.sources s WHERE s.canonical_url=v.url);

WITH reps(discipline,source_url) AS (
 VALUES
 ('Antropologia e Educação','https://www.youtube.com/watch?v=nVLdvv40PeY'),
 ('Alfabetização II','https://www.youtube.com/watch?v=devkCGKPfO8'),
 ('Leitura, Escrita e Letramento','https://www.youtube.com/watch?v=eYemdXtMiwE'),
 ('Metodologias da Educação Infantil','https://www.youtube.com/watch?v=hP2DMHpQNJo'),
 ('Educação, Diversidade e Direitos Humanos','https://www.youtube.com/watch?v=x0vHy1buq4c'),
 ('Educação Ambiental','https://www.youtube.com/watch?v=PdcufPm9eAA'),
 ('Educação, Infâncias e Direitos','https://www.youtube.com/watch?v=x0vHy1buq4c'),
 ('Políticas Públicas Educacionais','https://www.youtube.com/watch?v=6_ckf8itWO8'),
 ('Educação Profissional e Formação ao Longo da Vida','https://www.youtube.com/watch?v=R3BuhEai874'),
 ('Avaliação Educacional e Indicadores','https://www.youtube.com/watch?v=YxByO70xZKA'),
 ('Estatística Aplicada à Educação','https://www.youtube.com/watch?v=VEeG7VEMolk'),
 ('Estágio Curricular Supervisionado I','https://www.youtube.com/watch?v=vJ1NNzakVBA'),
 ('Estágio Curricular Supervisionado II','https://www.youtube.com/watch?v=vJ1NNzakVBA'),
 ('Estágio Curricular Supervisionado III','https://www.youtube.com/watch?v=vJ1NNzakVBA'),
 ('Estágio Curricular Supervisionado IV','https://www.youtube.com/watch?v=vJ1NNzakVBA'),
 ('Estágio Curricular Supervisionado V','https://www.youtube.com/watch?v=vJ1NNzakVBA'),
 ('Estágio Curricular Supervisionado VI','https://www.youtube.com/watch?v=vJ1NNzakVBA'),
 ('Extensão Universitária em Educação','https://www.youtube.com/watch?v=fhIwRK8oXNo'),
 ('Trabalho de Conclusão de Curso','https://www.youtube.com/watch?v=WoGBWQafNAc'),
 ('Seminário Integrador e Práticas Pedagógicas','https://www.youtube.com/watch?v=LdfiUB5FWbw')
),
targets AS (
 SELECT t.id AS topic_id,d.name AS discipline,r.source_url
 FROM public.topics t
 JOIN public.disciplines d ON d.id=t.discipline_id
 JOIN reps r ON r.discipline=d.name
 WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
   AND d.published AND t.published
)
INSERT INTO public.topic_videos
 (id,topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published,created_at,updated_at)
SELECT gen_random_uuid(),tg.topic_id,s.id,s.title,
 'Vídeo complementar relacionado à disciplina e ao estudo deste tópico. Pode ser usado para ampliar a compreensão sem substituir o material principal.',
 s.canonical_url,
 'https://www.youtube-nocookie.com/embed/' || regexp_replace(s.canonical_url,'.*v=',''),
 'youtube',s.publisher,
 coalesce((SELECT max(tv.position)+1 FROM public.topic_videos tv WHERE tv.topic_id=tg.topic_id),1),
 true,now(),now()
FROM targets tg
JOIN public.sources s ON s.canonical_url=tg.source_url
WHERE NOT EXISTS (
 SELECT 1 FROM public.topic_videos tv
 WHERE tv.topic_id=tg.topic_id AND tv.source_id=s.id
);

WITH discipline_reps AS (
 SELECT DISTINCT ON (d.id)
   d.id AS discipline_id,tv.source_id
 FROM public.disciplines d
 JOIN public.topics t ON t.discipline_id=d.id AND t.published
 JOIN public.topic_videos tv ON tv.topic_id=t.id AND tv.published
 WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
 ORDER BY d.id,t.position,tv.position,tv.id
),
targets AS (
 SELECT t.id AS topic_id,dr.source_id
 FROM public.topics t
 JOIN public.disciplines d ON d.id=t.discipline_id
 JOIN discipline_reps dr ON dr.discipline_id=d.id
 WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
   AND t.published
   AND NOT EXISTS (
     SELECT 1 FROM public.topic_videos tv
     WHERE tv.topic_id=t.id AND tv.published
   )
)
INSERT INTO public.topic_videos
 (id,topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published,created_at,updated_at)
SELECT gen_random_uuid(),tg.topic_id,s.id,s.title,
 'Vídeo complementar da disciplina relacionado ao eixo de estudo deste tópico. Use-o para ampliar a compreensão; o material principal continua sendo a referência central.',
 s.canonical_url,
 'https://www.youtube-nocookie.com/embed/' || regexp_replace(s.canonical_url,'.*v=',''),
 'youtube',s.publisher,1,true,now(),now()
FROM targets tg
JOIN public.sources s ON s.id=tg.source_id;

INSERT INTO public.topic_sources(topic_id,source_id,role,status,created_at)
SELECT tv.topic_id,tv.source_id,'COMPLEMENTAR','APPROVED',now()
FROM public.topic_videos tv
JOIN public.topics t ON t.id=tv.topic_id AND t.published
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
  AND tv.published
  AND NOT EXISTS (
    SELECT 1 FROM public.topic_sources ts
    WHERE ts.topic_id=tv.topic_id AND ts.source_id=tv.source_id AND ts.status='APPROVED'
  );

WITH ranked AS (
 SELECT id,
        row_number() OVER (
          PARTITION BY topic_id
          ORDER BY CASE WHEN exercise_type='application' THEN 1 ELSE 2 END,created_at,id
        )::int AS new_position
 FROM public.exercises
 WHERE published
)
UPDATE public.exercises e
SET position=r.new_position,updated_at=now()
FROM ranked r
WHERE e.id=r.id AND e.position IS DISTINCT FROM r.new_position;

WITH topic_core AS (
 SELECT t.id AS topic_id,t.discipline_id,t.position,
        COALESCE((regexp_match(ms.content,'([^.!?]+[.!?])'))[1],ms.content) AS core_sentence
 FROM public.topics t
 JOIN public.disciplines d ON d.id=t.discipline_id
 JOIN public.materials m ON m.topic_id=t.id AND m.status='published'
 JOIN public.material_sections ms ON ms.material_id=m.id AND ms.position=1
 WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
   AND d.published AND t.published
),
generated AS (
 SELECT e.id AS exercise_id,e.topic_id,tc.discipline_id,tc.position
 FROM public.exercises e
 JOIN topic_core tc ON tc.topic_id=e.topic_id
 WHERE e.published AND e.title LIKE 'Prática — %'
),
choices AS (
 SELECT g.exercise_id,
        c1.core_sentence AS correct_content,
        c2.core_sentence AS distractor_1,
        c3.core_sentence AS distractor_2,
        c4.core_sentence AS distractor_3
 FROM generated g
 JOIN topic_core c1 ON c1.topic_id=g.topic_id
 JOIN LATERAL (
   SELECT x.core_sentence FROM topic_core x
   WHERE x.discipline_id=g.discipline_id AND x.topic_id<>g.topic_id
     AND x.core_sentence<>c1.core_sentence
   ORDER BY abs(x.position-g.position),x.position,x.topic_id LIMIT 1
 ) c2 ON true
 JOIN LATERAL (
   SELECT x.core_sentence FROM topic_core x
   WHERE x.discipline_id=g.discipline_id AND x.topic_id<>g.topic_id
     AND x.core_sentence NOT IN (c1.core_sentence,c2.core_sentence)
   ORDER BY abs(x.position-g.position),x.position,x.topic_id LIMIT 1
 ) c3 ON true
 JOIN LATERAL (
   SELECT x.core_sentence FROM topic_core x
   WHERE x.discipline_id=g.discipline_id AND x.topic_id<>g.topic_id
     AND x.core_sentence NOT IN (c1.core_sentence,c2.core_sentence,c3.core_sentence)
   ORDER BY abs(x.position-g.position),x.position,x.topic_id LIMIT 1
 ) c4 ON true
),
updated_options AS (
 UPDATE public.exercise_options o
 SET content=CASE o.position
     WHEN 1 THEN c.correct_content
     WHEN 2 THEN c.distractor_1
     WHEN 3 THEN c.distractor_2
     WHEN 4 THEN c.distractor_3
   END,
   is_correct=(o.position=1),
   feedback_correct=CASE WHEN o.position=1 THEN 'Correto. Essa formulação corresponde ao conceito central apresentado no material.' ELSE NULL END,
   feedback_incorrect=CASE WHEN o.position<>1 THEN 'Essa formulação pertence a outro conceito do mesmo campo. Revise a definição central do tópico e compare as diferenças.' ELSE NULL END
 FROM choices c
 WHERE o.question_id IN (
   SELECT q.id FROM public.exercise_questions q WHERE q.exercise_id=c.exercise_id
 )
 RETURNING o.id
)
UPDATE public.exercise_questions q
SET question_text='Qual alternativa expressa melhor o conceito central de "' || t.name || '"?',
    feedback_hint='Compare a alternativa escolhida com a definição apresentada na seção "Conceito central" do material.'
FROM public.exercises e
JOIN public.topics t ON t.id=e.topic_id
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE q.exercise_id=e.id
  AND e.published
  AND e.title LIKE 'Prática — %'
  AND d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46';
