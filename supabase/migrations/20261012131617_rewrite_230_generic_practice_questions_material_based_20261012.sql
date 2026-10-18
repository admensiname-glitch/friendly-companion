WITH bases AS (
  SELECT q.id AS qid,
         coalesce(nullif(btrim(t.name), ''), 'este tema') AS topic,
         coalesce(
           nullif(split_part(btrim(regexp_replace(regexp_replace(coalesce(m.introduction,''), E'\\\\n|\\\\r', ' ', 'g'), '[[:space:]]+', ' ', 'g')), '.', 1), ''),
           'O estudo deste tema exige relacionar conceitos, contexto e evidências para orientar decisões pedagógicas'
         ) || '.' AS basis
  FROM public.exercise_questions q
  JOIN public.exercises e ON e.id=q.exercise_id
  LEFT JOIN public.topics t ON t.id=e.topic_id
  LEFT JOIN public.materials m ON m.topic_id=t.id
  WHERE q.question_text ILIKE 'Qual atitude evita simplificar%'
),
changed AS (
  UPDATE public.exercise_questions q
  SET question_text = 'Em uma situação pedagógica relacionada a ' || b.topic || ', o material destaca: ' || b.basis || ' Qual decisão aplica melhor essa ideia ao analisar o caso?',
      feedback_hint = 'Retome a ideia central do material sobre ' || b.topic || ' e verifique se sua decisão considera o contexto, os sujeitos envolvidos e as evidências apresentadas.'
  FROM bases b
  WHERE q.id=b.qid
  RETURNING q.id
)
UPDATE public.exercise_options o
SET content = CASE
  WHEN o.is_correct IS TRUE THEN
    'Interpretar a situação com base no princípio de ' || b.topic || ' apresentado no material, relacionando contexto e evidências antes de decidir.'
  WHEN o.position = 1 THEN
    'Aplicar uma regra fixa sobre ' || b.topic || ' sem considerar as particularidades da situação nem as necessidades dos sujeitos envolvidos.'
  WHEN o.position = 3 THEN
    'Generalizar a partir de um único exemplo de ' || b.topic || ', sem verificar se as evidências sustentam a conclusão para este caso.'
  ELSE
    'Escolher a solução por preferência pessoal sobre ' || b.topic || ', sem justificar a decisão com conceitos ou evidências do material.'
  END,
  feedback_correct = CASE WHEN o.is_correct IS TRUE THEN
    'Correto: a decisão relaciona ' || b.topic || ' ao fundamento apresentado no material e exige interpretar o contexto antes de agir.'
    ELSE o.feedback_correct END,
  feedback_incorrect = CASE WHEN o.is_correct IS FALSE THEN
    CASE
      WHEN o.position = 1 THEN 'Essa alternativa transforma ' || b.topic || ' em regra rígida e ignora diferenças relevantes entre situações. Retome o fundamento do enunciado e considere o contexto.'
      WHEN o.position = 3 THEN 'Um exemplo isolado não basta para sustentar uma generalização. Em ' || b.topic || ', a conclusão precisa ser coerente com o conceito e com as evidências disponíveis.'
      ELSE 'Preferência pessoal não substitui justificativa pedagógica. Relacione a decisão sobre ' || b.topic || ' ao fundamento descrito no material e às evidências do caso.'
    END
    ELSE o.feedback_incorrect END
FROM bases b
JOIN public.exercise_questions q ON q.id=b.qid
WHERE o.question_id=q.id;