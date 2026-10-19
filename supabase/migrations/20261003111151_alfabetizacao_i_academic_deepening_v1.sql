-- Deep academic correction: Alfabetização I
-- Replaces demonstrably off-topic scientific-literacy / generic source synthesis with content aligned to each topic.
UPDATE public.material_sections ms
SET title = CASE
 WHEN ms.position=1 THEN 'Ideia central'
 WHEN ms.position=2 THEN 'Questão de partida'
 WHEN ms.position=3 THEN 'Conceitos fundamentais'
 WHEN ms.position=4 THEN 'Exemplo para visualizar'
 WHEN ms.position=5 THEN 'Situação para analisar'
 WHEN ms.position=6 THEN 'Erro frequente'
 WHEN ms.position=7 THEN 'Aprofundamento'
 WHEN ms.position=8 THEN 'Aplicação pedagógica'
 WHEN ms.position=9 THEN 'Síntese'
 WHEN ms.position=10 THEN 'Revisão ativa' ELSE ms.title END,
content = CASE
WHEN t.name='Alfabetização e letramento' AND ms.position=1 THEN
'Alfabetização e letramento são processos relacionados, mas não equivalentes. Alfabetizar envolve a apropriação do sistema de escrita alfabética, incluindo relações entre fala e escrita e conhecimentos ortográficos; letrar envolve participar de práticas sociais de leitura e escrita. O ensino precisa articular as duas dimensões, sem reduzir alfabetização à decodificação nem letramento ao simples contato com textos.'
WHEN t.name='Alfabetização e letramento' AND ms.position=2 THEN
'Uma pergunta central é: como ensinar o sistema de escrita de forma explícita e sistemática sem separar esse trabalho das práticas reais de leitura e escrita? A resposta exige pensar simultaneamente no objeto de conhecimento, nas hipóteses do aprendiz, nos gêneros textuais e nas finalidades sociais da linguagem escrita.'
WHEN t.name='Alfabetização e letramento' AND ms.position=3 THEN
'Dois eixos precisam caminhar juntos: apropriação do sistema alfabético e participação em práticas de linguagem. O primeiro exige compreender relações grafema-fonema, convenções e regularidades da escrita; o segundo envolve ler para compreender, escrever para comunicar e usar diferentes gêneros em situações significativas.'
WHEN t.name='Alfabetização e letramento' AND ms.position=4 THEN
'Uma turma pode estudar a escrita da palavra “casa” observando sons e letras e, na mesma sequência, ler um pequeno texto sobre moradias e produzir um bilhete para uma família. A atividade combina reflexão sobre o sistema de escrita com uma finalidade comunicativa real.'
WHEN t.name='Alfabetização e letramento' AND ms.position=5 THEN
'Imagine crianças que conseguem reconhecer várias letras, mas ainda escrevem palavras de maneira instável e têm pouca experiência de leitura autônoma. Analise quais atividades combinariam ensino sistemático das relações grafofonêmicas, leitura de textos e produção escrita com propósito definido.'
WHEN t.name='Alfabetização e letramento' AND ms.position=6 THEN
'Um erro é escolher entre “ensinar o código” e “trabalhar textos”, como se fossem alternativas incompatíveis. O desafio pedagógico é organizar situações em que a reflexão explícita sobre o sistema de escrita apoie a participação crescente em práticas de leitura e produção textual.'
WHEN t.name='Alfabetização e letramento' AND ms.position=7 THEN
'Magda Soares distingue alfabetização e letramento sem separá-los na prática educativa. A literatura e documentos curriculares também sustentam que aprender a ler e escrever envolve tanto a apropriação do sistema quanto o uso social da linguagem. Essa articulação ajuda a evitar dois reducionismos: ensinar apenas correspondências gráficas ou apenas expor a criança a textos.'
WHEN t.name='Alfabetização e letramento' AND ms.position=8 THEN
'Uma prática consistente pode combinar leitura compartilhada, exploração de palavras e frases, atividades de consciência fonológica, escrita de listas ou bilhetes, revisão coletiva e produção de textos. O professor observa o que cada criança já compreende e ajusta a intervenção sem abandonar a finalidade comunicativa.'
WHEN t.name='Alfabetização e letramento' AND ms.position=9 THEN
'Alfabetizar é possibilitar que o estudante compreenda e use o sistema de escrita; letrar é ampliar sua participação nas práticas sociais mediadas pela leitura e pela escrita. O ensino mais completo integra essas dimensões e torna explícitos os conhecimentos que precisam ser aprendidos.'
WHEN t.name='Alfabetização e letramento' AND ms.position=10 THEN
'Explique, com um exemplo de sala de aula, como uma mesma sequência pode trabalhar uma relação grafofonêmica e uma prática social de leitura ou escrita. Depois explique por que separar completamente essas duas dimensões pode limitar a aprendizagem.'
WHEN t.name='Sistema de escrita alfabética' AND ms.position=9 THEN
'O sistema de escrita alfabética representa unidades da fala por grafemas segundo convenções que não são totalmente regulares. A aprendizagem envolve compreender o princípio alfabético e, progressivamente, regularidades e irregularidades ortográficas. Pesquisas com crianças do 1º ano encontraram relações significativas entre consciência fonológica, conhecimento de letras e evolução da escrita.'
WHEN t.name='Sistema de escrita alfabética' AND ms.position=10 THEN
'Analise uma sequência de aprendizagem em que a criança primeiro identifica letras, depois compara palavras quanto aos sons e finalmente escreve palavras e frases. Explique quais conhecimentos sobre o sistema alfabético aparecem em cada etapa e quais evidências indicariam avanço.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=1 THEN
'Leitura e escrita são práticas sociais: acontecem com finalidades, interlocutores, gêneros e contextos. Na alfabetização, isso significa ensinar crianças a compreender e produzir textos enquanto também desenvolvem conhecimentos sobre o sistema de escrita. O trabalho escolar pode partir de situações autênticas sem abandonar o ensino sistemático.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=2 THEN
'Que mudanças ocorrem quando uma atividade deixa de pedir apenas “escreva cinco frases” e passa a ter um interlocutor, uma finalidade e um gênero definidos? Essa pergunta ajuda a perceber como contexto e propósito influenciam as escolhas linguísticas e o modo de revisar o texto.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=3 THEN
'Uma prática social de escrita articula texto, propósito, interlocutor, suporte e convenções linguísticas. Na escola, esses elementos podem aparecer em convites, listas, bilhetes, relatos, histórias, notícias e outros gêneros, sempre combinados com oportunidades de refletir sobre como a escrita funciona.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=4 THEN
'Para produzir um convite para uma atividade escolar, as crianças precisam decidir para quem escrevem, quais informações são indispensáveis e como organizá-las. O professor pode usar essa situação para trabalhar gênero, planejamento, escrita, revisão e aspectos do sistema alfabético.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=5 THEN
'Compare duas propostas: copiar uma lista de palavras e produzir uma lista de materiais que será realmente usada pela turma. As duas envolvem escrita, mas a segunda explicita finalidade e interlocução. Analise quais conhecimentos linguísticos e sociais podem ser ensinados em cada uma.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=6 THEN
'Um erro é transformar “texto real” em justificativa para abandonar o ensino explícito da leitura e da escrita. Outro é reduzir práticas sociais a exercícios escolares com aparência de gênero. O professor precisa preservar finalidade, interlocução e sentido, ao mesmo tempo em que ensina os conhecimentos linguísticos necessários.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=7 THEN
'O letramento não é uma etapa posterior à alfabetização. A criança pode participar de práticas de leitura e escrita enquanto ainda constrói conhecimentos sobre o sistema alfabético. O planejamento ganha qualidade quando cada prática social é usada também para tornar visíveis conhecimentos linguísticos que precisam ser ensinados.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=8 THEN
'Organize uma situação em que a turma leia textos do mesmo gênero, observe suas características, produza uma primeira versão, receba feedback e revise. A sequência deve combinar compreensão, produção e reflexão linguística, evitando que revisão seja apenas correção ortográfica no final.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=9 THEN
'Práticas sociais dão finalidade à leitura e à escrita; o ensino sistemático fornece conhecimentos para que a criança participe delas com autonomia crescente. Uma proposta de alfabetização consistente conecta texto, contexto, interlocutor, sistema de escrita, compreensão e produção.'
WHEN t.name='Leitura, escrita e práticas sociais' AND ms.position=10 THEN
'Escolha um gênero presente na vida escolar e descreva uma sequência de leitura e produção. Identifique a finalidade, o interlocutor, os conhecimentos sobre o sistema de escrita envolvidos e como você verificaria se a criança compreendeu e produziu o texto.'
ELSE ms.content END
FROM public.materials m
JOIN public.topics t ON t.id=m.topic_id
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE ms.material_id=m.id AND m.status='published' AND t.published AND d.published
AND d.name='Alfabetização I'
AND t.name IN ('Alfabetização e letramento','Sistema de escrita alfabética','Leitura, escrita e práticas sociais')
AND ms.position IN (1,2,3,4,5,6,7,8,9,10);

