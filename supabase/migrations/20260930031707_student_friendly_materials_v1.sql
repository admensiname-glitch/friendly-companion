
-- Reescrita pedagógica dos materiais publicados:
-- linguagem clara, progressão conceitual, exemplos e revisão orientada para estudo.

update public.materials
set introduction = case id
  when '7a1ee5b1-49e4-4722-9241-a9cd33464be0' then
    'Neste tópico você vai entender duas dimensões que precisam ser estudadas juntas: a aprendizagem do sistema de escrita e os usos sociais da leitura e da escrita. Ao final, você deverá conseguir explicar a diferença entre alfabetização e letramento, relacionar os dois processos e reconhecer exemplos de integração em situações de ensino.'
  when '0aca8546-f2ad-46ad-a8c7-21707cc46a59' then
    'Neste tópico você vai compreender como funciona o sistema de escrita alfabética e por que aprender a ler e escrever exige mais do que memorizar letras. Ao final, você deverá reconhecer relações entre grafemas e fonemas, identificar regularidades e complexidades da escrita e analisar situações didáticas que ajudam o aluno a avançar.'
  when 'bc46afac-e6d6-49d2-8387-13c40d3d0f0b' then
    'Neste tópico você vai estudar a consciência fonológica e sua relação com a aprendizagem da escrita. Ao final, você deverá distinguir diferentes formas de reflexão sobre os sons da fala, compreender como elas podem apoiar a alfabetização e reconhecer atividades adequadas para cada momento do processo.'
  when '10c77160-d405-4484-a63c-e29ab1342f87' then
    'Neste tópico você vai relacionar leitura, escrita e participação em práticas sociais. Ao final, você deverá compreender como se constrói sentido na leitura, analisar situações de produção escrita e perceber por que fluência, compreensão, finalidade e contexto precisam ser considerados juntos.'
  when 'ff7dafa5-7776-4b66-a65f-db6c4f583472' then
    'Neste tópico você vai compreender a Didática como campo de estudo e ação sobre os processos de ensinar e aprender. Ao final, você deverá explicar seu papel, reconhecer a importância da intencionalidade e da mediação docente e analisar decisões didáticas considerando o contexto.'
  when '84439dee-5451-47a7-9062-9a7664db631d' then
    'Neste tópico você vai aprender a ler um planejamento de ensino como um conjunto coerente de decisões. Ao final, você deverá relacionar objetivos, conteúdos, métodos e avaliação, perceber a influência do contexto e identificar quando um planejamento precisa ser ajustado durante a prática.'
  when '43562e58-bff1-4eb3-9dd3-b7ab291362c0' then
    'Neste tópico você vai organizar a lógica que conecta objetivos de aprendizagem, conteúdos e métodos de ensino. Ao final, você deverá diferenciar cada elemento, justificar escolhas e verificar se existe coerência entre aquilo que se pretende que o aluno aprenda e aquilo que será feito em aula.'
  when 'd0aee9ac-e285-477e-aaec-e0a0e6964b18' then
    'Neste tópico você vai entender a avaliação como parte do processo de ensino e aprendizagem. Ao final, você deverá diferenciar funções avaliativas, reconhecer critérios e evidências, interpretar feedback e explicar como os resultados da avaliação podem orientar novas decisões pedagógicas.'
  else introduction
end
where id in (
  '7a1ee5b1-49e4-4722-9241-a9cd33464be0',
  '0aca8546-f2ad-46ad-a8c7-21707cc46a59',
  'bc46afac-e6d6-49d2-8387-13c40d3d0f0b',
  '10c77160-d405-4484-a63c-e29ab1342f87',
  'ff7dafa5-7776-4b66-a65f-db6c4f583472',
  '84439dee-5451-47a7-9062-9a7664db631d',
  '43562e58-bff1-4eb3-9dd3-b7ab291362c0',
  'd0aee9ac-e285-477e-aaec-e0a0e6964b18'
);

update public.material_sections
set content = case id

when 'e449e3f9-bed6-4891-a09a-fb1b6304a675' then
  'Alfabetização é o processo de apropriação do sistema de escrita alfabética. Isso envolve compreender como a escrita representa a língua, descobrir regularidades e aprender convenções que permitem ler e escrever com autonomia. Não é apenas decorar o nome das letras: o estudante precisa construir conhecimentos sobre como a escrita funciona. Para estudar, lembre-se da pergunta central: “O que preciso compreender para usar o sistema de escrita?”'
