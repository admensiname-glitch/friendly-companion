-- Replaces templated pedagogical prose and strengthens short published introductions.
UPDATE public.material_sections ms
SET content = CASE
  WHEN ms.content ILIKE '%com suas palavras e descreva uma atividade possível%' THEN
    'Sem consultar o material, responda a duas perguntas sobre ' || t.name || ': qual é a ideia central que você precisa dominar e como ela aparece em uma situação concreta de ensino? Em seguida, dê um exemplo próprio e justifique sua escolha.'
  WHEN ms.content ILIKE 'Evite tratar % como receita universal, definição isolada ou opinião sem justificativa.%' THEN
    'Um erro importante em ' || t.name || ' é transformar um conceito complexo em regra pronta. Compare a definição estudada com uma situação concreta e verifique quais condições, evidências e decisões pedagógicas precisam ser consideradas antes de tirar uma conclusão.'
  WHEN ms.content ILIKE 'Registre contexto, sujeitos, decisões, recursos e evidências relevantes para compreender%' THEN
    CASE WHEN d.name ILIKE 'Estágio%' THEN
      'Ao observar ' || t.name || ', registre o que aconteceu, quem participou, quais decisões foram tomadas e quais evidências permitem interpretá-las. Separe descrição do fato, interpretação e hipótese explicativa; depois relacione o registro aos conceitos estudados.'
    ELSE
      'Ao estudar ' || t.name || ', procure evidências concretas de como o conceito aparece na prática pedagógica. Registre contexto, sujeitos envolvidos, decisões, resultados observáveis e limites da situação, distinguindo o que foi observado da interpretação feita.'
    END
  WHEN ms.content ILIKE 'Que conceito ou relação precisa ser compreendido para dominar%' THEN
    'Antes de avançar em ' || t.name || ', formule a pergunta que organiza o tema: o que precisa ser explicado, relacionado ou distinguido para que uma decisão pedagógica faça sentido? Use essa pergunta para testar se você compreendeu o mecanismo, e não apenas o nome do conceito.'
  WHEN ms.content ILIKE 'Apresente uma situação concreta dos anos iniciais em que%' THEN
    'Imagine uma turma dos anos iniciais trabalhando ' || t.name || '. Descreva uma situação de aprendizagem concreta, indique o que os alunos precisariam mobilizar e explique quais evidências permitiriam ao professor perceber se a aprendizagem está acontecendo.'
  WHEN ms.content ILIKE 'Analise um caso e identifique o raciocínio, a evidência ou a estratégia adequada para%' THEN
    'Analise um caso pedagógico envolvendo ' || t.name || '. Identifique o problema, explicite a evidência disponível, compare pelo menos duas possibilidades de ação e justifique qual decisão seria mais coerente com os objetivos de aprendizagem.'
  WHEN ms.content ILIKE 'Imagine uma situação de estágio em que%' THEN
    'Imagine uma situação real de estágio em que ' || t.name || ' esteja em jogo. Descreva o contexto, identifique o problema pedagógico, indique quais evidências você buscaria e explique como os conceitos estudados orientariam sua decisão.'
  ELSE ms.content END
FROM public.topics t JOIN public.disciplines d ON d.id=t.discipline_id JOIN public.materials m ON m.topic_id=t.id
WHERE ms.material_id=m.id AND m.status='published' AND t.published AND d.published
AND (ms.content ILIKE '%com suas palavras e descreva uma atividade possível%' OR ms.content ILIKE 'Evite tratar % como receita universal, definição isolada ou opinião sem justificativa.%' OR ms.content ILIKE 'Registre contexto, sujeitos, decisões, recursos e evidências relevantes para compreender%' OR ms.content ILIKE 'Que conceito ou relação precisa ser compreendido para dominar%' OR ms.content ILIKE 'Apresente uma situação concreta dos anos iniciais em que%' OR ms.content ILIKE 'Analise um caso e identifique o raciocínio, a evidência ou a estratégia adequada para%' OR ms.content ILIKE 'Imagine uma situação de estágio em que%');

UPDATE public.material_sections ms
SET content = CASE
  WHEN ms.content ILIKE 'A literatura sobre%pode apresentar abordagens diferentes%' THEN 'Para aprofundar ' || t.name || ', compare as interpretações apresentadas nas fontes citadas neste material. Observe quais conceitos cada fonte privilegia, que evidências sustenta e quais limites aparecem quando a ideia é aplicada a situações pedagógicas diferentes. Aprofundar não é apenas acrescentar informação: é conseguir explicar relações, diferenças e consequências.'
  WHEN ms.content ILIKE 'O aprofundamento pede atenção às relações entre norma%' THEN 'Aprofunde ' || t.name || ' relacionando normas, planejamento, prática e acompanhamento. Pergunte o que cada dimensão muda nas demais, quais decisões pedagógicas dependem desse vínculo e que evidências seriam necessárias para avaliar se a proposta está funcionando. Use essa articulação para evitar uma leitura fragmentada do tema.'
  WHEN ms.content ILIKE 'No aprofundamento, compare alternativas e condições%' THEN 'Aprofunde ' || t.name || ' comparando situações, estratégias e evidências. Identifique o que permanece válido em diferentes contextos, o que depende das condições da turma e quais sinais permitiriam revisar uma decisão pedagógica. O objetivo é explicar por que uma escolha faz sentido, não apenas listar possibilidades.'
  WHEN ms.content ILIKE 'Relacione % a currículo, ensino e avaliação%' THEN 'Aprofunde ' || t.name || ' examinando como decisões curriculares influenciam o ensino, a aprendizagem e a avaliação. Compare o que é planejado com o que efetivamente acontece e identifique quais evidências ajudam a justificar ajustes. A análise deve mostrar relações de causa, condição ou consequência sem reduzir o tema a uma definição.'
  ELSE ms.content END
FROM public.topics t JOIN public.disciplines d ON d.id=t.discipline_id JOIN public.materials m ON m.topic_id=t.id
WHERE ms.material_id=m.id AND m.status='published' AND t.published AND d.published AND ms.title='Aprofundamento'
AND (ms.content ILIKE 'A literatura sobre%pode apresentar abordagens diferentes%' OR ms.content ILIKE 'O aprofundamento pede atenção às relações entre norma%' OR ms.content ILIKE 'No aprofundamento, compare alternativas e condições%' OR ms.content ILIKE 'Relacione % a currículo, ensino e avaliação%');

UPDATE public.materials m
SET introduction = left(regexp_replace(coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=1 LIMIT 1),'') || ' ' || coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=3 LIMIT 1),'') || ' ' || coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=9 LIMIT 1),''),'\\s+',' ','g'),850)
WHERE m.status='published' AND length(coalesce(m.introduction,'')) < 180
AND length(trim(coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=1 LIMIT 1),'') || coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=3 LIMIT 1),'') || coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=9 LIMIT 1),''))) > 250;