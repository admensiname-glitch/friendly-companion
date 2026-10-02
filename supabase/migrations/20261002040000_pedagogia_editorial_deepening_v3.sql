-- Pedagogia editorial deepening v3
-- Preserves source-backed core content and replaces the prior generic enrichment
-- with an area-aware, 10-section pedagogical deepening layer.

WITH cleaned AS (
  SELECT
    ms.id,
    ms.position,
    ms.content,
    t.name AS topic,
    d.name AS discipline,
    d.component_kind,
    coalesce(d.curriculum_area,'') AS curriculum_area
  FROM public.material_sections ms
  JOIN public.materials m ON m.id=ms.material_id AND m.status='published'
  JOIN public.topics t ON t.id=m.topic_id AND t.published
  JOIN public.disciplines d ON d.id=t.discipline_id
  WHERE d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
    AND d.published
),
base AS (
  SELECT *,
    regexp_replace(
      content,
      E'\\n\\n(Roteiro de domínio:|Para compreender melhor |Conecte |Exemplo aplicado:|Situação para análise:|Atenção ao erro comum:|Aprofundamento com fontes:|Aplicação pedagógica:|Síntese de domínio:|Revisão ativa:).*',
      '',
      'g'
    ) AS core
  FROM cleaned
),
deepened AS (
  SELECT
    id,
    position,
    topic,
    discipline,
    curriculum_area,
    trim(core) || E'\\n\\n' ||
    CASE position
      WHEN 1 THEN
        'Delimitação conceitual: para dominar "' || topic || '", não basta repetir uma definição. Identifique o objeto do conceito, seus limites e o problema educacional que ele ajuda a explicar. Em seguida, escreva uma formulação própria e compare-a com a formulação apresentada no material. ' ||
        CASE
          WHEN curriculum_area='Pesquisa' OR component_kind IN ('research','capstone')
            THEN 'Em disciplinas de pesquisa, acrescente qual é a pergunta, evidência ou procedimento que torna a ideia verificável.'
          WHEN curriculum_area='Gestão e políticas'
            THEN 'Em gestão e políticas, observe também quem toma a decisão, em qual esfera institucional e com qual finalidade educacional.'
          WHEN curriculum_area='Inclusão e diversidade'
            THEN 'Em inclusão e diversidade, delimite o conceito sem transformar diferenças em deficiência, déficit ou estereótipo.'
          WHEN curriculum_area='Educação Infantil' OR curriculum_area='Infâncias'
            THEN 'Na Educação Infantil, mantenha a distinção entre cuidar, educar, brincar, interagir e acompanhar o desenvolvimento.'
          WHEN curriculum_area='Alfabetização'
            THEN 'Na alfabetização, mantenha a distinção entre sistema de escrita, linguagem, práticas de leitura e escrita e processos de aprendizagem.'
          ELSE
            'Relacione a definição ao trabalho pedagógico, sem reduzir o conceito a uma técnica isolada.'
        END
      WHEN 2 THEN
        'Estrutura do conceito: decomponha "' || topic || '" em seus componentes observáveis. Pergunte: quais ideias precisam aparecer para que o conceito esteja presente? O que pode acontecer sem que o conceito esteja de fato caracterizado? Organizar o tema por componentes ajuda a perceber relações causais, condições e limites, em vez de memorizar uma lista.'
      WHEN 3 THEN
        'Distinções essenciais: compare "' || topic || '" com pelo menos dois conceitos próximos que aparecem em Pedagogia. Para cada comparação, indique o ponto em comum e a diferença que muda a interpretação ou a decisão pedagógica. Em questões de prova, essa distinção é mais importante do que reconhecer palavras-chave soltas.'
      WHEN 4 THEN
        'Exemplo trabalhado: imagine uma situação concreta em que "' || topic || '" precisa orientar uma decisão. Identifique os sujeitos envolvidos, o objetivo, o contexto, a ação realizada e a evidência que seria observada depois. Um bom exemplo não apenas ilustra o conceito; ele mostra por que aquela situação é explicada por esse conceito e não por outro.'
      WHEN 5 THEN
        'Caso para análise: diante de uma situação problemática relacionada a "' || topic || '", separe descrição e interpretação. Primeiro registre o que é observável; depois formule a explicação conceitual; por fim, proponha uma ação coerente e diga qual evidência permitiria revisar a hipótese inicial. Esse percurso aproxima estudo acadêmico e tomada de decisão profissional.'
      WHEN 6 THEN
        'Erro conceitual a evitar: um conhecimento pode ser lembrado e ainda assim ser aplicado de maneira inadequada. Em "' || topic || '", observe especialmente reduções, falsas equivalências, generalizações e respostas que ignoram contexto. Quando uma alternativa parecer correta, pergunte: correta em qual condição, para qual finalidade e com quais evidências?'
      WHEN 7 THEN
        'Leitura acadêmica e fontes: use as fontes aprovadas vinculadas a "' || topic || '" para confirmar definições, normas, resultados de pesquisa e perspectivas teóricas. Não trate resumo, vídeo ou postagem como substituto automático da fonte original. Registre o que é definição normativa, o que é interpretação acadêmica e o que é aplicação pedagógica; essa separação melhora a qualidade da compreensão.'
      WHEN 8 THEN
        'Aplicação profissional: transforme "' || topic || '" em uma decisão pedagógica observável. Defina o objetivo, selecione uma estratégia coerente com o conceito, antecipe barreiras e escolha um indicador ou evidência de acompanhamento. Depois pergunte como você ajustaria a ação caso o resultado esperado não aparecesse.'
        ||
        CASE
          WHEN component_kind='internship'
            THEN ' No estágio, acrescente registro de observação, justificativa da intervenção e reflexão sobre os resultados.'
          WHEN component_kind='extension'
            THEN ' Na extensão, acrescente diálogo com o território, reciprocidade e relevância social da ação.'
          WHEN curriculum_area='Tecnologia educacional'
            THEN ' Em tecnologia educacional, inclua também acessibilidade, mediação docente e uso crítico da tecnologia.'
          WHEN curriculum_area='Pesquisa'
            THEN ' Em pesquisa, explicite como a decisão ou hipótese será sustentada pelos dados.'
          ELSE ''
        END
      WHEN 9 THEN
        'Síntese de domínio: você deve conseguir explicar "' || topic || '" sem consultar o texto usando três movimentos: o que é, como se diferencia de conceitos próximos e como aparece em uma situação concreta. Depois acrescente uma consequência pedagógica: o que muda na prática quando esse conceito é compreendido corretamente?'
      WHEN 10 THEN
        'Revisão ativa: feche o material e responda sem consulta: qual é a definição central de "' || topic || '"? quais são dois conceitos que não devem ser confundidos com ele? qual exemplo demonstra sua aplicação? qual erro você evitaria? qual fonte do tópico ajudaria a conferir sua compreensão? Finalize criando uma questão de prova e justificando o gabarito.'
      ELSE ''
    END AS new_content
  FROM base
)
UPDATE public.material_sections ms
SET content=d.new_content,
    updated_at=now()
FROM deepened d
WHERE ms.id=d.id;

-- Keep introductions concise, specific and no longer framed as "in preparation".
UPDATE public.materials m
SET introduction =
  'O que você vai aprender: este material organiza os conceitos essenciais de "' || t.name ||
  '" e mostra como eles se relacionam com situações reais de estudo e prática em Pedagogia. Você vai avançar da definição para a análise, aplicação e revisão.',
  updated_at=now()
FROM public.topics t
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE m.topic_id=t.id
  AND m.status='published'
  AND d.course_id='b1733380-f5bf-435d-b516-ae5a489e0c46'
  AND d.published;
