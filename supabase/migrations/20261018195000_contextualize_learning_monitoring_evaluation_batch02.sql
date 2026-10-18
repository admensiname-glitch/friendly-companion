-- Contextualize the ten unpublished questions in the learning-monitoring topic evaluation.
-- The question scenarios and option rationales are grounded in the published topic material.
-- The answer key is deliberately distributed across option positions to avoid a fixed-position pattern.
-- No published exercise or material is modified, and this evaluation remains a draft.

do $preflight$
declare
  v_exercise_id constant uuid := 'ee8cf24b-8087-4b2c-9764-a41153af3b25';
begin
  if not exists (
    select 1 from public.exercises
    where id = v_exercise_id
      and title = 'Avaliação do tópico — Acompanhamento da aprendizagem'
      and published = false
  ) then
    raise exception 'BATCH_ABORTED: evaluation is missing, renamed or no longer a draft';
  end if;

  if exists (
    select expected.question_id
    from (values
      ('251d9c7d-3734-4945-bbff-4d46800cf337'::uuid, '8aa6f553-cbe7-4f80-a700-301d743706f8'::uuid),
      ('25b653ca-85ee-4ed4-9088-feb4dd187954'::uuid, 'ca5b496a-895f-4fd5-87a8-3000368ff66b'::uuid),
      ('9471ae18-c934-444f-b999-e927454d12f4'::uuid, '25abd611-a64e-4d9d-9fdb-fe788496929a'::uuid),
      ('7606877a-b629-4efe-bc4b-bb769eef3b30'::uuid, 'be4c4c34-bceb-457d-84b4-ddd2e3982588'::uuid),
      ('3614c811-fd6c-43c7-89dc-5d9b7db44d97'::uuid, 'c5ffbf07-dad3-4712-9eec-c9c7f6c8f44c'::uuid),
      ('2b40af70-eefe-4f92-9c94-d669fc9eef70'::uuid, '2fced001-177d-441a-97c9-69c9a9f44d4b'::uuid),
      ('2782c3d7-15bd-4423-9a7e-04e2320d027a'::uuid, 'df071cce-3d51-4906-9cea-24ec292893be'::uuid),
      ('ba20de26-4bea-450a-819c-e0541270590a'::uuid, '4be99585-87c4-4869-93b1-1d88e59aef34'::uuid),
      ('93fce152-7fcc-4bb0-ae42-852780d13f0d'::uuid, '2347e373-f53d-4d7e-a159-13b63e195ff2'::uuid),
      ('96725b5e-613d-4085-88ce-a48723676562'::uuid, '68462711-faa1-4c31-b7cf-cdb9594b867a'::uuid)
    ) as expected(question_id, prior_correct_option_id)
    left join public.exercise_questions q
      on q.id = expected.question_id
     and q.exercise_id = v_exercise_id
    left join public.exercise_options o on o.question_id = q.id
    group by expected.question_id, expected.prior_correct_option_id
    having count(o.id) <> 4
        or count(o.id) filter (where o.is_correct) <> 1
        or count(o.id) filter (
          where o.is_correct and o.id = expected.prior_correct_option_id
        ) <> 1
  ) then
    raise exception 'BATCH_ABORTED: evaluation structure or prior answer keys differ from the audited snapshot';
  end if;
end
$preflight$;

insert into private.exercise_quality_feedback_backups_20261018 (
  batch_id, exercise_id, question_id, option_id,
  prior_question_text, prior_feedback_hint, prior_option_content,
  prior_is_correct, prior_feedback_correct, prior_feedback_incorrect
)
select
  '2026-10-18-learning-monitoring-eval-batch-02',
  e.id, q.id, o.id,
  q.question_text, q.feedback_hint, o.content,
  o.is_correct, o.feedback_correct, o.feedback_incorrect
from public.exercises e
join public.exercise_questions q on q.exercise_id = e.id
join public.exercise_options o on o.question_id = q.id
where e.id = 'ee8cf24b-8087-4b2c-9764-a41153af3b25'
on conflict (batch_id, option_id) do nothing;

