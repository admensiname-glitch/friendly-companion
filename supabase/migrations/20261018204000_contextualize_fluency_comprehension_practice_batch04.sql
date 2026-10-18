-- Contextualize four generic questions in the unpublished fluency/comprehension practice exercise.
-- The existing question about speed and comprehension is preserved; this batch focuses on Q1, Q2, Q4, Q5.
-- All revised content is based on the published material for the same topic and remains unpublished.

do $preflight$
declare
  v_exercise_id constant uuid := 'a285aa8e-470f-454d-a4ba-0e887a79464c';
begin
  if not exists (
    select 1 from public.exercises
    where id = v_exercise_id
      and title = 'Prática — Fluência e compreensão leitora'
      and published = false
  ) then
    raise exception 'BATCH_ABORTED: practice exercise is missing, renamed or no longer a draft';
  end if;

  if exists (
    select expected.question_id
    from (values
      ('639621e1-6021-4482-8635-4e471fd39a3b'::uuid, '494865f6-d5ed-4ee9-ae2a-562bd558ac0e'::uuid),
      ('bba4dfae-1bea-47d8-b0ee-f57b48f3eede'::uuid, '3f4e1deb-17e8-4369-bfe0-1f28bf1eb076'::uuid),
      ('f7da12dc-db64-495f-806d-2decc7adf2e2'::uuid, 'ba79db87-37b2-4c1b-a66f-1945b6b7d790'::uuid),
      ('a351c833-6520-4759-a8a0-ed972c841748'::uuid, 'ebaa4666-3b56-4d4e-9cb5-d69971135cb2'::uuid)
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
    raise exception 'BATCH_ABORTED: practice structure or prior answer keys differ from the audited snapshot';
  end if;
end
$preflight$;

insert into private.exercise_quality_feedback_backups_20261018 (
  batch_id, exercise_id, question_id, option_id,
  prior_question_text, prior_feedback_hint, prior_option_content,
  prior_is_correct, prior_feedback_correct, prior_feedback_incorrect
)
select
  '2026-10-18-fluency-practice-batch-04',
  e.id, q.id, o.id,
  q.question_text, q.feedback_hint, o.content,
  o.is_correct, o.feedback_correct, o.feedback_incorrect
from public.exercises e
join public.exercise_questions q on q.exercise_id = e.id
join public.exercise_options o on o.question_id = q.id
where e.id = 'a285aa8e-470f-454d-a4ba-0e887a79464c'
  and q.id in (
    '639621e1-6021-4482-8635-4e471fd39a3b',
    'bba4dfae-1bea-47d8-b0ee-f57b48f3eede',
    'f7da12dc-db64-495f-806d-2decc7adf2e2',
    'a351c833-6520-4759-a8a0-ed972c841748'
  )
on conflict (batch_id, option_id) do nothing;

do $backup_check$
begin
  if (
    select count(*)
    from private.exercise_quality_feedback_backups_20261018
    where batch_id = '2026-10-18-fluency-practice-batch-04'
      and exercise_id = 'a285aa8e-470f-454d-a4ba-0e887a79464c'
  ) <> 16 then
    raise exception 'BATCH_ABORTED: expected a 16-option backup before editing';
  end if;
end
$backup_check$;

update public.exercise_questions
set question_text = case id
  when '639621e1-6021-4482-8635-4e471fd39a3b'
    then 'Durante a leitura de um conto, uma criança lê as palavras com precisão e entonação adequada, mas não explica a ideia principal nem o motivo das ações da personagem. Qual deve ser o próximo passo do pedagogo?'
  when 'bba4dfae-1bea-47d8-b0ee-f57b48f3eede'
    then 'Na leitura oral, um estudante confunde palavras com grafias parecidas e faz pausas frequentes. Quando a professora lê o mesmo trecho em voz alta, ele responde corretamente às perguntas de sentido. Que apoio inicial é mais coerente com essas evidências?'
  when 'f7da12dc-db64-495f-806d-2decc7adf2e2'
    then 'Uma triagem indica baixa taxa de leitura oral. Antes de definir o apoio, como a professora deve interpretar esse resultado?'
  when 'a351c833-6520-4759-a8a0-ed972c841748'
    then 'Uma aluna participa melhor da leitura quando o texto é compartilhado, há apoio visual e ela dispõe de mais tempo. Como a professora pode avaliar esses apoios sem abandonar o objetivo de compreensão leitora?'
  else question_text
end,
feedback_hint = case id
  when '639621e1-6021-4482-8635-4e471fd39a3b'
    then 'Fluência e compreensão se relacionam, mas não são equivalentes. Peça uma explicação e evidências do texto para localizar a dificuldade.'
  when 'bba4dfae-1bea-47d8-b0ee-f57b48f3eede'
    then 'O desempenho em leitura independente e na leitura ouvida sugere observar o reconhecimento de palavras e os tipos de erro antes de planejar a prática.'
  when 'f7da12dc-db64-495f-806d-2decc7adf2e2'
    then 'Taxas dependem de série, instrumento, texto e condições. Uma triagem sinaliza necessidade de investigação, não funciona como diagnóstico isolado.'
  when 'a351c833-6520-4759-a8a0-ed972c841748'
    then 'Apoios devem ampliar acesso e participação sem substituir a habilidade-alvo. Recolha evidências de compreensão com o apoio e ajuste segundo a resposta da estudante.'
  else feedback_hint
end,
updated_at = now()
where id in (
  '639621e1-6021-4482-8635-4e471fd39a3b',
  'bba4dfae-1bea-47d8-b0ee-f57b48f3eede',
  'f7da12dc-db64-495f-806d-2decc7adf2e2',
  'a351c833-6520-4759-a8a0-ed972c841748'
);

with revised_options (
  option_id, question_id, option_text, is_correct, feedback_correct, feedback_incorrect
) as (
  values
  -- Q1: assess comprehension instead of assuming that fluent reading proves it. Correct: position 3.
  ('f2849f83-6120-4cf1-8e12-daad7583c2bb'::uuid, '639621e1-6021-4482-8635-4e471fd39a3b'::uuid, 'Concluir que a criança compreendeu o conto porque leu com precisão e entonação.', false, null::text, 'Precisão e prosódia são componentes da fluência, mas não mostram sozinhas se a criança entendeu relações e motivos. Peça que reconte e justifique com pistas textuais.'),
  ('494865f6-d5ed-4ee9-ae2a-562bd558ac0e'::uuid, '639621e1-6021-4482-8635-4e471fd39a3b'::uuid, 'Aumentar a velocidade da leitura antes de investigar o que a criança compreendeu.', false, null::text, 'Aumentar a velocidade não responde à dificuldade de explicar o texto. Verifique vocabulário, ideia principal e inferências antes de escolher a intervenção.'),
  ('6f15e43c-e9c5-4d71-97da-079f0d864150'::uuid, '639621e1-6021-4482-8635-4e471fd39a3b'::uuid, 'Pedir que reconte a ideia principal e explique as ações com pistas do texto; investigar vocabulário e inferências se necessário.', true, 'A leitura fluente não garante compreensão. O reconto e a justificativa com pistas textuais permitem verificar a construção de sentido e localizar o apoio necessário.', null::text),
  ('635edb01-1d6b-4566-9ec2-ebde85307eea'::uuid, '639621e1-6021-4482-8635-4e471fd39a3b'::uuid, 'Trocar imediatamente por um texto mais simples sem observar onde a compreensão se rompe.', false, null::text, 'Simplificar sem identificar a barreira pode retirar desafio sem esclarecer a dificuldade. Examine vocabulário, relações textuais e inferências antes de ajustar o material.'),

  -- Q2: distinguish a decoding need from comprehension while listening. Correct: position 1.
  ('e1c031b8-e133-4071-a554-6d202f69aedc'::uuid, 'bba4dfae-1bea-47d8-b0ee-f57b48f3eede'::uuid, 'Registrar os tipos de erro, modelar relações entre grafias e sons e oferecer prática guiada, verificando depois uma nova leitura.', true, 'A diferença entre leitura independente e compreensão após ouvir o texto indica que o reconhecimento de palavras merece atenção. Uma prática explícita e nova observação permitem verificar o avanço.', null::text),
  ('3f4e1deb-17e8-4369-bfe0-1f28bf1eb076'::uuid, 'bba4dfae-1bea-47d8-b0ee-f57b48f3eede'::uuid, 'Trabalhar apenas inferências complexas, sem observar os erros de reconhecimento de palavras.', false, null::text, 'As inferências importam, mas o estudante já responde sobre o sentido quando ouve o texto. Primeiro investigue os erros de reconhecimento de palavras que dificultam sua leitura independente.'),
  ('8c760703-c45c-491d-abd2-e5497de4cf03'::uuid, 'bba4dfae-1bea-47d8-b0ee-f57b48f3eede'::uuid, 'Cronometrar novas leituras e comparar apenas palavras por minuto.', false, null::text, 'A taxa isolada não informa quais palavras geram erro. Registre precisão e tipos de erro e ofereça apoio de decodificação antes de interpretar mudanças de ritmo.'),
  ('1c0ec259-4085-4dcf-bdcc-ba477ac461a6'::uuid, 'bba4dfae-1bea-47d8-b0ee-f57b48f3eede'::uuid, 'Concluir que o estudante não presta atenção e encerrar a observação.', false, null::text, 'Atribuir a causa à atenção sem examinar as respostas é uma conclusão sem evidência. Compare os erros e as condições de leitura para decidir qual apoio é necessário.'),

  -- Q4: responsible interpretation of a low fluency screening score. Correct: position 4.
  ('7c44f48f-81a7-4140-a26f-8f4d93af8c1a'::uuid, 'f7da12dc-db64-495f-806d-2decc7adf2e2'::uuid, 'Diagnosticar automaticamente um transtorno de leitura com base na taxa registrada.', false, null::text, 'Uma taxa de triagem não confirma um diagnóstico. Considere série, instrumento, texto, condições da tarefa e outras evidências antes de decidir a avaliação necessária.'),
  ('ba79db87-37b2-4c1b-a66f-1945b6b7d790'::uuid, 'f7da12dc-db64-495f-806d-2decc7adf2e2'::uuid, 'Aplicar o mesmo ponto de corte a todas as séries, textos e populações.', false, null::text, 'Os resultados dependem da série, do instrumento e do texto. Um limite universal pode gerar conclusões inadequadas sobre a necessidade individual de apoio.'),
  ('10fb4b62-21d2-4cac-be1c-b290c518cb1a'::uuid, 'f7da12dc-db64-495f-806d-2decc7adf2e2'::uuid, 'Retirar textos ricos e usar somente materiais simples a partir do primeiro resultado.', false, null::text, 'Uma triagem isolada não justifica restringir oportunidades de leitura. Use o resultado como sinal para investigar a dificuldade e escolher apoio proporcional às evidências.'),
  ('b6bd5bd4-b7ad-4d6b-90ef-abc3fa4afb3e'::uuid, 'f7da12dc-db64-495f-806d-2decc7adf2e2'::uuid, 'Analisar série, instrumento, texto e condições e combinar a triagem com evidências de precisão, prosódia e compreensão.', true, 'O resultado ajuda a identificar quem pode precisar de avaliação adicional; a interpretação responsável o combina com as condições da tarefa e outras evidências, sem tratá-lo como diagnóstico.', null::text),

  -- Q5: accessibility supports should widen access without removing the target skill. Correct: position 2.
  ('f7fdcc00-edf3-40ab-a37a-8135861e7d73'::uuid, 'a351c833-6520-4759-a8a0-ed972c841748'::uuid, 'Retirar os apoios para garantir que todos recebam exatamente as mesmas condições.', false, null::text, 'Condições idênticas não garantem acesso equivalente. Verifique se os apoios permitem que a estudante trabalhe a habilidade-alvo e demonstre o que compreendeu.'),
  ('ebaa4666-3b56-4d4e-9cb5-d69971135cb2'::uuid, 'a351c833-6520-4759-a8a0-ed972c841748'::uuid, 'Manter o objetivo de leitura, ajustar o acesso e comparar evidências de compreensão para verificar se o apoio ajuda.', true, 'O apoio deve ampliar a participação sem substituir o objetivo. Observar reconto, justificativas e pistas textuais mostra se o recurso favorece compreensão e se precisa de ajuste.', null::text),
  ('f0601330-673a-46b6-be65-a72c36aeb694'::uuid, 'a351c833-6520-4759-a8a0-ed972c841748'::uuid, 'Presumir que o apoio funciona para todos sem observar a resposta de cada estudante.', false, null::text, 'A utilidade do apoio precisa ser observada, não presumida. Compare como a estudante participa e compreende com o recurso e ajuste conforme a evidência.'),
  ('82a73bda-234b-44cd-8959-450565ecb453'::uuid, 'a351c833-6520-4759-a8a0-ed972c841748'::uuid, 'Substituir textos ricos por imagens sem texto para evitar qualquer desafio de leitura.', false, null::text, 'O apoio não deve retirar a oportunidade de trabalhar com textos ricos e a habilidade-alvo. Ajuste acesso e tempo, e verifique se isso facilita a compreensão.')
)
update public.exercise_options o
set content = r.option_text,
    is_correct = r.is_correct,
    feedback_correct = r.feedback_correct,
    feedback_incorrect = r.feedback_incorrect
from revised_options r
where o.id = r.option_id
  and o.question_id = r.question_id;

do $postflight$
declare
  v_exercise_id constant uuid := 'a285aa8e-470f-454d-a4ba-0e887a79464c';
begin
  if exists (
    select q.id
    from public.exercise_questions q
    join public.exercise_options o on o.question_id = q.id
    where q.exercise_id = v_exercise_id
      and q.id in (
        '639621e1-6021-4482-8635-4e471fd39a3b',
        'bba4dfae-1bea-47d8-b0ee-f57b48f3eede',
        'f7da12dc-db64-495f-806d-2decc7adf2e2',
        'a351c833-6520-4759-a8a0-ed972c841748'
      )
    group by q.id
    having count(o.id) <> 4
        or count(distinct lower(trim(o.content))) <> 4
        or count(o.id) filter (where o.is_correct) <> 1
        or count(o.id) filter (
          where o.is_correct and length(trim(coalesce(o.feedback_correct, ''))) < 40
        ) <> 0
        or count(o.id) filter (
          where not o.is_correct and length(trim(coalesce(o.feedback_incorrect, ''))) < 40
        ) <> 0
  ) then
    raise exception 'BATCH_ABORTED: post-update option, answer-key or active-feedback validation failed';
  end if;

  if (
    select count(distinct o.position)
    from public.exercise_questions q
    join public.exercise_options o on o.question_id = q.id
    where q.exercise_id = v_exercise_id
      and q.id in (
        '639621e1-6021-4482-8635-4e471fd39a3b',
        'bba4dfae-1bea-47d8-b0ee-f57b48f3eede',
        'f7da12dc-db64-495f-806d-2decc7adf2e2',
        'a351c833-6520-4759-a8a0-ed972c841748'
      )
      and o.is_correct
  ) <> 4 then
    raise exception 'BATCH_ABORTED: correct answer positions were not distributed across all four positions';
  end if;

  if exists (
    select 1 from public.exercise_questions q
    where q.exercise_id = v_exercise_id
      and q.id in (
        '639621e1-6021-4482-8635-4e471fd39a3b',
        'bba4dfae-1bea-47d8-b0ee-f57b48f3eede',
        'f7da12dc-db64-495f-806d-2decc7adf2e2',
        'a351c833-6520-4759-a8a0-ed972c841748'
      )
      and q.feedback_hint ilike 'Compare sua resposta com o conceito central%'
  ) then
    raise exception 'BATCH_ABORTED: generic feedback hint survived the edit';
  end if;

  if (select published from public.exercises where id = v_exercise_id) is distinct from false then
    raise exception 'BATCH_ABORTED: practice exercise was unexpectedly published';
  end if;
end
$postflight$;
