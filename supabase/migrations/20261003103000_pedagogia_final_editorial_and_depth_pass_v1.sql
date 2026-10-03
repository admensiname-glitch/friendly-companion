-- Pedagogia: fechamento editorial e reforço de lastro documental.
with ctx as (
  select m.id material_id, t.name topic, 
         max(ms.content) filter (where ms.position=3) as concepts,
         max(ms.content) filter (where ms.position=4) as example_content,
         max(ms.content) filter (where ms.position=5) as situation
  from public.materials m
  join public.topics t on t.id=m.topic_id
  join public.material_sections ms on ms.material_id=m.id
  where m.status='published'
  group by m.id,t.name
)
update public.material_sections ms
set content =
  case
    when ms.content ~* '^O núcleo de ' then
      'Neste tópico, a ideia central é compreender como ' ||
      regexp_replace(ms.content, '^O núcleo de [^:]+ é ', '', 1, 1, 'i')
    when ms.content ~* '^O ponto central de ' then
      'Neste tópico, é fundamental compreender que ' ||
      regexp_replace(ms.content, '^O ponto central de [^:]+ é ', '', 1, 1, 'i')
    when ms.content ~* '^O estudo de .* deve ajudar o estudante a relacionar experiência, conhecimento e responsabilidade profissional' then
      'Este tópico deve ser relacionado à prática profissional. ' ||
      coalesce(ctx.concepts,'Analise os conceitos apresentados e relacione-os às decisões pedagógicas do campo.') ||
      ' Na formação, o objetivo é transformar experiência em análise fundamentada.'
    when ms.content ~* '^Explique .* e escreva qual evidência de campo ajudaria a demonstrar essa aprendizagem' then
      'Para revisar este tópico, recupere a ideia principal e aplique-a a uma situação concreta do campo. ' ||
      coalesce(ctx.example_content,'Use um exemplo de prática pedagógica para justificar sua resposta.') ||
      ' Em seguida, indique que evidência sustentaria sua interpretação.'
    when ms.content ~* '^Que decisão pedagógica muda quando .* é compreendido como processo e não como tarefa isolada' then
      'Questão de partida: ' || regexp_replace(ms.content, '^Que decisão pedagógica muda quando ', '', 1, 1, 'i')
    when ms.content ~* '^Para compreender .* observe o contexto' then
      'Contextualização: ' || regexp_replace(ms.content, '^Para compreender ', 'ao estudar ', 1, 1, 'i')
    when ms.content ~* '^Na aplicação de .* transforme o conceito' then
      'Aplicação: parta de uma situação concreta relacionada ao tópico e justifique a decisão pedagógica. ' ||
      coalesce(ctx.situation,'Use uma situação-problema do cotidiano educativo como evidência.')
    when ms.content ~* '^Um erro frequente é reduzir ' then
      'Erro a evitar: ' || ms.content
    when ms.content ~* '^Identifique conceitos, processos, sujeitos, evidências' then
      'Para dominar este tópico, organize os conceitos fundamentais, as relações entre eles e as evidências que permitem reconhecê-los na prática. ' ||
      coalesce(ctx.concepts,'Retome os conceitos apresentados no material e explique como eles se articulam.')
    else ms.content
  end
from ctx
where ms.material_id=ctx.material_id
  and (
    ms.content ~* '^O núcleo de '
    or ms.content ~* '^O ponto central de '
    or ms.content ~* '^O estudo de .* deve ajudar o estudante a relacionar experiência, conhecimento e responsabilidade profissional'
    or ms.content ~* '^Explique .* e escreva qual evidência de campo ajudaria a demonstrar essa aprendizagem'
    or ms.content ~* '^Que decisão pedagógica muda quando .* é compreendido como processo e não como tarefa isolada'
    or ms.content ~* '^Para compreender .* observe o contexto'
    or ms.content ~* '^Na aplicação de .* transforme o conceito'
    or ms.content ~* '^Um erro frequente é reduzir '
    or ms.content ~* '^Identifique conceitos, processos, sujeitos, evidências'
  );

with parts as (
  select m.id,
         max(ms.content) filter(where ms.position=1) s1,
         max(ms.content) filter(where ms.position=3) s3,
         max(ms.content) filter(where ms.position=9) s9
  from public.materials m
  join public.material_sections ms on ms.material_id=m.id
  where m.status='published'
  group by m.id
)
update public.materials m
set introduction = left(
  regexp_replace(
    concat_ws(E'\n\n', nullif(trim(parts.s1),''), nullif(trim(parts.s3),''), nullif(trim(parts.s9),'')),
    '\\s+',' ','g'
  ), 1200)
from parts
where m.id=parts.id
  and length(trim(coalesce(m.introduction,''))) < 300;

insert into public.material_citations (material_id, source_id, citation_label)
select m.id, s.id, s.title
from public.materials m
join public.topics t on t.id=m.topic_id
join public.disciplines d on d.id=t.discipline_id
cross join public.sources s
where m.status='published' and s.status='active'
  and s.id='00000000-0000-0000-0000-000000000023'
  and d.name in ('Educação Infantil','Currículo e Organização do Trabalho Pedagógico','Didática','Avaliação da Aprendizagem','Ensino de Língua Portuguesa nos Anos Iniciais','Ensino de Matemática nos Anos Iniciais','Ensino de Ciências nos Anos Iniciais','Ensino de História nos Anos Iniciais','Ensino de Geografia nos Anos Iniciais','Educação Inclusiva','Educação Especial')
  and not exists (select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=s.id);