do $backup_check$
begin
  if (
    select count(*)
    from private.exercise_quality_feedback_backups_20261018
    where batch_id = '2026-10-18-learning-monitoring-eval-batch-02'
      and exercise_id = 'ee8cf24b-8087-4b2c-9764-a41153af3b25'
  ) <> 40 then
    raise exception 'BATCH_ABORTED: expected a 40-option backup before editing';
  end if;
end
$backup_check$;

update public.exercise_questions
set question_text = case id
  when '251d9c7d-3734-4945-bbff-4d46800cf337'
    then 'Durante uma unidade, a professora observa as estratégias dos estudantes, registra dificuldades, devolve orientações e ajusta as atividades seguintes. O que diferencia esse processo de uma avaliação limitada à nota final?'
  when '25b653ca-85ee-4ed4-9088-feb4dd187954'
    then 'Após uma atividade de leitura, a professora identifica que alguns estudantes compreendem a ideia principal, mas não justificam inferências. Qual sequência conecta evidências, devolutiva e planejamento?'
  when '9471ae18-c934-444f-b999-e927454d12f4'
    then 'Uma estudante erra uma questão de análise, recebe orientação para localizar evidências no texto e acerta uma questão nova. Qual conclusão é mais prudente?'
  when '7606877a-b629-4efe-bc4b-bb769eef3b30'
    then 'Para compreender por que estudantes erram uma etapa de um procedimento, qual conjunto de evidências permite uma análise mais precisa?'
  when '3614c811-fd6c-43c7-89dc-5d9b7db44d97'
    then 'Dois estudantes obtêm a mesma nota, mas um explica suas estratégias e o outro repete um algoritmo sem conseguir adaptá-lo. Por que a nota isolada é insuficiente?'
  when '2b40af70-eefe-4f92-9c94-d669fc9eef70'
    then 'Uma professora detecta que parte da turma erra ao justificar respostas em problemas. Qual sequência ajuda a escolher e avaliar uma intervenção pedagógica?'
  when '2782c3d7-15bd-4423-9a7e-04e2320d027a'
    then 'O registro mostra que 12 estudantes erraram a mesma etapa. O que transforma esse dado em uma interpretação útil para o ensino?'
  when 'ba20de26-4bea-450a-819c-e0541270590a'
    then 'Após uma retomada sobre inferência leitora, qual prática demonstra uso contínuo de evidências para ajustar o ensino?'
  when '93fce152-7fcc-4bb0-ae42-852780d13f0d'
    then 'Uma atividade mostra avanços para alguns estudantes e dificuldades persistentes para outros. Qual conclusão e resposta pedagógica são mais responsáveis?'
  when '96725b5e-613d-4085-88ce-a48723676562'
    then 'Uma equipe quer saber se uma intervenção de alfabetização ajudou os estudantes a justificar suas escolhas ao responder perguntas. Qual plano produz evidência mais útil?'
  else question_text
