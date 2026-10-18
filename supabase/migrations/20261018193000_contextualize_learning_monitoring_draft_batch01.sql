-- Contextualize one unpublished exercise batch about learning monitoring.
-- Scope: exercise 9f6538a7-4825-4ee4-9520-af9290468770 only.
-- Published materials/exercises and answer keys are not modified.
-- Prior question/option content is retained in a private backup table for rollback.

create table if not exists private.exercise_quality_feedback_backups_20261018 (
  batch_id text not null,
  exercise_id uuid not null,
  question_id uuid not null,
  option_id uuid not null,
  prior_question_text text not null,
  prior_feedback_hint text,
  prior_option_content text not null,
  prior_is_correct boolean not null,
  prior_feedback_correct text,
  prior_feedback_incorrect text,
  captured_at timestamptz not null default now(),
  primary key (batch_id, option_id)
);

do $batch$
declare
  v_exercise_id constant uuid := '9f6538a7-4825-4ee4-9520-af9290468770';
  v_batch_id constant text := '2026-10-18-learning-monitoring-batch-01';
begin
  if not exists (
    select 1 from public.exercises
    where id = v_exercise_id
      and title = 'Prática — Acompanhamento da aprendizagem'
      and published = false
  ) then
    raise exception 'BATCH_ABORTED: exercise missing, renamed or no longer a draft';
  end if;

  if exists (
    select expected.question_id
    from (values
      ('e31f8017-e11d-473e-9643-494cac7b6e1b'::uuid, '9cf522ac-3748-439e-93fd-e49c22c9a53c'::uuid),
      ('896a7c9d-acf1-44fb-9bea-e6ef196463cc'::uuid, 'dd7dcbdc-a2ad-47ed-b566-1eda79da3ba8'::uuid),
      ('cb6a2587-12e3-4a65-8ff0-70385a050db3'::uuid, 'd8b9e7e7-438c-47ab-95bd-3d1cbc2c94e8'::uuid),
      ('41d4b706-f588-4669-a3bf-eb189d4fd0ef'::uuid, '3965d792-fcb1-4271-813b-d5b634573686'::uuid)
    ) as expected(question_id, correct_option_id)
    left join public.exercise_questions q
      on q.id = expected.question_id
     and q.exercise_id = v_exercise_id
    left join public.exercise_options o on o.question_id = q.id
    group by expected.question_id, expected.correct_option_id
    having count(o.id) <> 4
        or count(o.id) filter (where o.is_correct) <> 1
        or count(o.id) filter (where o.is_correct and o.id = expected.correct_option_id) <> 1
  ) then
    raise exception 'BATCH_ABORTED: question/option structure or answer key differs from audited snapshot';
  end if;

  insert into private.exercise_quality_feedback_backups_20261018 (
    batch_id, exercise_id, question_id, option_id,
    prior_question_text, prior_feedback_hint, prior_option_content,
    prior_is_correct, prior_feedback_correct, prior_feedback_incorrect
  )
  select
    v_batch_id, v_exercise_id, q.id, o.id,
    q.question_text, q.feedback_hint, o.content,
    o.is_correct, o.feedback_correct, o.feedback_incorrect
  from public.exercise_questions q
  join public.exercise_options o on o.question_id = q.id
  where q.exercise_id = v_exercise_id
    and q.id in (
      'e31f8017-e11d-473e-9643-494cac7b6e1b',
      '896a7c9d-acf1-44fb-9bea-e6ef196463cc',
      'cb6a2587-12e3-4a65-8ff0-70385a050db3',
      '41d4b706-f588-4669-a3bf-eb189d4fd0ef'
    )
  on conflict (batch_id, option_id) do nothing;

  if (
    select count(*)
    from private.exercise_quality_feedback_backups_20261018
    where batch_id = v_batch_id and exercise_id = v_exercise_id
  ) <> 16 then
    raise exception 'BATCH_ABORTED: expected a 16-option backup before editing';
  end if;

  -- Question 1: preserve its mathematics scenario; make each distractor's feedback distinct.
  update public.exercise_options
  set feedback_correct = case
        when id = '9cf522ac-3748-439e-93fd-e49c22c9a53c'
          then 'Pedir a explicação e uma estratégia alternativa revela se o estudante compreendeu o procedimento, além de apenas reproduzi-lo.'
        else null
      end,
      feedback_incorrect = case
        when id = '3d279fba-e11e-4de9-a2c0-d22bdc2f8fe5'
          then 'Um resultado correto pode vir de memorização e, sozinho, não demonstra compreensão. Examine a justificativa antes de concluir que o objetivo foi alcançado.'
        when id = 'eaf0503a-fb85-4bda-b5d1-86e4a50436e2'
          then 'Repetir itens idênticos pode reforçar a execução memorizada, mas não mostra se o estudante entende por que o procedimento funciona. Peça justificativa ou outra representação.'
        when id = 'ad70ca5f-8532-48de-bf9d-6ce10c79334d'
          then 'Não explicar uma estratégia não prova incapacidade. Investigue a dificuldade e o apoio necessário, sem transformar uma evidência pontual em rótulo.'
        else null
      end
  where id in (
    '3d279fba-e11e-4de9-a2c0-d22bdc2f8fe5',
    '9cf522ac-3748-439e-93fd-e49c22c9a53c',
    'eaf0503a-fb85-4bda-b5d1-86e4a50436e2',
    'ad70ca5f-8532-48de-bf9d-6ce10c79334d'
  );

  -- Question 2: replace a template-like item with a scenario about evaluating students' reasoning.
  update public.exercise_questions
  set question_text = 'Ao corrigir uma atividade, a professora nota que vários estudantes chegam à resposta final correta, mas apresentam justificativas incompatíveis entre si. Qual ação gera evidências mais úteis para decidir o que retomar?',
      feedback_hint = 'Compare as justificativas com o objetivo de aprendizagem; procure padrões de raciocínio e erros antes de escolher uma intervenção.',
      updated_at = now()
  where id = '896a7c9d-acf1-44fb-9bea-e6ef196463cc'
    and exercise_id = v_exercise_id;

  update public.exercise_options
  set content = case id
        when '824b113a-e66a-4dea-bb73-b43bbc0db001' then 'Registrar apenas a resposta final e avançar para o próximo conteúdo.'
        when 'dd7dcbdc-a2ad-47ed-b566-1eda79da3ba8' then 'Comparar as justificativas com o objetivo, identificar raciocínios e erros recorrentes e planejar uma retomada dirigida.'
        when '6868e1c7-4c46-43b7-b5cd-dc9420e3bc6e' then 'Pedir aos colegas que votem na justificativa que parece mais convincente.'
        when '31d39ba9-7ed1-4cff-ba4f-8d53e30b2299' then 'Reapresentar a mesma explicação sem examinar as produções dos estudantes.'
        else content
      end,
      feedback_correct = case
        when id = 'dd7dcbdc-a2ad-47ed-b566-1eda79da3ba8'
          then 'Comparar justificativas com o objetivo de aprendizagem revela padrões de raciocínio e ajuda a planejar uma retomada voltada à dificuldade que as produções mostram.'
        else null
      end,
      feedback_incorrect = case id
        when '824b113a-e66a-4dea-bb73-b43bbc0db001'
          then 'A resposta final não mostra como o estudante raciocinou. Sem examinar a justificativa, não é possível distinguir compreensão, procedimento memorizado e erro conceitual.'
        when '6868e1c7-4c46-43b7-b5cd-dc9420e3bc6e'
          then 'Uma votação indica preferência, não validade conceitual. A decisão pedagógica deve se apoiar nas justificativas dos estudantes e em critérios alinhados ao objetivo.'
        when '31d39ba9-7ed1-4cff-ba4f-8d53e30b2299'
          then 'Repetir a explicação sem analisar as produções ignora evidências sobre o que não foi compreendido e pode manter a mesma dificuldade.'
        else null
      end
  where id in (
    '824b113a-e66a-4dea-bb73-b43bbc0db001',
    'dd7dcbdc-a2ad-47ed-b566-1eda79da3ba8',
    '6868e1c7-4c46-43b7-b5cd-dc9420e3bc6e',
    '31d39ba9-7ed1-4cff-ba4f-8d53e30b2299'
  );

  -- Question 4: require evidence, a testable hypothesis and a follow-up observation.
  update public.exercise_questions
  set question_text = 'Depois de três atividades, a professora identifica erros recorrentes na interpretação de problemas. Qual próximo passo caracteriza acompanhamento da aprendizagem?',
      feedback_hint = 'O acompanhamento liga evidência, hipótese, intervenção e análise de novas produções; registrar uma nota não explica a origem de um erro recorrente.',
      updated_at = now()
  where id = 'cb6a2587-12e3-4a65-8ff0-70385a050db3'
    and exercise_id = v_exercise_id;

  update public.exercise_options
  set content = case id
        when '0a5188d2-f92d-4ee3-9295-03e9cee751e0' then 'Atribuir uma nota baixa e encerrar o registro do tópico.'
        when 'd8b9e7e7-438c-47ab-95bd-3d1cbc2c94e8' then 'Agrupar as respostas, formular uma hipótese sobre a dificuldade, testar uma intervenção e comparar novas produções.'
        when '5bfb441d-d979-47c6-9e25-ae029a479455' then 'Concluir que os estudantes não se esforçaram sem examinar suas estratégias.'
        when 'fb158887-c128-4aeb-b924-0ed0d994b192' then 'Aplicar novamente a mesma lista sem definir o que observará nos resultados.'
        else content
      end,
      feedback_correct = case
        when id = 'd8b9e7e7-438c-47ab-95bd-3d1cbc2c94e8'
          then 'Agrupar as respostas ajuda a localizar um padrão; testar uma intervenção e comparar novas produções mostra se a mudança enfrentou a dificuldade observada.'
        else null
      end,
      feedback_incorrect = case id
        when '0a5188d2-f92d-4ee3-9295-03e9cee751e0'
          then 'A nota resume um resultado, mas não explica por que o erro se repete. Registre o padrão observado para decidir qual aspecto precisa ser retomado.'
        when '5bfb441d-d979-47c6-9e25-ae029a479455'
          then 'Atribuir a dificuldade à falta de esforço é uma hipótese sem evidência. Analise respostas e estratégias antes de decidir o que intervir.'
        when 'fb158887-c128-4aeb-b924-0ed0d994b192'
          then 'Repetir a lista sem definir o que observar não testa uma hipótese. Estabeleça o objetivo e compare as estratégias antes e depois da retomada.'
        else null
      end
  where id in (
    '0a5188d2-f92d-4ee3-9295-03e9cee751e0',
    'd8b9e7e7-438c-47ab-95bd-3d1cbc2c94e8',
    '5bfb441d-d979-47c6-9e25-ae029a479455',
    'fb158887-c128-4aeb-b924-0ed0d994b192'
  );

  -- Question 5: assess evidence before and after an intervention, not generic mastery language.
  update public.exercise_questions
  set question_text = 'Uma turma apresenta dificuldade recorrente ao justificar soluções de problemas matemáticos. Qual registro permite avaliar se uma intervenção pedagógica ajudou?',
      feedback_hint = 'Compare evidências antes e depois da intervenção: estratégia usada, dificuldade observada, apoio realizado e qualidade de uma nova solução.',
      updated_at = now()
  where id = '41d4b706-f588-4669-a3bf-eb189d4fd0ef'
    and exercise_id = v_exercise_id;

  update public.exercise_options
  set content = case id
        when 'e1a8dcb5-c93e-411c-afb1-38329ae328e4' then 'Apenas a nota final de cada estudante, sem conservar as estratégias usadas.'
        when '3965d792-fcb1-4271-813b-d5b634573686' then 'A estratégia inicial, a dificuldade observada, o apoio oferecido e a qualidade de uma nova solução após a intervenção.'
        when 'c8dbe09f-5d34-46ab-8abb-2ed4917e58ec' then 'A frequência e a entrega das tarefas, tratadas como prova suficiente de aprendizagem.'
        when 'cff2653c-e4c5-44d7-826b-03bc059d8d73' then 'A opinião geral da turma sobre a aula, sem comparar produções antes e depois.'
        else content
      end,
      feedback_correct = case
        when id = '3965d792-fcb1-4271-813b-d5b634573686'
          then 'Registrar a estratégia inicial, a dificuldade, o apoio aplicado e uma nova solução permite comparar evidências e verificar mudanças após a intervenção.'
        else null
      end,
      feedback_incorrect = case id
        when 'e1a8dcb5-c93e-411c-afb1-38329ae328e4'
          then 'A nota final não preserva a estratégia usada nem indica qual dificuldade persistiu; sozinha, não permite avaliar o efeito da intervenção.'
        when 'c8dbe09f-5d34-46ab-8abb-2ed4917e58ec'
          then 'Frequência e entrega mostram participação, não compreensão. Para avaliar a intervenção, compare respostas e estratégias com o objetivo de aprendizagem.'
        when 'cff2653c-e4c5-44d7-826b-03bc059d8d73'
          then 'A opinião sobre a aula pode orientar melhorias, mas não demonstra mudança na aprendizagem. Compare produções anteriores e posteriores à intervenção.'
        else null
      end
  where id in (
    'e1a8dcb5-c93e-411c-afb1-38329ae328e4',
    '3965d792-fcb1-4271-813b-d5b634573686',
    'c8dbe09f-5d34-46ab-8abb-2ed4917e58ec',
    'cff2653c-e4c5-44d7-826b-03bc059d8d73'
  );

  -- Verify only the selected unpublished exercise was touched and each edited question
  -- still has exactly four distinct options and exactly one correct answer.
  if exists (
    select q.id
    from public.exercise_questions q
    join public.exercise_options o on o.question_id = q.id
    where q.id in (
      'e31f8017-e11d-473e-9643-494cac7b6e1b',
      '896a7c9d-acf1-44fb-9bea-e6ef196463cc',
      'cb6a2587-12e3-4a65-8ff0-70385a050db3',
      '41d4b706-f588-4669-a3bf-eb189d4fd0ef'
    )
    group by q.id
    having count(o.id) <> 4
        or count(distinct lower(trim(o.content))) <> 4
        or count(o.id) filter (where o.is_correct) <> 1
  ) then
    raise exception 'BATCH_ABORTED: post-update question structure validation failed';
  end if;

  if exists (
    select 1
    from public.exercise_questions q
    join public.exercise_options o on o.question_id = q.id
    where q.id in (
      'e31f8017-e11d-473e-9643-494cac7b6e1b',
      '896a7c9d-acf1-44fb-9bea-e6ef196463cc',
      'cb6a2587-12e3-4a65-8ff0-70385a050db3',
      '41d4b706-f588-4669-a3bf-eb189d4fd0ef'
    )
      and (
        (o.is_correct and length(trim(coalesce(o.feedback_correct, ''))) < 40)
        or (not o.is_correct and length(trim(coalesce(o.feedback_incorrect, ''))) < 40)
      )
  ) then
    raise exception 'BATCH_ABORTED: active feedback missing or too short after update';
  end if;

  if (select published from public.exercises where id = v_exercise_id) is distinct from false then
    raise exception 'BATCH_ABORTED: exercise was unexpectedly published';
  end if;
end
$batch$;
