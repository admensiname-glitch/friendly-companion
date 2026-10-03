-- Pedagogia: substitui perguntas/contextos genéricos remanescentes por formulações específicas.
with replacements(topic, content) as (
 values
 ('Tempo histórico e temporalidades','O ensino do tempo histórico envolve duração, mudança, permanência e relação entre diferentes temporalidades. Nos anos iniciais, a questão é ajudar a criança a construir relações temporais, e não apenas memorizar datas.'),
 ('Produção e revisão de textos','Produzir texto envolve planejar, escrever, revisar e considerar leitor, finalidade e gênero. A revisão deve olhar para sentido, organização e escolhas linguísticas, e não somente para ortografia.'),
 ('Alfabetização e apropriação da linguagem','A alfabetização articula a apropriação do sistema de escrita às práticas de linguagem. O ensino precisa considerar tanto as relações entre fala e escrita quanto os usos sociais que dão sentido à leitura e à produção escrita.'),
 ('Análise linguística nos anos iniciais','A análise linguística ganha sentido quando parte de textos e situações reais de uso. O estudante pode observar regularidades, escolhas de palavras, construção de frases e efeitos de sentido para formular explicações sobre a língua.'),
 ('Tecnologias como recursos pedagógicos','A escolha de uma tecnologia deve partir do objetivo de aprendizagem, do conteúdo e das características dos estudantes. A ferramenta é meio para uma experiência pedagógica, não o objetivo da atividade.'),
 ('Ambientes virtuais e aprendizagem','Um ambiente virtual precisa organizar conteúdos, atividades, comunicação e acompanhamento de modo que o estudante saiba o que fazer e por quê. Links e tarefas isolados não substituem uma arquitetura pedagógica clara.'),
 ('Identidades e diversidade','Ensinar História exige reconhecer que identidades são construídas em contextos sociais e históricos e podem reunir experiências diversas. A seleção de fontes e narrativas deve evitar apresentar grupos complexos como homogêneos.'),
 ('Ensino de História e formação cidadã','A formação cidadã no ensino de História depende da capacidade de analisar experiências, conflitos, mudanças e diferentes perspectivas. O objetivo não é transformar a aula em lição moral, mas desenvolver pensamento histórico e participação informada.'),
 ('Práticas de oralidade, leitura e escrita','Oralidade, leitura e escrita são práticas de linguagem relacionadas. O ensino pode articulá-las em situações comunicativas nas quais os estudantes escutem, interpretem, discutam, produzam e revisem textos com finalidades reconhecíveis.'),
 ('Planejamento e avaliação em Língua Portuguesa','Avaliar Língua Portuguesa exige observar diferentes práticas de linguagem e evidências de aprendizagem. Uma única prova não representa, sozinha, a capacidade de ler, escrever, falar, escutar e analisar usos da língua.'),
 ('Cultura digital e educação','Cultura digital envolve práticas, linguagens, relações e formas de participação mediadas por tecnologias. Na educação, isso exige discutir não apenas dispositivos, mas também autoria, interação, informação e participação crítica.'),
 ('Letramento digital e pensamento crítico','Letramento digital inclui localizar, interpretar, avaliar e produzir informação em ambientes digitais. A confiabilidade de uma informação precisa ser examinada por autoria, evidências, contexto, data e relação com outras fontes.'),
 ('Planejamento de atividades com tecnologias','Planejar com tecnologia começa pela aprendizagem esperada e pela atividade cognitiva que se pretende promover. Só depois se escolhe a ferramenta capaz de apoiar essa finalidade e se definem formas de acompanhar a aprendizagem.'),
 ('Currículo e seleção de conhecimentos','Selecionar conhecimentos é uma decisão curricular: envolve critérios sobre o que merece ser ensinado, por quê e em que relação com os estudantes e seu contexto. O currículo, portanto, não é apenas uma lista neutra de conteúdos.'),
 ('Conceitos e teorias de currículo','Teorias de currículo oferecem diferentes maneiras de compreender conhecimento, cultura, poder, seleção e finalidade educativa. Estudá-las ajuda o futuro pedagogo a perceber que decisões curriculares carregam pressupostos.'),
 ('Currículo prescrito e currículo praticado','O currículo prescrito registra orientações e expectativas institucionais; o currículo praticado aparece nas escolhas efetivamente realizadas na escola. Analisar essa relação permite compreender como professores e contextos reinterpretam o currículo.'),
 ('Organização do trabalho pedagógico','Organizar o trabalho pedagógico envolve articular objetivos, conteúdos, tempos, espaços, relações, metodologias e avaliação. A qualidade da organização depende da coerência entre essas dimensões e das necessidades concretas dos estudantes.'),
 ('Projeto pedagógico e integração curricular','O projeto pedagógico expressa escolhas coletivas sobre finalidades, organização e trabalho educativo. A integração curricular ganha consistência quando conecta essas escolhas aos conhecimentos, às práticas e às experiências dos estudantes.')
)
update public.material_sections ms
set content = r.content
from replacements r, public.materials m, public.topics t
where ms.material_id=m.id and m.topic_id=t.id
  and m.status='published' and ms.position=2 and t.name=r.topic;

insert into public.material_citations (material_id, source_id, citation_label)
select m.id, s.id, s.title
from public.materials m
join public.topics t on t.id=m.topic_id
join public.disciplines d on d.id=t.discipline_id
cross join public.sources s
where m.status='published'
  and d.name='Filosofia da Educação'
  and s.id in ('00000000-0000-0000-0000-000000000034','cdbdbb02-c933-490b-9ad2-a7024f33c895')
  and not exists (select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=s.id);