end,
feedback_hint = case id
  when '251d9c7d-3734-4945-bbff-4d46800cf337'
    then 'Observe a sequência entre evidência recolhida durante o ensino, interpretação do que o estudante compreendeu e decisão sobre a próxima ação.'
  when '25b653ca-85ee-4ed4-9088-feb4dd187954'
    then 'Uma devolutiva útil aponta a evidência observada, o aspecto a melhorar e uma ação seguinte; as respostas também orientam o plano docente.'
  when '9471ae18-c934-444f-b999-e927454d12f4'
    then 'A melhora após uma orientação é uma evidência importante, mas novas situações ajudam a avaliar manutenção e transferência da aprendizagem.'
  when '7606877a-b629-4efe-bc4b-bb769eef3b30'
    then 'Escolha registros ligados ao objetivo e que permitam examinar as estratégias e os erros, não apenas um resultado numérico.'
  when '3614c811-fd6c-43c7-89dc-5d9b7db44d97'
    then 'A nota resume o desempenho numa tarefa; não revela sozinha a estratégia usada, a compreensão conceitual ou o próximo apoio necessário.'
  when '2b40af70-eefe-4f92-9c94-d669fc9eef70'
    then 'O acompanhamento liga observação, hipótese sobre a dificuldade, intervenção orientada por essa hipótese e verificação posterior.'
  when '2782c3d7-15bd-4423-9a7e-04e2320d027a'
    then 'Um número só passa a orientar o ensino quando é relacionado ao objetivo, analisado no contexto e usado para decidir uma ação verificável.'
  when 'ba20de26-4bea-450a-819c-e0541270590a'
    then 'Compare produções antes e depois da retomada e use a mudança observada para manter ou ajustar a intervenção.'
  when '93fce152-7fcc-4bb0-ae42-852780d13f0d'
    then 'Evite generalizar a partir do resultado médio; identifique quem avançou, qual dificuldade persiste e que apoio pode ser ajustado.'
  when '96725b5e-613d-4085-88ce-a48723676562'
    then 'Defina um critério observável, conserve exemplos antes e depois da intervenção e compare as produções para decidir o próximo passo.'
  else feedback_hint
end,
updated_at = now()
where id in (
  '251d9c7d-3734-4945-bbff-4d46800cf337',
  '25b653ca-85ee-4ed4-9088-feb4dd187954',
  '9471ae18-c934-444f-b999-e927454d12f4',
  '7606877a-b629-4efe-bc4b-bb769eef3b30',
  '3614c811-fd6c-43c7-89dc-5d9b7db44d97',
  '2b40af70-eefe-4f92-9c94-d669fc9eef70',
  '2782c3d7-15bd-4423-9a7e-04e2320d027a',
  'ba20de26-4bea-450a-819c-e0541270590a',
  '93fce152-7fcc-4bb0-ae42-852780d13f0d',
  '96725b5e-613d-4085-88ce-a48723676562'
);

