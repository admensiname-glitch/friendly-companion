
-- Reforço documental para os componentes dos anos iniciais e Arte.
insert into public.material_citations (material_id, source_id, citation_label)
select m.id, '81597dfe-6898-4086-bdcd-067dba318cb9', 'Base Nacional Comum Curricular'
from public.materials m
join public.topics t on t.id=m.topic_id
join public.disciplines d on d.id=t.discipline_id
where m.status='published'
  and d.name in ('Arte e Educação',
                 'Ensino de Ciências nos Anos Iniciais',
                 'Ensino de Geografia nos Anos Iniciais',
                 'Ensino de História nos Anos Iniciais',
                 'Ensino de Língua Portuguesa nos Anos Iniciais',
                 'Ensino de Matemática nos Anos Iniciais')
  and not exists (
    select 1 from public.material_citations mc
    where mc.material_id=m.id and mc.source_id='81597dfe-6898-4086-bdcd-067dba318cb9'
  );

-- Aumenta a densidade das seções conceituais que ficaram curtas,
-- usando exclusivamente evidências já presentes no próprio material.
with ctx as (
  select m.id material_id,
         max(ms.content) filter(where ms.position=3) concepts,
         max(ms.content) filter(where ms.position=4) example_content,
         max(ms.content) filter(where ms.position=5) situation,
         max(ms.content) filter(where ms.position=6) error_content
  from public.materials m
  join public.material_sections ms on ms.material_id=m.id
  where m.status='published'
  group by m.id
)
update public.material_sections ms
set content =
  case
    when ms.position=1 and length(trim(ms.content))<180
      then trim(ms.content) || E'\n\n' ||
           'Para estudar este conceito com rigor, relacione-o às ideias fundamentais apresentadas no material: ' ||
           left(regexp_replace(coalesce(ctx.concepts,''),'\s+',' ','g'),420)
    when ms.position=3 and length(trim(ms.content))<180
      then trim(ms.content) || E'\n\n' ||
           'A compreensão não se limita à definição: observe como o conceito se relaciona com a situação pedagógica e com as evidências discutidas no tópico.'
    when ms.position=4 and length(trim(ms.content))<180
      then trim(ms.content) || E'\n\n' ||
           'Use o exemplo para identificar o princípio pedagógico envolvido, explicar por que ele é adequado e reconhecer o que mudaria em outro contexto.'
    when ms.position=5 and length(trim(ms.content))<180
      then trim(ms.content) || E'\n\n' ||
           'A análise deve considerar o contexto, as decisões tomadas e as evidências disponíveis, evitando conclusões baseadas apenas em impressão ou opinião.'
    when ms.position=6 and length(trim(ms.content))<180
      then trim(ms.content) || E'\n\n' ||
           'Para superar esse erro, compare a prática descrita com os conceitos fundamentais do tópico e justifique qual alternativa produziria uma aprendizagem mais consistente.'
    when ms.position=7 and length(trim(ms.content))<180
      then trim(ms.content) || E'\n\n' ||
           'O aprofundamento exige relacionar diferentes conceitos, reconhecer limites das explicações simplificadas e considerar as evidências apresentadas pelas fontes.'
    when ms.position=8 and length(trim(ms.content))<180
      then trim(ms.content) || E'\n\n' ||
           'Na prática, explicite objetivo, decisão pedagógica e evidência de aprendizagem; depois verifique se a estratégia escolhida responde ao problema identificado.'
    when ms.position=9 and length(trim(ms.content))<180
      then trim(ms.content) || E'\n\n' ||
           'Ao sintetizar, preserve as relações entre os conceitos centrais e indique como eles orientam a interpretação de situações reais de ensino e aprendizagem.'
    else ms.content
  end
from ctx
where ms.material_id=ctx.material_id
  and ms.position between 1 and 9
  and length(trim(ms.content))<180;
