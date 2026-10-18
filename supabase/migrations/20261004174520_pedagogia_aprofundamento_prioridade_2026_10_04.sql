with targets as (
 select unnest(array[
 '2d14fbe2-db06-4ab1-8a20-d6d783311e43'::uuid,
 '857e4787-39bd-41b4-a062-fc2a3257d0ee'::uuid,
 '27e50bda-6bbd-45c9-8156-6b7ed6633456'::uuid,
 'a04c6bf2-cd23-4aa5-aa43-e868b12370c6'::uuid,
 '65d0f01c-b830-4386-a910-f34d624b4a23'::uuid,
 '68b0b488-b976-4a8f-8e1c-74f58037793a'::uuid,
 '6caf006a-9efc-46b7-8e00-37b20e44719e'::uuid,
 'e9bf2ef5-e25f-43fa-97f9-23dd842f1511'::uuid,
 '941645bd-bb16-42c8-8795-5638b8185a51'::uuid,
 '7b5fefd0-5f64-4641-b76f-61a7e32c944f'::uuid,
 '5316d1ee-fd61-4b3e-8299-39fd240a5843'::uuid,
 '055be9a1-143f-499f-8711-8bf8dc75e8d6'::uuid,
 '7a1ee5b1-49e4-4722-9241-a9cd33464be0'::uuid,
 '37177ecb-09fa-4abf-a75d-ffbf603fb92b'::uuid,
 'c8cc689b-7947-424b-9562-21e9df473d2f'::uuid,
 'd779deee-dd06-4ad1-b57c-d1b4575756a0'::uuid,
 '649edfe1-50e4-48d8-a3cf-e0cc963961f6'::uuid,
 '0c202ac8-8766-433a-b70b-99d10093998d'::uuid,
 '28a9b80a-6b25-4096-9a60-7e7045f0c566'::uuid,
 '310cd23c-a9c8-45b7-9e53-ad8e814a5ee9'::uuid
 ]) id
),
base as (
 select ms.id,ms.position,ms.title,ms.content,m.title material_title,d.name discipline
 from public.material_sections ms
 join public.materials m on m.id=ms.material_id
 join public.topics t on t.id=m.topic_id
 join public.disciplines d on d.id=t.discipline_id
 join targets x on x.id=m.id
 where coalesce(ms.content,'') not like '%[APROFUNDAMENTO-PEDAGOGIA-2026]%'
),
lens as (
 select *,case position
  when 1 then 'O ponto central é definir o conceito com precisão e delimitar o que ele significa no campo da Pedagogia, evitando tratá-lo como sinônimo de ideias próximas. A definição ganha valor quando permite reconhecer o conceito em situações concretas e justificar por que ele é pedagogicamente relevante.'
  when 2 then 'Uma distinção importante é separar princípios, objetivos e procedimentos: princípios orientam decisões, objetivos explicitam aprendizagens ou finalidades e procedimentos materializam escolhas. Essa separação ajuda a analisar práticas sem reduzir a ação educativa a uma receita.'
  when 3 then 'A compreensão também exige considerar as condições históricas, sociais e institucionais que dão sentido ao tema. Em educação, uma mesma prática pode produzir efeitos diferentes conforme sujeitos, território, relações de poder, recursos disponíveis e finalidade formativa.'
  when 4 then 'Na prática pedagógica, o conceito pode ser observado quando o educador transforma uma intenção em decisão verificável: o que será proposto, para quem, com quais recursos e com que evidências de aprendizagem ou participação. O planejamento deve manter espaço para revisão diante das respostas dos estudantes.'
  when 5 then 'Um uso qualificado do conceito depende de critérios explícitos. Em vez de perguntar apenas se uma atividade foi realizada, é necessário analisar sua adequação ao objetivo, a participação dos estudantes e as evidências produzidas, distinguindo descrição da prática de interpretação sobre seus efeitos.'
  when 6 then 'A avaliação do tema deve ser entendida como produção e interpretação de evidências, não apenas como atribuição de nota. Instrumentos, critérios e registros precisam estar coerentes com aquilo que se pretende conhecer, permitindo reorientar o ensino quando os dados revelarem dificuldades ou barreiras.'
  when 7 then 'Há ainda uma dimensão de equidade: decisões pedagógicas podem ampliar ou restringir participação conforme as barreiras presentes. Uma análise responsável pergunta quem consegue acessar, compreender, participar e demonstrar o que aprendeu e quais adaptações ou apoios são justificáveis sem reduzir as expectativas de aprendizagem.'
  when 8 then 'O tema se articula a outros conhecimentos da formação pedagógica. Essa relação não significa misturar conceitos indiscriminadamente; significa explicitar como currículo, ensino, avaliação, contexto e desenvolvimento se influenciam e em que momento cada referência ajuda a interpretar o problema.'
  when 9 then 'Uma leitura crítica precisa reconhecer limites e tensões. Não existe solução pedagógica universal: evidências precisam ser interpretadas à luz do contexto, da finalidade educativa e dos sujeitos envolvidos. A escolha profissional deve ser justificável, revisável e aberta à reflexão sobre consequências não previstas.'
  else 'Como síntese, dominar o tema significa conseguir explicá-lo, diferenciá-lo de conceitos próximos, aplicá-lo a uma situação e justificar decisões pedagógicas com argumentos e evidências. Esse domínio é mais robusto quando o estudante consegue transferir o conhecimento para um problema novo, em vez de apenas reproduzir definições.'
 end || ' [APROFUNDAMENTO-PEDAGOGIA-2026]' extra
 from base
)
update public.material_sections ms
set content=trim(ms.content)||E'\n\n'||lens.extra,
    updated_at=now()
from lens
where ms.id=lens.id;