with revised_options (
  option_id, option_text, is_correct, feedback_correct, feedback_incorrect
) as (
  values
  -- Q1: continuous evidence, interpretation and instructional adjustment. Correct: position 2.
  ('8d94af44-becb-4d51-a558-62a7e1680897'::uuid, 'Classificar cada estudante uma vez e manter o mesmo plano até o fim.', false, null::text, 'Uma classificação pontual não mostra como a aprendizagem evolui nem orienta apoios posteriores. O acompanhamento exige voltar às evidências durante o ensino.'),
  ('8aa6f553-cbe7-4f80-a700-301d743706f8'::uuid, 'Usar evidências ao longo do ensino para interpretar a aprendizagem e decidir feedback, retomada ou novo desafio.', true, 'Acompanhamento conecta registros de diferentes momentos à interpretação do que o estudante consegue fazer e à decisão sobre o próximo passo pedagógico.', null::text),
  ('036bf7f9-a470-4d56-ad50-0103851b5f0c'::uuid, 'Reunir frequência e entrega de tarefas como prova suficiente de aprendizagem.', false, null::text, 'Frequência e entrega informam participação, mas não mostram por si sós a compreensão. É preciso examinar respostas, estratégias e produções alinhadas ao objetivo.'),
  ('e06baa2e-7767-44cb-bdbb-e627077e3a48'::uuid, 'Aplicar um instrumento idêntico sem relacionar as respostas aos objetivos de aprendizagem.', false, null::text, 'Um instrumento sem critério ligado ao objetivo gera resultados difíceis de interpretar. A evidência precisa permitir concluir algo sobre a aprendizagem que se pretende observar.'),

  -- Q2: feedback and planning. Correct: position 4.
  ('d8be7f0f-bece-4578-a51e-7d6348e5a4ff'::uuid, 'Registrar a pontuação e encerrar a análise da atividade.', false, null::text, 'A pontuação informa um resultado, mas não orienta sozinha o estudante nem mostra ao professor qual aspecto precisa ser ensinado novamente.'),
  ('ca5b496a-895f-4fd5-87a8-3000368ff66b'::uuid, 'Elogiar a participação geral sem indicar o que está adequado ou qual é o próximo passo.', false, null::text, 'Um elogio genérico não informa como melhorar a justificativa de inferências. A devolutiva deve apontar uma evidência concreta e uma ação utilizável pelo estudante.'),
  ('5dc28992-4213-4f6d-91ba-cb470e05af70'::uuid, 'Repetir a mesma aula para toda a turma sem usar as respostas para revisar o plano.', false, null::text, 'Ignorar as respostas impede ajustar o ensino à dificuldade observada. O planejamento deve considerar o que as evidências mostram que os estudantes ainda precisam desenvolver.'),
  ('ac29f2a8-3560-4225-bb7e-8985c38dba37'::uuid, 'Mostrar a evidência da justificativa, indicar como melhorá-la e propor uma nova tarefa para verificar inferências.', true, 'Essa sequência liga a evidência a uma devolutiva acionável e usa o desempenho posterior para decidir se o planejamento precisa de outro ajuste.', null::text),

  -- Q3: improvement after guidance. Correct: position 1.
  ('39b4f2d6-0304-4267-bf85-4cdbed0c623b'::uuid, 'A melhora após a orientação sugere que o apoio pode ter contribuído; outra produção ajuda a verificar manutenção e transferência.', true, 'A mudança depois da orientação é uma evidência de progresso. Observar uma nova tarefa ajuda a avaliar se o estudante consegue usar a aprendizagem além do exemplo orientado.', null::text),
  ('25abd611-a64e-4d9d-9fdb-fe788496929a'::uuid, 'O primeiro erro prova que a estudante não conhecia o assunto.', false, null::text, 'Um erro isolado não descreve toda a compreensão. A melhora após a orientação fornece nova evidência e pede análise do que a estudante passou a conseguir fazer.'),
  ('311f6ece-e278-4aaf-a7bd-c6ca2ab7edfa'::uuid, 'Um único acerto posterior comprova domínio completo e elimina a necessidade de novas evidências.', false, null::text, 'Um acerto mostra desempenho naquela tarefa, não necessariamente domínio estável. Verifique se o raciocínio se mantém em outra situação alinhada ao objetivo.'),
  ('b734b72a-4086-4e0a-ac41-0ad5a7614795'::uuid, 'A melhora deve ser atribuída à facilidade da segunda questão, sem comparar as tarefas.', false, null::text, 'A dificuldade diferente entre tarefas é uma hipótese possível, não uma conclusão automática. Compare as demandas e as estratégias antes de interpretar o efeito da orientação.'),

  -- Q4: evidence quality. Correct: position 3.
  ('48adc8ac-5542-434d-b4f6-7d6c80f5d64b'::uuid, 'Somente a nota final do último exercício.', false, null::text, 'A nota não revela qual etapa gerou o erro nem a estratégia usada. Produções e justificativas ajudam a localizar a dificuldade que precisa de intervenção.'),
  ('be4c4c34-bceb-457d-84b4-ddd2e3982588'::uuid, 'A frequência e o número de atividades entregues, sem examinar as respostas.', false, null::text, 'Esses registros mostram participação e entrega, não necessariamente compreensão do procedimento. A análise precisa incluir evidências do que foi produzido ou explicado.'),
  ('37e9bdef-f07d-4a13-9ba5-5a0213a7acb7'::uuid, 'Produções, estratégias registradas, tipos de erro e desempenho em situações alinhadas ao objetivo.', true, 'Essas evidências permitem localizar a etapa em que ocorre a dificuldade e relacionar o erro ao objetivo, em vez de inferir sua causa somente pela nota.', null::text),
  ('51d840cd-551a-4dba-bc7f-3a16945ee9d7'::uuid, 'A opinião do professor sem exemplos de trabalhos ou respostas dos estudantes.', false, null::text, 'A interpretação docente precisa ser sustentada por evidências observáveis. Exemplos de respostas permitem verificar se a hipótese sobre a dificuldade corresponde ao que os estudantes fizeram.'),

  -- Q5: why one grade is incomplete. Correct: position 2.
  ('45f29898-6a07-43eb-966d-d981fc05b6f7'::uuid, 'Porque notas só têm utilidade quando todos realizam exatamente a mesma atividade.', false, null::text, 'Uma nota pode informar desempenho, mas o problema aqui é que ela não descreve, sozinha, o raciocínio e as necessidades de apoio de cada estudante.'),
  ('c5ffbf07-dad3-4712-9eec-c9c7f6c8f44c'::uuid, 'Ela resume o resultado, mas não mostra a estratégia, a compreensão conceitual ou o próximo apoio necessário.', true, 'Estudantes com a mesma nota podem usar estratégias diferentes. Examinar explicações e aplicação em outra situação ajuda a planejar apoios compatíveis com suas necessidades.', null::text),
  ('71006335-8a35-4254-bc1f-1a5ac5b4f304'::uuid, 'Porque toda nota deve ser substituída por uma impressão informal do professor.', false, null::text, 'Acompanhamento não troca um dado limitado por uma impressão sem critério. Ele amplia a análise com evidências pertinentes, critérios claros e interpretação justificada.'),
  ('07855900-d8b8-469f-af3a-2ece9e671336'::uuid, 'Porque comparar estudantes permite inferir diretamente a causa de cada dificuldade.', false, null::text, 'A comparação pode levantar perguntas, mas não prova a causa do erro. É preciso examinar o contexto, as estratégias e as produções da própria pessoa.'),

  -- Q6: decision sequence. Correct: position 1.
  ('a923ddb0-ba89-4718-ad06-fd871228e572'::uuid, 'Comparar justificativas, identificar padrões, formular uma hipótese, testar apoio direcionado e examinar novas respostas.', true, 'A sequência transforma respostas em hipótese de trabalho, testa uma ação coerente com a dificuldade observada e recolhe evidências para mantê-la ou ajustá-la.', null::text),
  ('2fced001-177d-441a-97c9-69c9a9f44d4b'::uuid, 'Repetir a atividade original várias vezes sem definir qual mudança espera observar.', false, null::text, 'Repetição sem um objetivo observável não permite saber se a dificuldade foi superada. Defina o que espera mudar e compare as respostas após a intervenção.'),
  ('5d429bbb-1ebb-4cef-bdfe-03aeb64bfc19'::uuid, 'Concluir que os estudantes não estudaram sem analisar as produções.', false, null::text, 'Atribuir o erro à falta de estudo não explica o raciocínio que levou à resposta. Analise as justificativas e os padrões antes de escolher a intervenção.'),
  ('2a8acc85-2ca9-40e3-b37f-eb65ff9b55a9'::uuid, 'Atribuir uma nota e manter o planejamento independentemente dos resultados.', false, null::text, 'Se os resultados não influenciam o plano, a avaliação não orienta a aprendizagem. O acompanhamento utiliza as evidências para decidir o que retomar ou aprofundar.'),

  -- Q7: data collection vs interpretation. Correct: position 4.
  ('ae7f0a94-7108-4841-b82f-51f6d22f3103'::uuid, 'Contar os erros novamente para produzir um número mais preciso.', false, null::text, 'Contar com precisão melhora a descrição do dado, mas não explica por que o erro ocorreu. A interpretação precisa relacionar respostas e objetivo de aprendizagem.'),
  ('df071cce-3d51-4906-9cea-24ec292893be'::uuid, 'Usar a quantidade de erros para rotular a turma como fraca no assunto.', false, null::text, 'O número de erros não justifica um rótulo permanente. Ele deve orientar investigação sobre o padrão observado e sobre os apoios que podem ajudar a turma.'),
  ('be11fdf2-59e1-40c2-8db7-88ecba30bc5b'::uuid, 'Comparar o número com a turma do ano anterior sem considerar objetivos ou tarefas.', false, null::text, 'Sem comparar objetivos e condições das tarefas, a diferença numérica pode levar a uma conclusão enganosa. Primeiro interprete o que cada atividade exigia.'),
  ('9e7c4ee7-d2bf-4207-a0b6-2d956289f197'::uuid, 'Relacionar as respostas ao objetivo, analisar o erro comum, formular uma hipótese e escolher uma ação verificável.', true, 'O dado se torna útil quando a professora explica sua relação com o objetivo e o transforma em hipótese de intervenção que possa ser conferida por novas evidências.', null::text),

  -- Q8: continuous adjustment. Correct: position 3.
  ('d71cf264-66ca-4d1c-be20-5d92896bf099'::uuid, 'Reaplicar a mesma explicação e presumir que todos avançaram.', false, null::text, 'Repetir a explicação não demonstra que a compreensão mudou. Compare as justificativas posteriores com as anteriores antes de considerar a retomada eficaz.'),
  ('4be99585-87c4-4869-93b1-1d88e59aef34'::uuid, 'Considerar que a frequência às aulas demonstra aprendizagem.', false, null::text, 'A presença não mostra se o estudante consegue justificar uma inferência. É necessário examinar respostas e estratégias relacionadas ao objetivo de leitura.'),
  ('ac0a333a-bfc0-4070-b084-6edc6c43b5a2'::uuid, 'Comparar novas justificativas com as anteriores e ajustar a intervenção conforme a mudança observada.', true, 'Comparar produções mostra se os estudantes passaram a justificar inferências com evidências. Os resultados indicam se a retomada funcionou ou precisa ser ajustada.', null::text),
  ('1a22621c-61d1-4ce9-8301-3cc6bd52ba3d'::uuid, 'Esperar a prova final para descobrir se a retomada funcionou.', false, null::text, 'Esperar até a avaliação final reduz as oportunidades de corrigir o percurso durante o ensino. O acompanhamento contínuo recolhe evidências que permitem ajustar a ação em tempo útil.'),

  -- Q9: mixed progress. Correct: position 1.
  ('80048ff0-f20f-44ad-ac16-d6b129b495c2'::uuid, 'Interpretar resultados por objetivo e por estudante, manter o que funcionou e ajustar o apoio onde a dificuldade persiste.', true, 'Os resultados diferentes pedem uma leitura diferenciada: conservar os apoios que ajudaram e replanejar para quem ainda apresenta a dificuldade, em vez de generalizar a média.', null::text),
  ('2347e373-f53d-4d7e-a159-13b63e195ff2'::uuid, 'Concluir que a atividade funcionou para todos porque houve melhora geral.', false, null::text, 'A melhora média não mostra que todos avançaram. Verifique os percursos individuais para identificar quem ainda precisa de outra forma de apoio.'),
  ('e3c5920c-891b-44e6-90c9-f54fd3f5b2f1'::uuid, 'Repetir a mesma intervenção para todos sem examinar quem ainda precisa de apoio.', false, null::text, 'Uma estratégia que ajudou alguns estudantes pode não atender a todos. Analise as evidências de quem mantém a dificuldade e ajuste a intervenção.'),
  ('2aa8a009-cccd-4bf4-8376-016f2e30321f'::uuid, 'Tratar a dificuldade persistente como falta de capacidade e encerrar o acompanhamento.', false, null::text, 'Uma dificuldade persistente é evidência para investigar e replanejar, não prova de incapacidade. O acompanhamento orienta próximos apoios sem rotular o estudante.'),

  -- Q10: applied evaluation of an intervention. Correct: position 4.
  ('55d4ad94-3b77-4b8b-a688-fe345d251228'::uuid, 'Registrar somente presença e entrega de atividades depois da intervenção.', false, null::text, 'Presença e entrega mostram participação, mas não revelam se a justificativa melhorou. Recolha produções relacionadas ao critério que a intervenção pretendia desenvolver.'),
  ('68462711-faa1-4c31-b7cf-cdb9594b867a'::uuid, 'Comparar as notas finais sem conservar as respostas nem os critérios utilizados.', false, null::text, 'Sem preservar respostas e critérios, a equipe não consegue identificar qual aspecto da justificativa mudou. O resultado numérico precisa ser acompanhado por evidências do trabalho.'),
  ('fb9b6174-bf79-4e99-9ab8-180cf5ac8a79'::uuid, 'Perguntar se os estudantes gostaram das atividades e usar apenas a satisfação como resultado.', false, null::text, 'A satisfação pode informar a experiência, mas não demonstra que os estudantes passaram a justificar suas escolhas. Compare produções com o critério de aprendizagem.'),
  ('6351bee4-d083-4276-aff8-f03729f2c58d'::uuid, 'Definir critério de justificativa, guardar produções antes e depois, analisar mudanças e replanejar para dificuldades persistentes.', true, 'O plano estabelece um critério observável, compara evidências antes e depois e usa os resultados para decidir se mantém o apoio ou replaneja o ensino.', null::text)
)
update public.exercise_options o
set content = r.option_text,
    is_correct = r.is_correct,
    feedback_correct = r.feedback_correct,
    feedback_incorrect = r.feedback_incorrect
