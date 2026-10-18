-- Exercícios de Aplicação: Planejamento do Ensino
-- 6 exercícios, 6 questões, 24 alternativas (4 por questão)

-- EXERCÍCIO 1
DO $$
DECLARE
  ex_id uuid;
  q_id uuid;
BEGIN
  INSERT INTO exercises (id, topic_id, title, exercise_type, content, difficulty, position, published)
  VALUES (
    gen_random_uuid(),
    'd88141bb-0724-4f63-b9d5-466c34dde2cf',
    'Planejamento e intencionalidade',
    'application',
    'Um professor prepara suas aulas escolhendo conteúdos e atividades previamente, mas não define claramente o que espera que os estudantes aprendam. Qual aspecto fundamental do planejamento está faltando?',
    'easy',
    1,
    true
  ) RETURNING id INTO ex_id;

  INSERT INTO exercise_questions (id, exercise_id, question_text, question_type, position, difficulty_tag)
  VALUES (
    gen_random_uuid(),
    ex_id,
    'O que está faltando principalmente nesse planejamento?',
    'multiple_choice',
    1,
    ARRAY['objetivos_de_aprendizagem']::text[]
  ) RETURNING id INTO q_id;

  INSERT INTO exercise_options (question_id, content, is_correct, feedback_correct, feedback_incorrect, position) VALUES
  (q_id, 'Definir objetivos de aprendizagem.', true, 'Correto. Os objetivos indicam a aprendizagem esperada e ajudam a orientar conteúdos, estratégias e avaliação.', NULL, 1),
  (q_id, 'Aumentar a quantidade de conteúdos.', false, NULL, 'Adicionar mais conteúdos não resolve a ausência de uma direção clara para a aprendizagem. Primeiro é necessário definir o que se pretende alcançar.', 2),
  (q_id, 'Eliminar a avaliação.', false, NULL, 'A avaliação faz parte do planejamento. O problema apresentado está relacionado à falta de definição dos objetivos.', 3),
  (q_id, 'Utilizar mais recursos tecnológicos.', false, NULL, 'Recursos tecnológicos podem apoiar o ensino, mas não substituem a definição dos objetivos de aprendizagem.', 4);
END $$;

-- EXERCÍCIO 2
DO $$
DECLARE
  ex_id uuid;
  q_id uuid;
BEGIN
  INSERT INTO exercises (id, topic_id, title, exercise_type, content, difficulty, position, published)
  VALUES (
    gen_random_uuid(),
    'd88141bb-0724-4f63-b9d5-466c34dde2cf',
    'Coerência entre objetivo e avaliação',
    'application',
    'Uma professora define como objetivo que os estudantes sejam capazes de analisar diferentes propostas de ensino. Ao final da aula, porém, aplica apenas uma questão pedindo que definam o conceito de "método de ensino".',
    'easy',
    2,
    true
  ) RETURNING id INTO ex_id;

  INSERT INTO exercise_questions (id, exercise_id, question_text, question_type, position, difficulty_tag)
  VALUES (
    gen_random_uuid(),
    ex_id,
    'Qual é o principal problema desse planejamento?',
    'multiple_choice',
    1,
    ARRAY['coerencia_objetivos_avaliacao']::text[]
  ) RETURNING id INTO q_id;

  INSERT INTO exercise_options (question_id, content, is_correct, feedback_correct, feedback_incorrect, position) VALUES
  (q_id, 'A avaliação pode não estar suficientemente alinhada ao objetivo de análise.', true, 'Correto. Se o objetivo exige análise, a avaliação precisa produzir evidências dessa capacidade, e não apenas da lembrança de uma definição.', NULL, 1),
  (q_id, 'A professora necessariamente utilizou pouco tempo.', false, NULL, 'O problema apresentado não permite concluir que o tempo foi insuficiente. A questão principal é a relação entre objetivo e avaliação.', 2),
  (q_id, 'O conceito de método de ensino não deveria ser estudado.', false, NULL, 'O conceito pode ser pertinente. O problema está no nível de aprendizagem que a avaliação verifica.', 3),
  (q_id, 'Toda avaliação deve ser uma prova dissertativa.', false, NULL, 'Não existe uma regra de que toda avaliação precisa ser dissertativa. O importante é sua coerência com os objetivos.', 4);