when 'd6521bf7-e7f1-47bf-a006-581259d805e7' then
  'Letramento destaca os usos sociais da leitura e da escrita. Uma pessoa pode ler e escrever em situações com diferentes finalidades: informar-se, estudar, registrar uma ideia, preencher um formulário, conversar por escrito ou participar de uma prática cultural. Por isso, letramento não é simplesmente “saber ler”; envolve participar de situações em que a escrita tem sentido e função.'
when '01619bd1-1941-44a9-a4ad-69f4c55a5e2a' then
  'Alfabetização e letramento são dimensões relacionadas, mas não são sinônimas. A alfabetização focaliza a apropriação do sistema de escrita; o letramento focaliza os usos sociais desse sistema. Na prática educativa, os dois podem aparecer juntos: o estudante pode analisar palavras, relações entre sons e grafias e, ao mesmo tempo, ler um texto com uma finalidade real. A ideia-chave é articular aprendizagem do sistema e participação em práticas significativas.'
when 'cedf59a0-c053-4651-ae0c-ba1c6aab241a' then
  'Imagine uma turma que lê um convite para descobrir como esse gênero funciona. Depois, os alunos observam palavras do próprio convite, comparam grafias, refletem sobre letras e sons e produzem um novo convite para um destinatário real. A atividade trabalha uso social da escrita e aprendizagem do sistema. Em uma prova, procure situações em que o ensino articula significado, finalidade comunicativa e conhecimento sobre a escrita.'
when '4284db4e-044f-4afe-8cba-5e03b1db6c32' then
  'Um erro comum é reduzir alfabetização à memorização de letras e sílabas. Outro é tratar letramento como se tornasse desnecessário o ensino sistemático do sistema de escrita. As duas ideias empobrecem o processo. Para resolver questões, desconfie de alternativas que apresentam alfabetização e letramento como conceitos opostos ou que eliminam completamente uma das dimensões.'
when 'daac1450-1c23-46b3-95ef-0a713482dedc' then
  'Guarde estas cinco ideias: 1) alfabetização envolve apropriação do sistema de escrita; 2) letramento envolve usos sociais da leitura e da escrita; 3) os conceitos são diferentes; 4) eles podem e devem ser articulados no ensino; 5) atividades significativas podem trabalhar sistema e uso ao mesmo tempo. Uma boa revisão é explicar a diferença entre os dois conceitos com um exemplo concreto, sem decorar apenas definições.'

when '88d1916b-4cc2-4fa3-9822-07b533cfe4cb' then
  'O princípio alfabético é a compreensão de que existe uma relação sistemática entre unidades sonoras da fala e unidades gráficas da escrita. Aprender esse sistema não significa descobrir uma correspondência perfeita e mecânica para todas as palavras; significa construir conhecimentos sobre como as letras e combinações de letras representam aspectos sonoros. Esse entendimento sustenta o avanço na leitura e na escrita.'
when '2f6029e9-3406-4a73-8bec-77c3a3d879f0' then
  'Grafemas são unidades da escrita usadas para representar unidades sonoras em um sistema alfabético; fonemas são unidades sonoras que participam da diferenciação de palavras. A relação entre eles é importante para a alfabetização, mas não deve ser tratada como uma tabela simples de “uma letra = um som”. Há casos em que uma letra participa de uma combinação e casos em que o mesmo som pode ser representado de maneiras diferentes.'
when 'c091e5f5-0f82-4bcb-b0d1-ba0ef04e1a79' then
  'A escrita alfabética tem regularidades, mas também apresenta complexidades. Algumas relações entre sons e grafias são mais previsíveis; outras dependem do contexto ou da palavra. Por isso, o ensino precisa combinar reflexão sobre as relações grafofonêmicas com observação de padrões ortográficos e uso de palavras reais. Em questões de prova, diferencie “há regularidades” de “todas as relações são perfeitamente regulares”.'