insert into public.material_citations (material_id, source_id, citation_label)
select m.id, s.id, s.title
from public.materials m
join public.topics t on t.id=m.topic_id
join public.disciplines d on d.id=t.discipline_id
cross join public.sources s
where m.status='published' and s.status='active'
  and s.id='00000000-0000-0000-0000-000000000021'
  and d.name in ('Legislação e Organização da Educação Brasileira','Políticas Públicas Educacionais','Gestão Escolar','Educação de Jovens e Adultos','Educação Profissional e Formação ao Longo da Vida','Educação Especial','Educação Inclusiva','Educação, Infâncias e Direitos','Educação das Relações Étnico-Raciais')
  and not exists (select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=s.id);

insert into public.material_citations (material_id, source_id, citation_label)
select m.id, s.id, s.title
from public.materials m
join public.topics t on t.id=m.topic_id
join public.disciplines d on d.id=t.discipline_id
cross join public.sources s
where m.status='published' and s.status='active'
  and s.id='00000000-0000-0000-0000-000000000022'
  and d.name in ('Fundamentos da Educação','Didática','Currículo e Organização do Trabalho Pedagógico','Planejamento Educacional','Formação e Profissionalização Docente','Gestão Escolar','Coordenação Pedagógica','Metodologia Científica','Pesquisa em Educação','Trabalho de Conclusão de Curso','Seminário Integrador e Práticas Pedagógicas','Estágio Curricular Supervisionado I','Estágio Curricular Supervisionado II','Estágio Curricular Supervisionado III','Estágio Curricular Supervisionado IV','Estágio Curricular Supervisionado V','Estágio Curricular Supervisionado VI','Pedagogia em Espaços Não Escolares')
  and not exists (select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=s.id);

insert into public.material_citations (material_id, source_id, citation_label)
select m.id, s.id, s.title
from public.materials m
join public.topics t on t.id=m.topic_id
join public.disciplines d on d.id=t.discipline_id
cross join public.sources s
where m.status='published' and s.status='active'
  and s.id='00000000-0000-0000-0000-000000000044'
  and d.name in ('Educação Especial','Educação Inclusiva')
  and not exists (select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=s.id);

insert into public.material_citations (material_id, source_id, citation_label)
select m.id, s.id, s.title
from public.materials m
join public.topics t on t.id=m.topic_id
join public.disciplines d on d.id=t.discipline_id
cross join public.sources s
where m.status='published' and s.status='active'
  and s.id='00000000-0000-0000-0000-000000000051'
  and d.name='Libras e Educação de Surdos'
  and not exists (select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=s.id);

insert into public.material_citations (material_id, source_id, citation_label)
select m.id, s.id, s.title
from public.materials m
join public.topics t on t.id=m.topic_id
join public.disciplines d on d.id=t.discipline_id
cross join public.sources s
where m.status='published' and s.status='active'
  and s.id='00000000-0000-0000-0000-000000000043'
  and d.name in ('Educação Infantil','Alfabetização I','Alfabetização II','Leitura, Escrita e Letramento')
  and not exists (select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=s.id);

-- Final depth pass: expand only short conceptual/application sections using
-- topic-specific passages already present in the material.
with ctx as (
  select m.id material_id,
         max(ms.content) filter(where ms.position=3) concepts
  from public.materials m
  join public.material_sections ms on ms.material_id=m.id
  where m.status='published'
  group by m.id
)
update public.material_sections ms
set content =
  case
    when ms.position=1 and length(trim(ms.content))<180 then trim(ms.content)||E'\n\nPara estudar este conceito com rigor, relacione-o às ideias fundamentais apresentadas no material: '||left(regexp_replace(coalesce(ctx.concepts,''),'\s+',' ','g'),420)
    when ms.position=3 and length(trim(ms.content))<180 then trim(ms.content)||E'\n\nA compreensão não se limita à definição: observe como o conceito se relaciona com a situação pedagógica e com as evidências discutidas no tópico.'
    when ms.position=4 and length(trim(ms.content))<180 then trim(ms.content)||E'\n\nUse o exemplo para identificar o princípio pedagógico envolvido, explicar por que ele é adequado e reconhecer o que mudaria em outro contexto.'
    when ms.position=5 and length(trim(ms.content))<180 then trim(ms.content)||E'\n\nA análise deve considerar o contexto, as decisões tomadas e as evidências disponíveis, evitando conclusões baseadas apenas em impressão ou opinião.'
    when ms.position=6 and length(trim(ms.content))<180 then trim(ms.content)||E'\n\nPara superar esse erro, compare a prática descrita com os conceitos fundamentais do tópico e justifique qual alternativa produziria uma aprendizagem mais consistente.'
    when ms.position=7 and length(trim(ms.content))<180 then trim(ms.content)||E'\n\nO aprofundamento exige relacionar diferentes conceitos, reconhecer limites das explicações simplificadas e considerar as evidências apresentadas pelas fontes.'
    when ms.position=8 and length(trim(ms.content))<180 then trim(ms.content)||E'\n\nNa prática, explicite objetivo, decisão pedagógica e evidência de aprendizagem; depois verifique se a estratégia escolhida responde ao problema identificado.'
    when ms.position=9 and length(trim(ms.content))<180 then trim(ms.content)||E'\n\nAo sintetizar, preserve as relações entre os conceitos centrais e indique como eles orientam a interpretação de situações reais de ensino e aprendizagem.'
    else ms.content
  end
from ctx
where ms.material_id=ctx.material_id and ms.position between 1 and 9 and length(trim(ms.content))<180;
