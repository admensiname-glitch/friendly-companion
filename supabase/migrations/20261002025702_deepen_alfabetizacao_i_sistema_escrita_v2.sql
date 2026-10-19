
BEGIN;

UPDATE public.materials m
SET
  introduction = 'Neste tópico você vai compreender como o sistema de escrita alfabética organiza relações convencionais entre a fala e a escrita. A ideia não é decorar correspondências isoladas, mas entender como grafemas, fonemas, sílabas e regularidades ortográficas entram em jogo na leitura e na escrita. Ao final, você deverá conseguir analisar produções de estudantes, reconhecer diferentes tipos de regularidade e escolher intervenções didáticas que combinem explicitação, comparação, leitura e escrita em situações significativas.'
FROM public.topics t
JOIN public.disciplines d ON d.id = t.discipline_id
WHERE m.topic_id = t.id
  AND d.name = 'Alfabetização I'
  AND t.name = 'Sistema de escrita alfabética'
  AND m.status = 'published';

WITH target AS (
  SELECT m.id AS material_id
  FROM public.materials m
  JOIN public.topics t ON t.id = m.topic_id
  JOIN public.disciplines d ON d.id = t.discipline_id
  WHERE d.name = 'Alfabetização I'
    AND t.name = 'Sistema de escrita alfabética'
    AND m.status = 'published'
)
UPDATE public.material_sections ms
SET content = CASE ms.position
  WHEN 1 THEN 'O princípio alfabético é a compreensão de que a escrita alfabética representa aspectos sonoros da língua por meio de unidades gráficas convencionais. Para o aprendiz, isso significa perceber que as letras e combinações de letras não são desenhos escolhidos ao acaso: elas participam de um sistema que pode ser analisado, comparado e aprendido. Essa compreensão permite ler e escrever palavras novas, porque o estudante passa a usar relações já conhecidas em situações que ainda não havia memorizado.

É importante não transformar o princípio alfabético em uma ideia de correspondência perfeita. Em português, algumas relações entre som e escrita são mais previsíveis do que outras, e o contexto pode alterar a leitura de determinadas grafias. Portanto, compreender o princípio é perceber a lógica do sistema, não decorar uma lista de pares fixos.

Pergunta-guia: o estudante está apenas reconhecendo palavras conhecidas ou já consegue usar conhecimentos sobre o sistema para ler e escrever palavras novas?'
  WHEN 2 THEN 'Grafemas são unidades gráficas que participam da representação escrita; fonemas são unidades sonoras contrastivas que ajudam a distinguir palavras na língua. A relação entre os dois conceitos é central para compreender a escrita alfabética, mas eles não são a mesma coisa.

Também não vale reduzir tudo à fórmula “uma letra = um som”. Há grafemas formados por uma única letra e por combinações de letras, e uma mesma letra pode assumir valores diferentes conforme a palavra ou o contexto. Por isso, o estudante precisa aprender relações e padrões do sistema, observando exemplos e contrastes.

Ao analisar uma atividade, pergunte qual unidade está sendo focalizada: uma letra, uma combinação de letras, uma sílaba, um som ou uma palavra inteira. Essa precisão evita usar “fonema”, “grafema” e “sílaba” como se fossem sinônimos.'
  WHEN 3 THEN 'O sistema de escrita apresenta regularidades, mas também apresenta relações que exigem atenção ao contexto e às convenções ortográficas. Para o ensino, isso significa organizar uma progressão: primeiro ajudar o estudante a perceber relações recorrentes e, depois, ampliar o repertório com padrões menos previsíveis e regras que precisam ser aprendidas.

Por exemplo, uma regularidade pode aparecer em várias palavras e permitir ao estudante formular uma expectativa sobre como determinado som costuma ser escrito. Em outros casos, a escolha da grafia depende de informação que precisa ser explicitada ou consultada. O objetivo pedagógico não é convencer o aluno de que “tudo é regra”, mas mostrar onde a escrita oferece pistas e onde a convenção precisa ser aprendida.

Em prova ou planejamento, diferencie três situações: descoberta de uma regularidade, explicitação de uma convenção e memorização de uma forma que não pode ser inferida apenas pelo som.'
  WHEN 4 THEN 'Uma boa situação didática cria oportunidades para observar o sistema em funcionamento. O professor pode selecionar palavras que permitam comparação, pedir que os estudantes expliquem semelhanças e diferenças, testar novas palavras e registrar as justificativas apresentadas.

Outra possibilidade é partir de uma produção escrita real. Em vez de corrigir todas as palavras de uma vez, o professor escolhe um conjunto relacionado ao objetivo da aula e propõe perguntas como: “O que muda quando trocamos esta letra?”, “Por que essas duas palavras começam do mesmo jeito?” ou “Que outras palavras seguem esse padrão?”. Assim, a escrita do aluno vira evidência para decidir o próximo ensino.