when '3a1bce2a-27ec-473c-afe9-ab03085425b8' then
  'Uma situação didática pode propor que os alunos comparem palavras parecidas, observem partes que se repetem e discutam por que determinada grafia foi usada. Outra possibilidade é produzir pequenos textos e, depois, revisar palavras selecionadas. O objetivo não é interromper toda atividade para corrigir tudo, mas escolher conhecimentos relevantes para reflexão e aprendizagem. O essencial é que a atividade gere observação, comparação e tomada de consciência.'
when 'cb7d9d89-0f5c-42b5-a856-87fba7066521' then
  'Um erro comum é ensinar o sistema apenas por repetição mecânica ou, no extremo oposto, esperar que todos descubram sozinhos suas regularidades. Também é problemático apresentar a escrita como totalmente previsível. Para provas, procure alternativas que defendam ensino sistemático, reflexão sobre regularidades e uso de situações significativas, sem reduzir a alfabetização a exercícios descontextualizados.'
when '56f3c06f-1a17-41a1-91fa-a0139658fd60' then
  'Resumo: o aluno precisa compreender o princípio alfabético; grafemas e fonemas são conceitos diferentes; as relações entre fala e escrita apresentam regularidades e complexidades; atividades de comparação e análise podem apoiar a aprendizagem; o ensino precisa ser sistemático e significativo. Para revisar, explique por que “decorar letras” não é suficiente para dominar o sistema de escrita.'

when '36be4265-d7b6-45c8-b35c-12bcf8597570' then
  'Consciência fonológica é a capacidade de refletir sobre aspectos sonoros da fala. Ela pode envolver perceber, comparar ou manipular unidades de diferentes tamanhos, como palavras, sílabas e partes sonoras menores. Na alfabetização, essa reflexão é relevante porque ajuda o estudante a prestar atenção à estrutura sonora da língua e a estabelecer relações entre o que fala e o que observa na escrita.'
when '9a24ac68-ffa9-46e5-b31c-a334e34d3e93' then
  'A passagem da reflexão sonora para a escrita acontece quando o estudante começa a observar como partes sonoras podem ser representadas graficamente. Uma atividade pode pedir que compare palavras que começam de maneira semelhante, identifique partes sonoras ou observe como determinada parte aparece escrita em palavras diferentes. O objetivo é favorecer análise e compreensão, não transformar a atividade em repetição automática.'
when 'ec701221-0567-4561-b947-247093ca783f' then
  'As análises podem avançar em complexidade. É possível começar com unidades mais amplas e perceptíveis e, gradualmente, propor tarefas que exigem atenção a partes menores e relações mais específicas. A progressão deve acompanhar o que os alunos já conseguem fazer. Em uma prova, procure propostas que considerem o conhecimento prévio e aumentem a complexidade de forma gradual, em vez de impor tarefas difíceis sem preparação.'
when '907b0bfa-31b2-4b81-94dc-5c2912e67fae' then
  'Exemplos de atividades incluem comparar palavras, brincar com rimas, separar palavras em sílabas, identificar semelhanças sonoras e observar correspondências entre partes faladas e escritas. Essas atividades fazem mais sentido quando têm uma finalidade didática clara. Ao analisar uma questão, pergunte: “Qual conhecimento sonoro está sendo mobilizado e como ele contribui para a aprendizagem da escrita?”'
when 'e7f58c2a-0762-4cca-9aab-9b773c974553' then
  'Um erro comum é tratar consciência fonológica como sinônimo de alfabetização ou como uma habilidade que aparece sempre do mesmo jeito. Outro é propor atividades sonoras sem conexão com o que se pretende ensinar. Em provas, diferencie reflexão sobre sons de simples pronúncia ou repetição e observe se a atividade está alinhada ao objetivo de aprendizagem.'
when '6e6e5b57-fbbe-44e6-b1ff-2b1a46a13b18' then
  'Revise assim: consciência fonológica significa refletir sobre a estrutura sonora da fala; diferentes tarefas podem focalizar unidades diferentes; a progressão deve respeitar conhecimentos prévios; atividades precisam ter objetivo didático; relações entre som e escrita podem ser exploradas de maneira explícita. Para testar sua compreensão, dê um exemplo de atividade e explique qual análise sonora ela favorece.'

