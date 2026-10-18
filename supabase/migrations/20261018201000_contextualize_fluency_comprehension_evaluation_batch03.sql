-- Contextualize the ten unpublished evaluation questions for Fluência e compreensão leitora.
-- Uses only concepts established in the already-published topic material.
-- Retains a private, row-level backup and leaves the evaluation unpublished.

do $preflight$
declare
  v_exercise_id constant uuid := '1f1693d8-7931-4dfc-9edc-cc8a31c59729';
begin
  if not exists (
    select 1 from public.exercises
    where id = v_exercise_id
      and title = 'Avaliação do tópico — Fluência e compreensão leitora'
      and published = false
  ) then
    raise exception 'BATCH_ABORTED: evaluation is missing, renamed or no longer a draft';
  end if;

  if exists (
    select expected.question_id
    from (values
      ('d8ffef54-104e-47f7-858e-405c33b7b9f1'::uuid, 'aad0ca01-e11d-4b2a-9ffd-ba85e66d5f6a'::uuid),
      ('811e0140-4bf2-4e27-9ba3-5d9c405a1c69'::uuid, 'efbfaf22-57e2-4c96-bbb7-e47cb7c4c9c2'::uuid),
      ('9cc64c17-01e4-4a1f-93f2-8f47bb3e936d'::uuid, '9eb4399e-55cd-40a1-aea4-459bc21500bc'::uuid),
      ('71f423f6-df3e-46a5-9d97-690b144d7e65'::uuid, '09f10c7a-dd40-4391-8471-cf5ec005d2ac'::uuid),
      ('998e4b75-5270-4959-8b1d-8200029c584b'::uuid, '4a1d27d7-504c-44e6-8b7d-d00c42d9f0d2'::uuid),
      ('e7cee01b-fd25-4d58-80dd-d12ef5e3bc4d'::uuid, '1f2786a2-1fdc-496f-bcfe-56f8eafc9665'::uuid),
      ('1d87bf33-a8f1-46c7-92e6-2621a6bb2c81'::uuid, 'fb17e0c4-f86d-44af-82c8-0ed645aa1734'::uuid),
      ('c97a91db-8fbe-4ba1-92b5-fb2c6cff2a18'::uuid, 'd0be8239-9db8-452d-b261-a4a7e4d1e4b5'::uuid),
      ('5a9ebb3a-bf2d-49da-9876-049c1386b0c4'::uuid, '158699da-fe94-4e93-8b33-ebd99f652e45'::uuid),
      ('e9c67026-e634-45f2-bdce-47d49e90587e'::uuid, '799aff68-a30a-4e74-9867-5bb6f4391b49'::uuid)
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
  '2026-10-18-fluency-evaluation-batch-03',
  e.id, q.id, o.id,
  q.question_text, q.feedback_hint, o.content,
  o.is_correct, o.feedback_correct, o.feedback_incorrect
from public.exercises e
join public.exercise_questions q on q.exercise_id = e.id
join public.exercise_options o on o.question_id = q.id
where e.id = '1f1693d8-7931-4dfc-9edc-cc8a31c59729'
on conflict (batch_id, option_id) do nothing;

do $backup_check$
begin
  if (
    select count(*)
    from private.exercise_quality_feedback_backups_20261018
    where batch_id = '2026-10-18-fluency-evaluation-batch-03'
      and exercise_id = '1f1693d8-7931-4dfc-9edc-cc8a31c59729'
  ) <> 40 then
    raise exception 'BATCH_ABORTED: expected a 40-option backup before editing';
  end if;
end
$backup_check$;

update public.exercise_questions
set question_text = case id
  when 'd8ffef54-104e-47f7-858e-405c33b7b9f1'
    then 'Uma criança lê um parágrafo com precisão e entonação adequada, mas não explica a ideia principal nem infere por que a personagem agiu. Qual interpretação pedagógica é mais adequada?'
  when '811e0140-4bf2-4e27-9ba3-5d9c405a1c69'
    then 'Ao acompanhar a leitura oral, a professora observa erros frequentes no reconhecimento de palavras e pausas longas. Qual apoio inicial corresponde melhor à evidência observada?'
  when '9cc64c17-01e4-4a1f-93f2-8f47bb3e936d'
    then 'Após uma prática orientada de leitura repetida, como a professora pode verificar se houve avanço tanto na fluência quanto na compreensão?'
  when '71f423f6-df3e-46a5-9d97-690b144d7e65'
    then 'Um instrumento cronometrado indica uma taxa de leitura baixa para um estudante. Qual decisão usa esse resultado de forma responsável?'
  when '998e4b75-5270-4959-8b1d-8200029c584b'
    then 'O objetivo da turma é desenvolver leitura oral expressiva e compreensão de texto. Qual prática atende aos dois objetivos sem transformar a atividade em corrida de velocidade?'
  when 'e7cee01b-fd25-4d58-80dd-d12ef5e3bc4d'
    then 'Dois estudantes apresentam dificuldades diferentes: um ainda erra ao reconhecer palavras; o outro lê com precisão, mas não explica o texto. Como planejar o apoio?'
  when '1d87bf33-a8f1-46c7-92e6-2621a6bb2c81'
    then 'Qual afirmação distingue corretamente decodificação, fluência leitora e compreensão?'
  when 'c97a91db-8fbe-4ba1-92b5-fb2c6cff2a18'
    then 'Durante uma sequência de leitura, qual conjunto de estratégias apoia a construção e a verificação do sentido antes, durante e depois da leitura?'
  when '5a9ebb3a-bf2d-49da-9876-049c1386b0c4'
    then 'Um estudante participa melhor quando há leitura compartilhada, apoio visual e tempo adicional. Como verificar se esses apoios estão ajudando sem retirar o objetivo de leitura?'
  when 'e9c67026-e634-45f2-bdce-47d49e90587e'
    then 'Depois de uma intervenção, a precisão da leitura melhora, mas a criança ainda tem dificuldade para explicar inferências. Qual deve ser o próximo passo?'
  else question_text
end,
feedback_hint = case id
  when 'd8ffef54-104e-47f7-858e-405c33b7b9f1'
    then 'Precisão e prosódia são componentes da fluência, enquanto a compreensão exige explicar relações, vocabulário e inferências do texto.'
  when '811e0140-4bf2-4e27-9ba3-5d9c405a1c69'
    then 'O tipo de erro deve orientar o apoio. Observe o reconhecimento de palavras e modele as relações entre grafias e sons antes de escolher a prática.'
  when '9cc64c17-01e4-4a1f-93f2-8f47bb3e936d'
    then 'Compare evidências compatíveis antes e depois da prática: precisão, pausas/prosódia e respostas de compreensão justificadas por pistas textuais.'
  when '71f423f6-df3e-46a5-9d97-690b144d7e65'
    then 'A taxa depende da série, do instrumento e do texto. Use a triagem para orientar uma avaliação mais aprofundada, não como diagnóstico automático.'
  when '998e4b75-5270-4959-8b1d-8200029c584b'
    then 'Combine modelagem e prática guiada com devolutiva sobre precisão e prosódia; depois, converse sobre vocabulário, relações e inferências.'
  when 'e7cee01b-fd25-4d58-80dd-d12ef5e3bc4d'
    then 'Avalie a estratégia e a barreira de cada estudante: dificuldades de reconhecimento de palavras pedem apoio explícito de decodificação; dificuldade de compreensão pode exigir vocabulário e inferências.'
  when '1d87bf33-a8f1-46c7-92e6-2621a6bb2c81'
    then 'Decodificação envolve reconhecer palavras; fluência envolve precisão, automaticidade e prosódia; compreensão é construir significado com texto, vocabulário e inferências.'
  when 'c97a91db-8fbe-4ba1-92b5-fb2c6cff2a18'
    then 'A compreensão pode ser ensinada com antecipação, esclarecimento de vocabulário, localização de informações, inferência, resumo e verificação do sentido com pistas do texto.'
  when '5a9ebb3a-bf2d-49da-9876-049c1386b0c4'
    then 'O apoio deve ampliar acesso e participação sem substituir a habilidade-alvo. Compare a compreensão demonstrada com e sem o apoio conforme o objetivo.'
  when 'e9c67026-e634-45f2-bdce-47d49e90587e'
    then 'A evidência indica que a decodificação melhorou, mas a compreensão permanece frágil. Planeje apoio em vocabulário, relações textuais e inferências e recolha nova evidência.'
  else feedback_hint
end,
updated_at = now()
where id in (
  'd8ffef54-104e-47f7-858e-405c33b7b9f1',
  '811e0140-4bf2-4e27-9ba3-5d9c405a1c69',
  '9cc64c17-01e4-4a1f-93f2-8f47bb3e936d',
  '71f423f6-df3e-46a5-9d97-690b144d7e65',
  '998e4b75-5270-4959-8b1d-8200029c584b',
  'e7cee01b-fd25-4d58-80dd-d12ef5e3bc4d',
  '1d87bf33-a8f1-46c7-92e6-2621a6bb2c81',
  'c97a91db-8fbe-4ba1-92b5-fb2c6cff2a18',
  '5a9ebb3a-bf2d-49da-9876-049c1386b0c4',
  'e9c67026-e634-45f2-bdce-47d49e90587e'
);

with revised_options (
  option_id, option_text, is_correct, feedback_correct, feedback_incorrect
) as (
  values
  -- Q1: fluency supports but does not replace comprehension. Correct: position 3.
  ('67f7562c-0535-40a0-9d1a-845c2bb485f0'::uuid, 'Concluir que a leitura já está compreendida porque precisão e entonação estão adequadas.', false, null::text, 'Precisão e prosódia ajudam, mas não comprovam sozinhas que o leitor construiu o sentido. Peça que explique a ideia principal e indique pistas do texto.'),
  ('aad0ca01-e11d-4b2a-9ffd-ba85e66d5f6a'::uuid, 'Aumentar a velocidade até atingir uma meta fixa antes de perguntar sobre o significado.', false, null::text, 'Elevar a taxa sem investigar a compreensão pode treinar velocidade sem resolver a dificuldade de sentido. Identifique primeiro o que o leitor não consegue explicar.'),
  ('44276b85-da8a-4d1f-afa9-c257163c10a4'::uuid, 'Reconhecer que fluência apoia o sentido, mas investigar vocabulário, relações textuais e inferências com perguntas sobre o texto.', true, 'Fluência pode liberar recursos para construir sentido, mas compreender exige integrar informações, vocabulário e inferências. A explicação do leitor permite investigar esses componentes.', null::text),
  ('a34efa4a-1086-4ecb-b996-92b2147c40e7'::uuid, 'Trocar por um texto mais simples sem observar onde a compreensão se rompe.', false, null::text, 'Simplificar sem localizar a dificuldade pode retirar desafio sem revelar a necessidade. Investigue vocabulário, relações entre ideias e inferências antes de ajustar o material.'),

  -- Q2: specific decoding support. Correct: position 1.
  ('862bb324-c085-4635-a1d0-01a79a1eccc0'::uuid, 'Registrar os tipos de erro, modelar relações entre grafias e sons e oferecer prática guiada seguida de nova observação.', true, 'O apoio responde à dificuldade observada no reconhecimento de palavras. Uma nova leitura permite verificar se a precisão e as pausas melhoram com a prática orientada.', null::text),
  ('efbfaf22-57e2-4c96-bbb7-e47cb7c4c9c2'::uuid, 'Fazer somente perguntas inferenciais complexas sem apoiar o reconhecimento das palavras.', false, null::text, 'A inferência é importante, mas erros frequentes de reconhecimento podem consumir recursos necessários à leitura. O primeiro apoio deve responder à barreira de decodificação observada.'),
  ('cd6a5e92-0c08-4b24-b8dd-721ec12d7ae1'::uuid, 'Cronometrar repetidamente e comparar apenas a quantidade de palavras lidas por minuto.', false, null::text, 'A taxa isolada não mostra quais palavras geraram erro nem que apoio ajudaria. Registre precisão e tipos de erro para orientar a intervenção.'),
  ('72613aab-8f96-4bb8-9f78-ef3cd225d1cd'::uuid, 'Atribuir as pausas à falta de atenção sem examinar a leitura.', false, null::text, 'Atribuir uma causa sem evidência não esclarece se há dificuldade de reconhecimento, texto inadequado ou outro fator. Observe os erros e as condições da leitura antes de decidir.'),

  -- Q3: measure both fluency and comprehension. Correct: position 4.
  ('fcf2b0d4-8ce9-4a4a-bf32-204bf3e8759d'::uuid, 'Anotar apenas o tempo de leitura e considerar o menor tempo como melhor aprendizagem.', false, null::text, 'O tempo não informa sozinho precisão, expressividade ou construção de sentido. Compare componentes distintos da leitura e inclua evidências de compreensão.'),
  ('9eb4399e-55cd-40a1-aea4-459bc21500bc'::uuid, 'Repetir o mesmo texto sem registrar erros, pausas ou respostas sobre o conteúdo.', false, null::text, 'A repetição sem registro não permite verificar o que mudou nem se a criança compreendeu. Recolha evidências comparáveis antes e depois da prática.'),
  ('e1002716-154d-41e2-bd03-097fcf075845'::uuid, 'Perguntar apenas sobre a frequência e a entrega da tarefa de leitura.', false, null::text, 'Frequência e entrega indicam participação, mas não mostram a qualidade da leitura nem a compreensão. Observe a leitura e peça explicações sobre o texto.'),
  ('303380c7-222a-4c50-809c-a5d1715d868d'::uuid, 'Comparar precisão, pausas/prosódia e respostas de compreensão apoiadas em pistas textuais antes e depois.', true, 'Essas medidas observam componentes diferentes: como a criança lê e o que consegue compreender. A comparação ajuda a escolher o próximo apoio sem reduzir o progresso a uma taxa.', null::text),

  -- Q4: interpret a screening measure responsibly. Correct: position 2.
  ('2d8e81a4-b816-4136-addc-f435b770e1d1'::uuid, 'Diagnosticar automaticamente um transtorno de leitura a partir da taxa indicada.', false, null::text, 'Uma medida de triagem não confirma diagnóstico individual. Considere série, instrumento, texto, condições da tarefa e outras evidências antes de decidir a avaliação necessária.'),
  ('09f10c7a-dd40-4391-8471-cf5ec005d2ac'::uuid, 'Considerar série, texto, instrumento e outras evidências e usar a triagem para decidir se precisa de avaliação mais aprofundada.', true, 'Taxas ajudam a sinalizar quem pode precisar de acompanhamento, mas variam conforme texto e instrumento. A triagem orienta investigação adicional, não uma regra universal ou diagnóstico automático.', null::text),
  ('ea7d3085-7dbe-45cd-8c8c-efcb509e5830'::uuid, 'Aplicar o mesmo ponto de corte a qualquer série, texto e população.', false, null::text, 'Pontos de corte dependem da série, do instrumento, do texto e da população. Um valor universal pode levar a conclusões inadequadas sobre a necessidade individual.'),
  ('5175871d-ef13-4934-9c7a-c51ae4668fc7'::uuid, 'Retirar materiais ricos e usar apenas textos muito simples com base no primeiro resultado.', false, null::text, 'Um resultado de triagem não justifica retirar oportunidades de leitura com sentido. Use a evidência para planejar avaliação e apoio proporcional à necessidade observada.'),

  -- Q5: integrated fluency and comprehension practice. Correct: position 4.
  ('43ce3248-8f38-4b3e-ae58-daccf85752eb'::uuid, 'Fazer uma corrida de velocidade e premiar apenas quem lê mais palavras por minuto.', false, null::text, 'A corrida privilegia taxa e pode desviar do objetivo de ler com precisão e expressividade para compreender. A prática deve incluir feedback e conversa sobre o texto.'),
  ('4a1d27d7-504c-44e6-8b7d-d00c42d9f0d2'::uuid, 'Pedir releituras sem devolutiva e presumir que repetir o texto garante compreensão.', false, null::text, 'A releitura pode apoiar automaticidade, mas sem orientação e checagem não revela se pausas, precisão ou compreensão melhoraram. Inclua feedback e perguntas sobre o sentido.'),
  ('f8bae7bb-cc31-4153-a348-131941b3541e'::uuid, 'Substituir a leitura oral por uma ficha de gramática e assumir que ela desenvolve prosódia.', false, null::text, 'Uma ficha gramatical não fornece prática observável de leitura oral ou feedback sobre entonação. Modele a leitura e trabalhe a compreensão com o próprio texto.'),
  ('ba90c17c-b8ac-4f82-a175-89862f8babc2'::uuid, 'Modelar a leitura, praticar em pares com devolutiva sobre precisão e prosódia e discutir vocabulário, relações e inferências.', true, 'A prática combina modelagem e leitura guiada com feedback sobre como ler e perguntas que verificam o que foi compreendido. Assim, a expressividade serve à construção de sentido.', null::text),

  -- Q6: different profiles require different supports. Correct: position 1.
  ('6574a1d2-9927-4193-8c31-41d1319cbb78'::uuid, 'Investigar a estratégia de cada estudante e focar decodificação explícita no primeiro e vocabulário/inferências no segundo, verificando os avanços.', true, 'O apoio corresponde à barreira observada: reconhecimento de palavras para um estudante e construção de sentido para o outro. A nova evidência mostra se a intervenção atende à necessidade.', null::text),
  ('1f2786a2-1fdc-496f-bcfe-56f8eafc9665'::uuid, 'Aplicar o mesmo treino de velocidade aos dois, sem investigar a origem das dificuldades.', false, null::text, 'A mesma medida não atende necessariamente a barreiras diferentes. Antes de intervir, diferencie dificuldade de reconhecimento de palavras de dificuldade de compreensão.'),
  ('2b5a9833-39ce-4603-831f-27a72a2df6b3'::uuid, 'Agrupar os estudantes por rótulos permanentes e manter o mesmo apoio para todo o grupo.', false, null::text, 'Perfis observados orientam apoios atuais, não rótulos permanentes. Reavalie estratégias e barreiras concretas para ajustar o ensino conforme o progresso.'),
  ('31161ccd-ccf6-4cdf-baf7-a8668db85cde'::uuid, 'Generalizar achados de uma amostra pequena para todos os estudantes com características semelhantes.', false, null::text, 'Estudos com grupos específicos podem sugerir perguntas, mas não representam automaticamente todas as pessoas desse grupo. Observe a estratégia e a necessidade de cada estudante.'),

  -- Q7: distinguish decoding, fluency and comprehension. Correct: position 3.
  ('8cc9a920-ae91-4a04-8fd4-5d297297a07e'::uuid, 'Tratar decodificação e compreensão como a mesma habilidade.', false, null::text, 'Reconhecer palavras contribui para a leitura, mas construir sentido também envolve vocabulário, relações textuais e inferências. As dimensões se relacionam, mas não são equivalentes.'),
  ('fb17e0c4-f86d-44af-82c8-0ed645aa1734'::uuid, 'Definir fluência apenas como velocidade, sem considerar precisão ou prosódia.', false, null::text, 'Fluência não é só rapidez. Precisão, automaticidade e prosódia fazem parte da leitura fluente e ajudam a compreender como o estudante lê.'),
  ('09e7e93e-3e74-4676-9ce6-80b99cba206f'::uuid, 'Distinguir reconhecimento de palavras, leitura precisa e expressiva, e construção de significado com vocabulário e inferências.', true, 'A alternativa separa os componentes sem os isolar: decodificação reconhece palavras, fluência descreve como a leitura ocorre e compreensão envolve construir significado.', null::text),
  ('c633dba7-4d34-4dce-b244-721c626f0e38'::uuid, 'Reduzir compreensão a recuperar informações explícitas, sem inferir relações ou sentidos.', false, null::text, 'A recuperação literal é uma parte da compreensão, mas o leitor também integra informações, interpreta relações e formula inferências apoiadas no texto.'),

  -- Q8: explicit strategies before, during and after reading. Correct: position 2.
  ('733ea2fd-3ca7-4a11-bd12-0e44ad0fc7fb'::uuid, 'Pedir previsão pelo título e aceitar qualquer palpite sem conferir no texto.', false, null::text, 'Antecipar pelo título pode ativar conhecimentos prévios, mas é necessário verificar a previsão com pistas textuais e revisar a interpretação quando necessário.'),
  ('d0be8239-9db8-452d-b261-a4a7e4d1e4b5'::uuid, 'Ativar conhecimentos prévios, esclarecer vocabulário, localizar informações, inferir, resumir e verificar o sentido com pistas do texto.', true, 'A sequência apoia o leitor em diferentes momentos e exige justificativas com evidências textuais, em vez de depender apenas de adivinhação ou memória.', null::text),
  ('6a3e0d93-27ac-4385-9990-cc3ed5749284'::uuid, 'Copiar frases do texto sem explicar relações ou verificar o significado.', false, null::text, 'Copiar trechos pode localizar informação, mas não mostra que o leitor entendeu relações e inferências. Peça explicação e evidências que sustentem a interpretação.'),
  ('264f554e-49c5-4f15-a113-274215672b23'::uuid, 'Contar palavras e ignorar a interpretação do conteúdo.', false, null::text, 'A contagem não mostra a construção de significado. Além de observar a fluência, a professora precisa verificar compreensão por perguntas e justificativas relacionadas ao texto.'),

  -- Q9: accessibility supports while preserving the goal. Correct: position 4.
  ('6cbe3c73-a259-4ec3-9185-7e24fd1fbbe8'::uuid, 'Retirar textos ricos e usar somente imagens para evitar qualquer dificuldade de leitura.', false, null::text, 'Acessibilidade deve ampliar o acesso ao texto, não substituir a habilidade-alvo por completo. Escolha apoio que permita participação e observe se favorece a compreensão.'),
  ('158699da-fe94-4e93-8b33-ebd99f652e45'::uuid, 'Manter apenas a contagem de palavras por minuto como medida, independentemente do apoio usado.', false, null::text, 'A taxa não revela sozinha compreensão e pode ocultar como o apoio afeta participação e sentido. Combine evidências de leitura e compreensão de acordo com o objetivo.'),
  ('dda78107-b2f1-43a0-bd4e-6b3861590423'::uuid, 'Presumir que leitura compartilhada e tempo adicional funcionam igualmente para todas as pessoas.', false, null::text, 'Apoios precisam ser avaliados na resposta individual. Verifique se ajudam a participar e compreender e ajuste-os conforme a necessidade observada.'),
  ('9e2cf42a-d600-4a1f-8832-5e3145faf81d'::uuid, 'Ajustar acesso ao texto e verificar se o apoio melhora a participação e a compreensão sem retirar o objetivo de leitura.', true, 'O apoio é útil quando amplia acesso e permite trabalhar a habilidade-alvo. Comparar a resposta do estudante indica se o recurso ajuda ou precisa ser ajustado.', null::text),

  -- Q10: improve comprehension after fluency has increased. Correct: position 1.
  ('d8660097-adab-40dd-95b8-bf20528dea81'::uuid, 'Planejar apoio em vocabulário, relações textuais e inferências e recolher nova evidência, sem focar apenas em aumentar a velocidade.', true, 'Como a precisão melhorou mas a compreensão não, o próximo passo deve mirar vocabulário e construção de sentido. Nova evidência mostrará se o apoio respondeu à necessidade.', null::text),
  ('799aff68-a30a-4e74-9867-5bb6f4391b49'::uuid, 'Aumentar o treino de velocidade e considerar que a compreensão virá automaticamente.', false, null::text, 'Fluência não garante compreensão automaticamente. A dificuldade relatada pede ensino explícito de vocabulário, inferências ou estrutura do texto, com verificação posterior.'),
  ('4a9113f4-839e-479e-8c90-501d00480f9c'::uuid, 'Concluir que ler com entonação adequada prova que o estudante compreendeu as inferências.', false, null::text, 'Prosódia adequada é um componente de fluência, não prova suficiente de compreensão. Peça ao estudante que explique relações e aponte pistas textuais.'),
  ('98e0782b-d0d6-408a-a4f9-3eea0693c559'::uuid, 'Dar um elogio geral e avançar, sem examinar o que ainda impede a compreensão.', false, null::text, 'Um elogio não fornece orientação sobre a dificuldade. Examine vocabulário, relações e inferências, escolha o apoio correspondente e recolha nova evidência.')
)
update public.exercise_options o
set content = r.option_text,
    is_correct = r.is_correct,
    feedback_correct = r.feedback_correct,
    feedback_incorrect = r.feedback_incorrect
from revised_options r
where o.id = r.option_id
  and o.question_id in (
    'd8ffef54-104e-47f7-858e-405c33b7b9f1',
    '811e0140-4bf2-4e27-9ba3-5d9c405a1c69',
    '9cc64c17-01e4-4a1f-93f2-8f47bb3e936d',
    '71f423f6-df3e-46a5-9d97-690b144d7e65',
    '998e4b75-5270-4959-8b1d-8200029c584b',
    'e7cee01b-fd25-4d58-80dd-d12ef5e3bc4d',
    '1d87bf33-a8f1-46c7-92e6-2621a6bb2c81',
    'c97a91db-8fbe-4ba1-92b5-fb2c6cff2a18',
    '5a9ebb3a-bf2d-49da-9876-049c1386b0c4',
    'e9c67026-e634-45f2-bdce-47d49e90587e'
  );

do $postflight$
declare
  v_exercise_id constant uuid := '1f1693d8-7931-4dfc-9edc-cc8a31c59729';
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
    where q.exercise_id = v_exercise_id and o.is_correct
  ) <> 4 then
    raise exception 'BATCH_ABORTED: correct answer positions were not distributed across all four positions';
  end if;

  if exists (
    select 1
    from public.exercise_questions q
    where q.exercise_id = v_exercise_id
      and q.feedback_hint ilike 'Questão em preparação:%'
  ) then
    raise exception 'BATCH_ABORTED: generic question hint survived the edit';
  end if;

  if (select published from public.exercises where id = v_exercise_id) is distinct from false then
    raise exception 'BATCH_ABORTED: evaluation was unexpectedly published';
  end if;
end
$postflight$;