END $$;

-- EXERCÍCIO 3
DO $$
DECLARE
  ex_id uuid;
  q_id uuid;
BEGIN
  INSERT INTO exercises (id, topic_id, title, exercise_type, content, difficulty, position, published)
  VALUES (
    gen_random_uuid(),
    'd88141bb-0724-4f63-b9d5-466c34dde2cf',
    'Planejamento e contexto',
    'application',
    'Um professor utiliza exatamente o mesmo planejamento em duas turmas diferentes, mesmo sabendo que uma delas possui conhecimentos prévios muito diferentes e enfrenta outras condições de aprendizagem.',
    'medium',
    3,
    true
  ) RETURNING id INTO ex_id;

  INSERT INTO exercise_questions (id, exercise_id, question_text, question_type, position, difficulty_tag)
  VALUES (
    gen_random_uuid(),
    ex_id,
    'Qual princípio do planejamento está sendo negligenciado?',
    'multiple_choice',
    1,
    ARRAY['planejamento_contextualizado']::text[]
  ) RETURNING id INTO q_id;

  INSERT INTO exercise_options (question_id, content, is_correct, feedback_correct, feedback_incorrect, position) VALUES
  (q_id, 'A necessidade de considerar o contexto e as características dos estudantes.', true, 'Correto. Planejar envolve considerar os estudantes e as condições concretas da prática educativa, e não apenas repetir um roteiro independentemente do contexto.', NULL, 1),
  (q_id, 'A obrigação de usar tecnologia em todas as aulas.', false, NULL, 'O uso de tecnologia não é o princípio central apresentado na situação.', 2),
  (q_id, 'A necessidade de eliminar objetivos.', false, NULL, 'Os objetivos continuam sendo fundamentais para orientar o ensino.', 3),
  (q_id, 'A necessidade de aplicar a mesma avaliação em qualquer situação.', false, NULL, 'A situação apresentada aponta justamente para a necessidade de considerar diferenças entre contextos.', 4);
END $$;

-- EXERCÍCIO 4
DO $$
DECLARE
  ex_id uuid;
  q_id uuid;
BEGIN
  INSERT INTO exercises (id, topic_id, title, exercise_type, content, difficulty, position, published)
  VALUES (
    gen_random_uuid(),
    'd88141bb-0724-4f63-b9d5-466c34dde2cf',
    'Flexibilidade e replanejamento',
    'application',
    'Durante uma aula, o professor percebe que a turma não domina um conhecimento prévio essencial para compreender o conteúdo planejado. Ele decide interromper a sequência prevista, retomar o conceito básico e reorganizar as atividades seguintes.',
    'medium',
    4,
    true
  ) RETURNING id INTO ex_id;

  INSERT INTO exercise_questions (id, exercise_id, question_text, question_type, position, difficulty_tag)
  VALUES (
    gen_random_uuid(),
    ex_id,
    'Essa decisão representa principalmente:',
    'multiple_choice',
    1,
    ARRAY['replanejamento', 'flexibilidade']::text[]
  ) RETURNING id INTO q_id;

  INSERT INTO exercise_options (question_id, content, is_correct, feedback_correct, feedback_incorrect, position) VALUES
  (q_id, 'Replanejamento a partir das evidências observadas na prática.', true, 'Correto. O planejamento deve orientar a ação, mas também pode ser revisto quando as evidências da prática mostram que uma mudança é necessária.', NULL, 1),
  (q_id, 'Abandono completo do planejamento.', false, NULL, 'Modificar um plano não significa abandonar o planejamento. O professor está utilizando o planejamento de forma flexível.', 2),
  (q_id, 'Falta de definição de objetivos.', false, NULL, 'A situação não indica necessariamente ausência de objetivos. O ponto central é a necessidade de adaptar o percurso.', 3),
  (q_id, 'Improvisação sem finalidade pedagógica.', false, NULL, 'A decisão possui uma finalidade pedagógica clara: criar condições para que os estudantes compreendam o conteúdo.', 4);
END $$;

-- EXERCÍCIO 5
DO $$
DECLARE
  ex_id uuid;
  q_id uuid;