when '34cbf288-6b8b-4177-9114-4fcba060b939' then
  'Ler envolve construir sentidos a partir da interação entre o texto, os conhecimentos do leitor e a situação de leitura. Por isso, compreender um texto não é apenas pronunciar palavras corretamente. O leitor precisa identificar informações, estabelecer relações, fazer inferências quando necessário e considerar a finalidade da leitura. Em provas, procure uma visão de leitura como construção de sentido, e não apenas como decodificação.'
when 'afbaa035-9e39-4339-ab48-126763178ac4' then
  'Produzir um texto envolve decidir o que dizer, para quem, com qual finalidade e em qual gênero ou formato. O estudante precisa organizar ideias e considerar recursos da escrita adequados à situação. Em uma proposta de produção, o processo pode incluir planejamento, escrita e revisão. A escrita melhora quando existe um propósito comunicativo claro, e não quando o aluno apenas copia um modelo.'
when '8dbdf0e1-4a10-4c64-b596-0968bfce4475' then
  'Fluência está relacionada à realização da leitura com suficiente automaticidade para que a atenção possa ser direcionada também à construção de sentido. Compreensão, porém, não depende apenas de velocidade. Um leitor pode ler com fluência e ainda não compreender bem determinado texto. Por isso, ensino e avaliação precisam considerar diferentes aspectos da leitura e a finalidade da tarefa.'
when 'b5da4d3a-2c0e-4b19-9c21-633bdca0cf03' then
  'Práticas sociais de leitura e escrita acontecem em situações concretas: ler instruções, estudar, escrever uma mensagem, preencher um formulário, produzir um aviso ou interpretar um texto para tomar uma decisão. Uma boa situação didática preserva a finalidade social ao mesmo tempo em que trabalha conhecimentos linguísticos e textuais. Em prova, observe se a atividade tem contexto, destinatário e propósito definidos.'
when '0ca89842-1795-4591-92fc-a032fc2a4468' then
  'Um erro comum é considerar que ler bem significa apenas pronunciar palavras ou que escrever bem significa apenas evitar erros ortográficos. Outro é usar gêneros sociais apenas como “enfeite” para exercícios que não têm finalidade real. Questões bem construídas costumam valorizar compreensão, propósito comunicativo, revisão e uso contextualizado da língua.'
when 'b611c7f4-b39e-4205-8795-92e3405e2380' then
  'Resumo: leitura envolve construção de sentido; produção escrita envolve propósito, destinatário e organização; fluência ajuda a liberar atenção para a compreensão; práticas sociais dão função à linguagem escrita. Para revisar, compare uma atividade centrada apenas em repetição com outra que tenha uma finalidade real de leitura ou escrita e explique o que muda pedagogicamente.'

when '464eda2c-d58c-44ad-8a29-a2fa5b7b5a45' then
  'Didática é o campo que estuda e orienta questões relacionadas ao ensino, suas finalidades, condições, escolhas e relações com a aprendizagem. Na prática, isso significa pensar por que ensinar determinado conteúdo, para quem, em que contexto, com quais estratégias e como observar os resultados. A Didática não é uma coleção fixa de técnicas; envolve análise e tomada de decisões.'
when 'ab575b90-e05e-45bc-b859-7247b07d79a0' then
  'Ensinar e aprender são processos relacionados, mas não idênticos. O professor cria condições, seleciona conteúdos, propõe situações e acompanha o percurso; o estudante participa ativamente da construção de conhecimentos. Uma atividade de ensino só faz sentido quando considera o que se pretende que o aluno aprenda e as condições concretas para que isso aconteça. O planejamento e a avaliação ajudam a acompanhar essa relação.'
when '65507833-77d6-4592-9148-ba1709ff6bf0' then
  'Mediação significa organizar intervenções e situações que favoreçam a aprendizagem. Intencionalidade significa que as escolhas docentes têm objetivos. Contexto lembra que nenhum ensino acontece no vazio: tempo, recursos, conhecimentos prévios, turma e condições institucionais interferem nas decisões. Em prova, alternativas muito genéricas que tratam uma técnica como universal costumam ignorar essa dimensão contextual.'
