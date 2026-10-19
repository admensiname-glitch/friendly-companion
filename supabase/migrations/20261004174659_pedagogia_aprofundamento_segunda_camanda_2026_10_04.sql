
with base as (
 select ms.id,ms.position,d.name discipline,ms.content
 from public.material_sections ms
 join public.materials m on m.id=ms.material_id
 join public.topics t on t.id=m.topic_id
 join public.disciplines d on d.id=t.discipline_id
 where length(coalesce(ms.content,''))<350
   and coalesce(ms.content,'') not like '%[SEGUNDA-CAMADA-PEDAGOGIA-2026]%'
),
x as (
 select *,case
 when discipline ilike '%Estágio%' or discipline ilike '%Seminário%' then
  case position
   when 1 then 'Aprofundamento: formule também a pergunta profissional que o conceito ajuda a responder e indique quais evidências seriam necessárias para sustentar a resposta.'
   when 2 then 'Aprofundamento: compare pelo menos duas interpretações possíveis e explicite o critério usado para escolher entre elas.'
   when 3 then 'Aprofundamento: mostre como uma decisão prática pode confirmar, tensionar ou exigir revisão do referencial teórico.'
   when 4 then 'Aprofundamento: transforme a situação em um pequeno problema de intervenção, delimitando objetivo, ação, evidência e possibilidade de ajuste.'
   when 5 then 'Aprofundamento: diferencie fato observado, interpretação e julgamento profissional; essa separação protege a qualidade do registro.'
   when 6 then 'Aprofundamento: pergunte que evidência mudaria a decisão inicial e como a avaliação poderia produzir essa informação.'
   when 7 then 'Aprofundamento: explicite a responsabilidade ética envolvida e os limites do papel profissional naquele contexto.'
   when 8 then 'Aprofundamento: conecte a experiência a currículo, ensino, avaliação e contexto institucional sem reduzir o caso a uma única variável.'
   when 9 then 'Aprofundamento: registre uma limitação da análise e uma hipótese alternativa antes de formular uma conclusão.'
   else 'Aprofundamento: sintetize a aprendizagem profissional em uma decisão que possa ser justificada, observada e posteriormente revisada.'
  end
 when discipline ilike '%Metodologia%' or discipline ilike '%Pesquisa%' or discipline ilike '%Trabalho de Conclusão%' then
  case position
   when 1 then 'Aprofundamento: delimite unidade de análise, contexto e pergunta para evitar que o tema permaneça amplo demais.'
   when 2 then 'Aprofundamento: identifique quais autores, conceitos ou resultados da literatura realmente sustentam a decisão e quais apenas oferecem contexto.'
   when 3 then 'Aprofundamento: justifique o método pela natureza da pergunta e pela evidência necessária, não pela preferência do pesquisador.'
   when 4 then 'Aprofundamento: explicite como dados serão produzidos, analisados e relacionados ao problema, reconhecendo limites de inferência.'
   when 5 then 'Aprofundamento: se houver integração de métodos, indique em que ponto os resultados serão confrontados ou combinados e por quê.'
   when 6 then 'Aprofundamento: antecipe riscos éticos, proteção de participantes, confidencialidade e responsabilidades no uso dos dados.'
   when 7 then 'Aprofundamento: procure coerência entre pergunta, objetivo, método, análise e conclusão; uma falha em um elo pode comprometer a interpretação.'
   when 8 then 'Aprofundamento: diferencie resultado observado, interpretação analítica e implicação possível para a educação.'
   when 9 then 'Aprofundamento: formule pelo menos uma explicação alternativa e indique por que os dados disponíveis favorecem ou não cada interpretação.'
   else 'Aprofundamento: uma conclusão rigorosa deve ser proporcional à evidência, declarar limites e indicar o que ainda precisaria ser investigado.'
  end
 else
  case position
   when 1 then 'Aprofundamento: relacione o conceito a uma pergunta pedagógica concreta e indique o que uma resposta adequada precisaria explicar.'
   when 2 then 'Aprofundamento: compare o conceito com uma noção próxima e mostre a consequência prática de confundi-los.'
   when 3 then 'Aprofundamento: identifique pelo menos uma condição contextual que pode modificar a forma como o conceito aparece na prática.'
   when 4 then 'Aprofundamento: descreva uma decisão pedagógica coerente com o conceito e a evidência que permitiria avaliar essa decisão.'
   when 5 then 'Aprofundamento: explicite o critério de qualidade usado para analisar a prática, evitando depender apenas de opinião.'
   when 6 then 'Aprofundamento: indique como a evidência produzida pode orientar uma nova ação e não apenas registrar o que já aconteceu.'
   when 7 then 'Aprofundamento: considere quem pode ser beneficiado ou prejudicado pela escolha e quais barreiras precisam ser enfrentadas.'
   when 8 then 'Aprofundamento: articule o conceito a pelo menos um elemento do currículo, ensino, avaliação ou contexto institucional.'
   when 9 then 'Aprofundamento: registre uma limitação ou tensão do conceito e explique em que condições sua aplicação precisaria ser revista.'
   else 'Aprofundamento: demonstre domínio transferindo o conceito para uma situação nova e justificando a decisão com fundamentos e evidências.'
  end
 end || ' [SEGUNDA-CAMADA-PEDAGOGIA-2026]' extra from base)
update public.material_sections ms
set content=trim(ms.content)||E'\n\n'||x.extra,updated_at=now()
from x where ms.id=x.id;