BEGIN
  INSERT INTO exercises (id, topic_id, title, exercise_type, content, difficulty, position, published)
  VALUES (
    gen_random_uuid(),
    'd88141bb-0724-4f63-b9d5-466c34dde2cf',
    'Analisando a coerência de um planejamento',
    'application',
    'Considere o seguinte planejamento: objetivo — desenvolver a capacidade de aplicar um conceito a situações novas; metodologia — exposição oral e cópia de definições durante toda a aula; avaliação — questões de memorização.',
    'medium',
    5,
    true
  ) RETURNING id INTO ex_id;

  INSERT INTO exercise_questions (id, exercise_id, question_text, question_type, position, difficulty_tag)
  VALUES (
    gen_random_uuid(),
    ex_id,
    'Qual análise é mais adequada?',
    'multiple_choice',
    1,
    ARRAY['coerencia_objetivos_metodos_avaliacao']::text[]
  ) RETURNING id INTO q_id;

  INSERT INTO exercise_options (question_id, content, is_correct, feedback_correct, feedback_incorrect, position) VALUES
  (q_id, 'Existe possível desarticulação entre o objetivo, as oportunidades de aprendizagem e a avaliação.', true, 'Correto. O objetivo anuncia uma capacidade de aplicação, enquanto as atividades e a avaliação parecem concentradas em memorização.', NULL, 1),
  (q_id, 'O planejamento está necessariamente correto porque a exposição oral é sempre adequada.', false, NULL, 'Nenhum método é automaticamente adequado independentemente do objetivo e do contexto.', 2),
  (q_id, 'O único problema é a quantidade de conteúdo.', false, NULL, 'A informação apresentada não permite concluir que o problema principal seja a quantidade de conteúdo.', 3),
  (q_id, 'A avaliação não precisa estar relacionada ao objetivo.', false, NULL, 'A avaliação precisa produzir evidências coerentes com aquilo que se pretende que o estudante aprenda.', 4);
END $$;

-- EXERCÍCIO 6
DO $$
DECLARE
  ex_id uuid;
  q_id uuid;
BEGIN
  INSERT INTO exercises (id, topic_id, title, exercise_type, content, difficulty, position, published)
  VALUES (
    gen_random_uuid(),
    'd88141bb-0724-4f63-b9d5-466c34dde2cf',
    'Situação-problema — decisões de planejamento',
    'application',
    'Uma professora terá duas horas para trabalhar um novo conteúdo. Ela percebe que a turma possui conhecimentos prévios heterogêneos e que o tempo disponível não permite aprofundar todos os aspectos previstos inicialmente.',
    'hard',
    6,
    true
  ) RETURNING id INTO ex_id;

  INSERT INTO exercise_questions (id, exercise_id, question_text, question_type, position, difficulty_tag)
  VALUES (
    gen_random_uuid(),
    ex_id,
    'Qual conjunto de decisões é mais coerente com o planejamento do ensino?',
    'multiple_choice',
    1,
    ARRAY['tomada_de_decisoes', 'planejamento_contextualizado']::text[]
  ) RETURNING id INTO q_id;

  INSERT INTO exercise_options (question_id, content, is_correct, feedback_correct, feedback_incorrect, position) VALUES
  (q_id, 'Definir prioridades a partir dos objetivos, considerar os conhecimentos prévios, selecionar conteúdos essenciais, escolher estratégias adequadas e prever como verificar a aprendizagem.', true, 'Correto. Planejar significa tomar decisões articuladas considerando objetivos, conteúdos, estratégias, estudantes, condições reais e avaliação.', NULL, 1),
  (q_id, 'Manter todos os conteúdos previstos e acelerar a exposição para conseguir cumprir o plano.', false, NULL, 'Cumprir todo o conteúdo não é o objetivo em si. É necessário considerar o que é prioritário para a aprendizagem e as condições reais.', 2),
  (q_id, 'Abandonar os objetivos porque a turma é heterogênea.', false, NULL, 'A heterogeneidade exige adaptação do planejamento, não abandono dos objetivos.', 3),
  (q_id, 'Escolher a atividade mais tecnológica disponível e manter o restante do plano sem alterações.', false, NULL, 'A tecnologia, sozinha, não resolve as decisões de planejamento. É necessário analisar objetivos, conteúdo, contexto, estratégia e avaliação.', 4);
END $$;