when 'aaf6b01f-e3ec-48cd-bb5a-563403b3df12' then
  'Imagine uma turma com dificuldade para compreender um conceito. Uma decisão didática pode ser mudar o exemplo, retomar um conhecimento anterior, propor comparação entre casos ou organizar uma prática com feedback. Não existe uma única resposta válida para todos os contextos. O importante é justificar a escolha pelo objetivo de aprendizagem, pelas características da turma e pelas evidências observadas.'
when '0d1dd1a1-1f9f-4dc5-bfc3-40442bf4637b' then
  'Um erro comum é tratar Didática como sinônimo de “aplicar métodos” ou acreditar que ensinar bem depende de uma técnica universal. Também é inadequado separar completamente ensino e aprendizagem. Em questões de prova, dê atenção a alternativas que valorizam intencionalidade, mediação, contexto e acompanhamento do aluno.'
when 'bbceafb7-0040-4842-ba93-54fb12c5e9b6' then
  'Para revisar: Didática estuda e orienta o ensino; ensinar envolve intencionalidade; aprender envolve participação do estudante; mediação e contexto influenciam as escolhas; decisões didáticas precisam ser coerentes com os objetivos e com as evidências de aprendizagem. Uma boa checagem é explicar uma decisão docente e dizer qual objetivo ela atende.'

when '99c8787c-56bf-4071-83b8-f2de8c878a3b' then
  'Planejamento do ensino é o processo de antecipar e organizar decisões sobre o que será ensinado, para quem, com quais objetivos, conteúdos, estratégias e formas de acompanhamento. Ele não é uma peça burocrática feita apenas para cumprir exigências. Seu valor está em tornar as escolhas mais conscientes e facilitar a análise do que precisa ser mantido ou ajustado.'
when 'f68ed64b-f73f-4673-aa98-1f8a464ba4aa' then
  'Um planejamento coerente conecta quatro elementos centrais: objetivos, conteúdos, métodos e avaliação. O objetivo indica a aprendizagem pretendida; o conteúdo especifica o conhecimento ou objeto trabalhado; o método organiza as experiências de ensino; e a avaliação produz evidências para verificar o que ocorreu. Quando um desses elementos contradiz os demais, a sequência perde coerência.'
when '96ee75ac-69d9-49c8-b7f0-99e8b66c5adf' then
  'Planejar não elimina imprevistos. A realidade da prática educativa pode exigir mudanças porque a turma aprende em ritmos diferentes, surgem dúvidas, faltam recursos ou o tempo disponível muda. Flexibilidade não significa ausência de planejamento. Significa usar o planejamento como referência e revisar decisões quando as evidências mostram que outro caminho será mais adequado.'
when '6433afff-cb17-4d98-b0ea-93437bad47a4' then
  'Planejar também é escolher prioridades. O professor decide o que é essencial, qual sequência faz sentido, quanto tempo dedicar a cada etapa e como saber se os objetivos estão sendo alcançados. Uma forma útil de estudar é perguntar, em ordem: “O que quero que o aluno aprenda?”, “Que experiências podem favorecer isso?” e “Que evidências me mostrarão se aconteceu?”.'
when 'dcc52f24-15bb-4e9f-b5c6-9d501620948e' then
  'Na hora da prova, leia o planejamento como uma rede de relações. Se o objetivo pede que o aluno analise, uma atividade baseada apenas em cópia pode ser pouco coerente. Se a avaliação mede algo diferente do objetivo, existe desalinhamento. Se a turma não avançou, a resposta adequada pode ser revisar a proposta. A ideia central é coerência com possibilidade de ajuste.'
when 'dcc52f24-15bb-4e9f-b5c6-9d501620948e' then
  'Para revisar, lembre-se: planejar é antecipar decisões; objetivos indicam aprendizagens; conteúdos definem o que será trabalhado; métodos organizam experiências; avaliação produz evidências; contexto interfere; planejamento pode ser revisto. Antes de uma prova, tente montar mentalmente uma sequência simples e verificar se objetivo, atividade e avaliação apontam para a mesma aprendizagem.'