from revised_options r
where o.id = r.option_id
  and o.question_id in (
    '251d9c7d-3734-4945-bbff-4d46800cf337',
    '25b653ca-85ee-4ed4-9088-feb4dd187954',
    '9471ae18-c934-444f-b999-e927454d12f4',
    '7606877a-b629-4efe-bc4b-bb769eef3b30',
    '3614c811-fd6c-43c7-89dc-5d9b7db44d97',
    '2b40af70-eefe-4f92-9c94-d669fc9eef70',
    '2782c3d7-15bd-4423-9a7e-04e2320d027a',
    'ba20de26-4bea-450a-819c-e0541270590a',
    '93fce152-7fcc-4bb0-ae42-852780d13f0d',
    '96725b5e-613d-4085-88ce-a48723676562'
  );

do $postflight$
declare
  v_exercise_id constant uuid := 'ee8cf24b-8087-4b2c-9764-a41153af3b25';
begin
  if exists (
    select q.id
    from public.exercise_questions q
    join public.exercise_options o on o.question_id = q.id
    where q.exercise_id = v_exercise_id
    group by q.id
    having count(o.id) <> 4
        or count(distinct lower(trim(o.content))) <> 4
        or count(o.id) filter (where o.is_correct) <> 1
        or count(o.id) filter (
          where o.is_correct and length(trim(coalesce(o.feedback_correct, ''))) < 40
        ) <> 1
        or count(o.id) filter (
          where not o.is_correct and length(trim(coalesce(o.feedback_incorrect, ''))) < 40
        ) <> 3
  ) then
    raise exception 'BATCH_ABORTED: post-update option, answer-key or active-feedback validation failed';
  end if;

  if (
    select count(distinct o.position)
    from public.exercise_questions q
    join public.exercise_options o on o.question_id = q.id
    where q.exercise_id = v_exercise_id and o.is_correct
  ) <> 4 then
    raise exception 'BATCH_ABORTED: correct answer positions were not distributed across all four positions';
  end if;

  if exists (
    select 1
    from public.exercise_questions q
    where q.exercise_id = v_exercise_id
      and q.question_text ~* '^(qual afirmação melhor apresenta o conceito central de|qual conclusão pode ser sustentada a partir do material sobre|qual interpretação evita uma simplificação de|qual exemplo está mais próximo do que foi estudado em|qual alternativa diferencia adequadamente conceitos ligados a|qual resposta demonstra domínio aplicado de|qual situação melhor indica domínio de|qual alternativa demonstra compreensão de|qual situação demonstra aplicação adequada de|qual decisão pedagógica se relaciona melhor a|qual evidência ajuda a analisar|qual atitude evita simplificar|ao estudar .* qual procedimento favorece uma análise adequada)'
  ) then
    raise exception 'BATCH_ABORTED: generic question stem survived the edit';
  end if;

  if (select published from public.exercises where id = v_exercise_id) is distinct from false then
    raise exception 'BATCH_ABORTED: evaluation was unexpectedly published';
  end if;
end
$postflight$;