UPDATE public.material_sections ms
SET title='Aprofundamento',
content=CASE t.name
WHEN 'Alfabetização e letramento' THEN 'O aprofundamento passa pela distinção conceitual entre alfabetização e letramento sem transformar essa distinção em separação didática. A literatura de Magda Soares e a BNCC permitem discutir como o domínio do sistema de escrita se articula ao uso social da linguagem. Para o professor, a consequência é planejar simultaneamente ensino explícito, leitura, escrita, compreensão e produção.'
WHEN 'Sistema de escrita alfabética' THEN 'Aprofundar o sistema de escrita exige ir além da ideia simplificada de “uma letra para cada som”. A BNCC destaca relações grafofonêmicas regulares, posicionais e contextuais, enquanto estudos com crianças do 1º ano mostram relações entre consciência fonológica, conhecimento de letras e evolução da escrita. O professor precisa transformar essas relações em objetos explícitos de reflexão e prática.'
WHEN 'Consciência fonológica e relações grafofonêmicas' THEN 'A consciência fonológica envolve refletir sobre unidades sonoras da fala, enquanto as relações grafofonêmicas conectam essas unidades às representações escritas. Estudo longitudinal com crianças do 1º ano encontrou correlações significativas entre consciência fonológica, conhecimento de letras e nível de escrita, reforçando a importância de trabalhar essas dimensões de forma articulada e sistemática.'
WHEN 'Leitura, escrita e práticas sociais' THEN 'Aprofundar o tema significa analisar como finalidades, interlocutores, gêneros e suportes modificam a leitura e a produção textual. Isso não elimina o ensino do sistema alfabético: a criança precisa avançar simultaneamente na compreensão das convenções da escrita e na participação em práticas reais de linguagem.'
WHEN 'Psicogênese da língua escrita' THEN 'A psicogênese da língua escrita deve ser estudada como uma perspectiva teórica e histórica, não como uma receita didática. A obra de Ferreiro e Teberosky parte de uma concepção construtivista da construção do conhecimento, e análises posteriores discutem seus pressupostos, interpretações e limites. O professor pode usar hipóteses de escrita como evidência diagnóstica para compreender o que a criança está pensando, sem concluir que apenas a exposição à escrita produzirá alfabetização.'
ELSE ms.content END
FROM public.materials m
JOIN public.topics t ON t.id=m.topic_id
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE ms.material_id=m.id AND m.status='published' AND t.published AND d.published
AND d.name='Alfabetização I' AND ms.title='Aprofundamento'
AND t.name IN ('Alfabetização e letramento','Sistema de escrita alfabética','Consciência fonológica e relações grafofonêmicas','Leitura, escrita e práticas sociais','Psicogênese da língua escrita');