else content
end,
section_type = case id
  when '99c8787c-56bf-4071-83b8-f2de8c878a3b' then 'concept'
  when 'f68ed64b-f73f-4673-aa98-1f8a464ba4aa' then 'explanation'
  when '96ee75ac-69d9-49c8-b7f0-99e8b66c5adf' then 'deepening'
  when '6433afff-cb17-4d98-b0ea-93437bad47a4' then 'explanation'
  when 'dcc52f24-15bb-4e9f-b5c6-9d501620948e' then 'review'
  else section_type
end
where id in (
  'e449e3f9-bed6-4891-a09a-fb1b6304a675','d6521bf7-e7f1-47bf-a006-581259d805e7','01619bd1-1941-44a9-a4ad-69f4c55a5e2a','cedf59a0-c053-4651-ae0c-ba1c6aab241a','4284db4e-044f-4afe-8cba-5e03b1db6c32','daac1450-1c23-46b3-95ef-0a713482dedc',
  '88d1916b-4cc2-4fa3-9822-07b533cfe4cb','2f6029e9-3406-4a73-8bec-77c3a3d879f0','c091e5f5-0f82-4bcb-b0d1-ba0ef04e1a79','3a1bce2a-27ec-473c-afe9-ab03085425b8','cb7d9d89-0f5c-42b5-a856-87fba7066521','56f3c06f-1a17-41a1-91fa-a0139658fd60',
  '36be4265-d7b6-45c8-b35c-12bcf8597570','9a24ac68-ffa9-46e5-b31c-a334e34d3e93','ec701221-0567-4561-b947-247093ca783f','907b0bfa-31b2-4b81-94dc-5c2912e67fae','e7f58c2a-0762-4cca-9aab-9b773c974553','6e6e5b57-fbbe-44e6-b1ff-2b1a46a13b18',
  '34cbf288-6b8b-4177-9114-4fcba060b939','afbaa035-9e39-4339-ab48-126763178ac4','8dbdf0e1-4a10-4c64-b596-0968bfce4475','b5da4d3a-2c0e-4b19-9c21-633bdca0cf03','0ca89842-1795-4591-92fc-a032fc2a4468','b611c7f4-b39e-4205-8795-92e3405e2380',
  '464eda2c-d58c-44ad-8a29-a2fa5b7b5a45','ab575b90-e05e-45bc-b859-7247b07d79a0','65507833-77d6-4592-9148-ba1709ff6bf0','aaf6b01f-e3ec-48cd-bb5a-563403b3df12','0d1dd1a1-1f9f-4dc5-bfc3-40442bf4637b','bbceafb7-0040-4842-ba93-54fb12c5e9b6',
  '99c8787c-56bf-4071-83b8-f2de8c878a3b','f68ed64b-f73f-4673-aa98-1f8a464ba4aa','96ee75ac-69d9-49c8-b7f0-99e8b66c5adf','6433afff-cb17-4d98-b0ea-93437bad47a4','dcc52f24-15bb-4e9f-b5c6-9d501620948e',
  '4e270831-ce71-4ea8-8699-8f3dd9b5b7e0','3339848e-d3ee-45a4-aee7-8ee0fdf13c69','4270ee07-d767-4e22-8fc0-1a6baadd2df8','d0afcd05-d733-4ab5-84c7-748a10bd01bf','0db3cf02-bb30-4da6-b123-736b43949977','5b13f982-66ab-48d4-acd7-686f90e3f9c1',
  '98f9fc65-8755-4e2d-9256-1c702a8bc6d7','b9fe36a7-11e3-4f4e-b9d6-9dbd26e653e5','7b1ffbdf-f1f8-4c9e-8807-9f6a62b9162f','37e14005-0587-4587-a3e0-8049afa41b8d','d86eb0ce-889c-402a-8ff4-cad3adcc276f','9ef9933c-3980-4606-8ed8-b126fd6c9c87'
);

-- Corrige e padroniza o material legado de Planejamento do ensino.
update public.material_sections
set position = 6,
    section_type = 'review',
    content = 'Para revisar, lembre-se: planejar é antecipar decisões; objetivos indicam aprendizagens; conteúdos definem o que será trabalhado; métodos organizam experiências; avaliação produz evidências; contexto interfere; planejamento pode ser revisto. Antes de uma prova, tente montar mentalmente uma sequência simples e verificar se objetivo, atividade e avaliação apontam para a mesma aprendizagem.'