Atividades produtivas não são apenas listas de exercícios. Elas combinam um objetivo linguístico claro, comparação, explicitação e oportunidade de aplicar o conhecimento em leitura e escrita.'
  WHEN 5 THEN 'Um erro comum é ensinar o sistema apenas por repetição mecânica de letras, sílabas e palavras. Outro é esperar que o aluno descubra sozinho todas as regularidades, sem mediação ou explicitação. Os dois extremos podem dificultar a aprendizagem.

Também é problemático tratar a escrita como se fosse totalmente transparente: nem toda relação entre fala e grafia é previsível a partir do som. Da mesma forma, não é adequado transformar cada palavra irregular em uma exceção sem mostrar que o sistema também possui padrões.

Ao avaliar uma proposta pedagógica, procure equilíbrio: ensino intencional, reflexão sobre relações grafofonêmicas, observação de regularidades, leitura, escrita e retomada de convenções que precisam ser ensinadas de forma explícita.'
  WHEN 6 THEN 'O sistema de escrita alfabética é um sistema convencional que organiza relações entre unidades sonoras e gráficas e também incorpora regularidades ortográficas. Aprender a escrever, portanto, envolve mais do que conhecer o alfabeto: é preciso compreender como as unidades funcionam em conjunto e usar esse conhecimento para produzir e interpretar palavras.

Esse domínio se desenvolve quando o estudante pode comparar formas escritas, segmentar e combinar unidades, relacionar o que fala ao que registra e observar padrões em palavras reais. O ensino explícito é importante porque torna visíveis relações que o aluno pode não perceber sozinho.

Para estudar, guarde a sequência de ideias: princípio alfabético → relações grafofonêmicas → regularidades e convenções ortográficas → uso em leitura e escrita. Uma capacidade de copiar corretamente uma palavra conhecida não prova, sozinha, compreensão do sistema.'
  WHEN 7 THEN 'Quando um estudante escreve uma palavra de maneira não convencional, a produção pode revelar quais relações ele já consegue mobilizar. O professor pode observar se a escrita mostra atenção a letras iniciais, partes sonoras, quantidade de unidades, padrões recorrentes ou convenções já ensinadas.

Imagine uma criança que, ao tentar escrever duas palavras diferentes, usa a mesma letra para representar um som percebido como semelhante. Em vez de apenas marcar “errado”, o professor pode pedir que compare as palavras, releia o que escreveu e procure outras palavras que ajudem a testar sua hipótese.

A análise não deve transformar um único erro em diagnóstico fechado. O mais informativo é observar produções em diferentes situações, identificar padrões e usar essas evidências para escolher a próxima intervenção.'
  WHEN 8 THEN 'Princípio alfabético, relações grafofonêmicas e ortografia se articulam, mas representam aprendizagens diferentes. O princípio alfabético sustenta a compreensão de que existe uma relação sistemática entre fala e escrita. As relações grafofonêmicas ajudam a explicitar correspondências entre unidades. A ortografia acrescenta convenções, regularidades e escolhas que nem sempre podem ser decididas apenas pela pronúncia.

Por isso, uma sequência de ensino pode começar com relações mais acessíveis, avançar para comparações entre palavras e incorporar, progressivamente, padrões ortográficos que exigem maior atenção. O estudante precisa ter oportunidades de usar o conhecimento em leitura e escrita, não apenas de responder exercícios sobre nomenclatura.

Quando uma questão apresentar uma prática pedagógica, identifique qual dessas aprendizagens está sendo trabalhada e que evidência permite dizer que houve avanço.'
  WHEN 9 THEN 'Você domina este tópico quando consegue explicar o princípio alfabético sem reduzi-lo a “uma letra para cada som”; diferenciar fonema, grafema e sílaba; reconhecer que existem regularidades e complexidades na escrita; analisar uma produção não convencional como evidência de aprendizagem; e propor uma intervenção que combine reflexão, explicitação e uso.

Em uma prova, desconfie de alternativas que apresentem a escrita como totalmente regular ou totalmente imprevisível. Também examine propostas que confundam cópia com aprendizagem, ou que tratem correção como simples marcação de erro.

Em um trabalho acadêmico, use exemplos concretos de palavras e situações didáticas para mostrar como o conhecimento do sistema se desenvolve de forma progressiva.'
  WHEN 10 THEN 'Revise em cinco movimentos: 1) o princípio alfabético explica a lógica geral da relação entre fala e escrita; 2) grafemas e fonemas são unidades diferentes; 3) as relações entre som e grafia apresentam regularidades, mas também dependem de convenções e contextos; 4) o ensino pode usar comparação, análise e explicitação para tornar essas relações visíveis; 5) o conhecimento precisa ser aplicado em leitura e escrita.

Teste sua compreensão sem consultar o texto: escolha uma palavra, descreva o que o estudante precisaria saber para escrevê-la e indique o que o professor poderia fazer para tornar esse conhecimento observável.'
  ELSE ms.content
END,
updated_at = now()
FROM target
WHERE ms.material_id = target.material_id
  AND ms.position BETWEEN 1 AND 10;

COMMIT;