where id = 'dcc52f24-15bb-4e9f-b5c6-9d501620948e';

insert into public.material_sections (
  material_id, title, content, position, section_type
)
select
  '84439dee-5451-47a7-9062-9a7664db631d',
  'Exemplo de planejamento',
  'Pense em uma aula cujo objetivo seja analisar diferentes estratégias de ensino. O conteúdo precisa oferecer situações que permitam essa análise; o método deve dar espaço para comparação e discussão; e a avaliação precisa produzir alguma evidência de que o aluno conseguiu analisar. Esse exemplo mostra a lógica do alinhamento. Em uma questão, procure a alternativa em que o objetivo, a atividade e a avaliação apontam para a mesma aprendizagem.',
  5,
  'examples'
where not exists (
  select 1
  from public.material_sections
  where material_id='84439dee-5451-47a7-9062-9a7664db631d'
    and title='Exemplo de planejamento'
);

update public.material_sections
set content = case id
  when '4e270831-ce71-4ea8-8699-8f3dd9b5b7e0' then
    'Objetivos de aprendizagem descrevem aquilo que se espera que o estudante desenvolva. Um objetivo útil orienta escolhas posteriores: o que será ensinado, que atividade será proposta e que evidência será observada. Em vez de pensar apenas em “dar o conteúdo”, pergunte qual ação ou aprendizagem o aluno deverá demonstrar ao final. Essa definição ajuda a tornar o ensino mais intencional.'
  when '3339848e-d3ee-45a4-aee7-8ee0fdf13c69' then
    'Conteúdos são os conhecimentos, conceitos, procedimentos ou práticas que entram em foco no ensino. Selecioná-los não é simplesmente listar tudo o que existe sobre um assunto. É necessário considerar objetivos, relevância, conhecimentos prévios, tempo e contexto. Uma boa seleção ajuda o aluno a avançar sem transformar a aula em acúmulo de informações.'
  when '4270ee07-d767-4a73-8bec-77c3a3d879f0' then content
  when 'd0afcd05-d733-4ab5-84c7-748a10bd01bf' then
    'Alinhamento significa coerência entre objetivo, conteúdo, método e avaliação. Se o objetivo é que o aluno compare argumentos, uma atividade baseada apenas em cópia pode não ser suficiente. Se a avaliação cobra uma habilidade diferente da trabalhada, existe desalinhamento. Para analisar uma questão, siga a sequência: “o que quero que o aluno aprenda → que experiência favorece essa aprendizagem → que evidência confirma que ela ocorreu?”.'
  when '0db3cf02-bb30-4da6-b123-736b43949977' then
    'Um erro comum é tratar objetivos, conteúdos e métodos como listas independentes. Outro é escolher a estratégia porque ela “parece boa” sem verificar o objetivo. Também é possível ter um conteúdo relevante, mas avaliá-lo de forma incompatível. Em prova, priorize alternativas que justificam a escolha do método e demonstram coerência entre aquilo que se pretende ensinar e aquilo que se observa.'
  when '5b13f982-66ab-48d4-acd7-686f90e3f9c1' then
    'Resumo: objetivos orientam a aprendizagem pretendida; conteúdos definem o que será trabalhado; métodos organizam experiências; avaliação produz evidências; contexto interfere em todas as escolhas. O ponto central é o alinhamento. Para revisar, pegue um objetivo qualquer e escreva uma atividade e uma forma de avaliação que realmente o desenvolvam e observem.'
  when '98f9fc65-8755-4e2d-9256-1c702a8bc6d7' then
    'Avaliar a aprendizagem é produzir e interpretar evidências para tomar decisões sobre o processo educativo. Avaliação não se resume à nota final. Uma pergunta, uma produção, uma discussão ou uma atividade prática podem gerar evidências, desde que exista um critério para interpretá-las. O valor pedagógico da avaliação aparece quando os resultados ajudam a compreender o que já foi aprendido e o que ainda precisa ser trabalhado.'
  when 'b9fe36a7-11e3-4f4e-b9d6-9dbd26e653e5' then
    'A avaliação diagnóstica ajuda a conhecer o ponto de partida; a formativa acompanha o processo e oferece informações para ajustar o ensino; a somativa é usada para uma apreciação ao final de determinado percurso. Essas funções podem aparecer em momentos diferentes e não precisam ser tratadas como caixas totalmente separadas. O importante é perguntar qual função a avaliação exerce naquela situação.'
  when '7b1ffbdf-f1f8-4c9e-8807-9f6a62b9162f' then
    'Critérios explicitam o que será considerado para interpretar uma produção ou desempenho. Evidências são os dados observáveis usados nessa interpretação. Feedback devolve ao estudante informações que podem orientar o próximo passo. Um bom feedback não é apenas “certo” ou “errado”; ele ajuda a perceber o que foi feito, onde está a dificuldade e como avançar.'
  when '37e14005-0587-4587-a3e0-8049afa41b8d' then
    'Imagine que uma atividade revele que muitos alunos conseguem repetir um conceito, mas têm dificuldade para aplicá-lo em uma situação nova. A informação pode levar o professor a propor novos exemplos, mudar a tarefa ou retomar um conceito relacionado. Aqui a avaliação deixa de ser apenas registro e passa a orientar o ensino. Em prova, procure essa relação entre evidência, interpretação e decisão pedagógica.'
  when 'd86eb0ce-889c-402a-8ff4-cad3adcc276f' then
    'Um erro comum é tratar a nota como sinônimo de avaliação ou usar uma prova apenas para classificar os alunos. Também é problemático dar feedback sem indicar como melhorar. Em questões de prova, desconfie de alternativas que separam avaliação de ensino ou que reduzem a avaliação formativa a uma nota intermediária.'
  when '9ef9933c-3980-4606-8ed8-b126fd6c9c87' then
    'Resumo: avaliar é produzir e interpretar evidências; a função da avaliação depende do momento e do uso; critérios tornam a interpretação mais clara; feedback orienta o próximo passo; resultados podem levar à revisão do ensino. Para revisar, explique a diferença entre avaliar para conhecer, acompanhar e apreciar um percurso e dê um exemplo de cada uso.'
  else content
end,
section_type = case id
  when '4e270831-ce71-4ea8-8699-8f3dd9b5b7e0' then 'concept'
  when '3339848e-d3ee-45a4-aee7-8ee0fdf13c69' then 'explanation'
  when '4270ee07-d767-4a22-8fc0-1a6baadd2df8' then 'deepening'
  when 'd0afcd05-d733-4ab5-84c7-748a10bd01bf' then 'examples'
  when '0db3cf02-bb30-4da6-b123-736b43949977' then 'common_mistakes'
  when '5b13f982-66ab-48d4-acd7-686f90e3f9c1' then 'review'
  when '98f9fc65-8755-4e2d-9256-1c702a8bc6d7' then 'concept'
  when 'b9fe36a7-11e3-4f4e-b9d6-9dbd26e653e5' then 'explanation'
  when '7b1ffbdf-f1f8-4c9e-8807-9f6a62b9162f' then 'deepening'
  when '37e14005-0587-4587-a3e0-8049afa41b8d' then 'examples'
  when 'd86eb0ce-889c-402a-8ff4-cad3adcc276f' then 'common_mistakes'
  when '9ef9933c-3980-4606-8ed8-b126fd6c9c87' then 'review'
  else section_type
end
where id in (
  '4e270831-ce71-4ea8-8699-8f3dd9b5b7e0',
  '3339848e-d3ee-45a4-aee7-8ee0fdf13c69',
  '4270ee07-d767-4a22-8fc0-1a6baadd2df8',
  'd0afcd05-d733-4ab5-84c7-748a10bd01bf',
  '0db3cf02-bb30-4da6-b123-736b43949977',
  '5b13f982-66ab-48d4-acd7-686f90e3f9c1',
  '98f9fc65-8755-4e2d-9256-1c702a8bc6d7',
  'b9fe36a7-11e3-4f4e-b9d6-9dbd26e653e5',
  '7b1ffbdf-f1f8-4c9e-8807-9f6a62b9162f',
  '37e14005-0587-4587-a3e0-8049afa41b8d',
  'd86eb0ce-889c-402a-8ff4-cad3adcc276f',
  '9ef9933c-3980-4606-8ed8-b126fd6c9c87'
);
