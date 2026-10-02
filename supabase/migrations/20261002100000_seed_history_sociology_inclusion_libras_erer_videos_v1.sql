-- Seed curated academic YouTube videos for History, Sociology, Inclusive Education,
-- Libras and Ethnic-Racial Relations.
-- Public hosting is not treated as proof of a reuse license; the app embeds and
-- links to the original page only.

insert into public.sources(title,source_type,authors,canonical_url,status)
select v.title,'VIDEO',v.authors,v.canonical_url,'active'
from (values
('História da Educação no Brasil - Aula 1 - Introdução à disciplina e diferentes concepções sobre História','[{"name":"Paula Perin Vicentini"},{"name":"Vivian Batista da Silva"},{"name":"Rita de Cassia Gallego"}]'::jsonb,'https://www.youtube.com/watch?v=xB3y1f9jGvc'),
('História da Educação no Brasil - Aula 2 - A escola ontem e hoje','[{"name":"Paula Perin Vicentini"},{"name":"Rita de Cassia Gallego"},{"name":"Vivian Batista da Silva"}]'::jsonb,'https://www.youtube.com/watch?v=BERZeV49VGc'),
('Sociologia da Educação - Durkheim e os Fatos Sociais','[{"name":"Jorge Machado"}]'::jsonb,'https://www.youtube.com/watch?v=ipTG_kbNinw'),
('Psicologia da Educação - Neurociência e Educação Inclusiva','[{"name":"Rita Melissa Lepre"}]'::jsonb,'https://www.youtube.com/watch?v=0cx6GUifxIw'),
('LIBRAS - Aula 02 - História da educação de surdos: no Brasil','[{"name":"André Xavier"}]'::jsonb,'https://www.youtube.com/watch?v=2rik3uXvotQ'),
('Formação para Docência e Gestão para a Educação das Relações Étnico-Raciais e Educação Escolar Quilombola — abertura do curso','[{"name":"NEAD/UFSJ"}]'::jsonb,'https://www.youtube.com/watch?v=riy0N80zhmc'),
('Culturas e Territorialidades','[{"name":"Denise Maria Botelho"},{"name":"NEAD/UFSJ"}]'::jsonb,'https://www.youtube.com/watch?v=LvUtpINd70w')
) v(title,authors,canonical_url)
where not exists(select 1 from public.sources s where s.canonical_url=v.canonical_url);

insert into public.source_rights(source_id,rights_class,access_model,evidence_url,evidence_note,verified_at)
select s.id,'UNKNOWN','OPEN',s.canonical_url,
'Vídeo hospedado publicamente no YouTube. A disponibilidade pública não foi tratada como licença de reutilização. O Ensina-me usa somente player incorporado e link para a página original; não copia, baixa ou redistribui o vídeo.',
now()
from public.sources s
where s.canonical_url in (
'https://www.youtube.com/watch?v=xB3y1f9jGvc',
'https://www.youtube.com/watch?v=BERZeV49VGc',
'https://www.youtube.com/watch?v=ipTG_kbNinw',
'https://www.youtube.com/watch?v=0cx6GUifxIw',
'https://www.youtube.com/watch?v=2rik3uXvotQ',
'https://www.youtube.com/watch?v=riy0N80zhmc',
'https://www.youtube.com/watch?v=LvUtpINd70w')
and not exists(select 1 from public.source_rights r where r.source_id=s.id and r.superseded_at is null);

insert into public.topic_videos(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
select * from (values
('62be4937-4a7e-4483-9e85-6ff62afd3871'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=xB3y1f9jGvc'),'História da Educação no Brasil - Aula 1 - Introdução à disciplina e diferentes concepções sobre História','Introdução à disciplina de História da Educação e diferentes concepções de história aplicadas ao estudo da educação.','https://www.youtube.com/watch?v=xB3y1f9jGvc','https://www.youtube-nocookie.com/embed/xB3y1f9jGvc','youtube','UNIVESP',1,true),
('62be4937-4a7e-4483-9e85-6ff62afd3871'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=BERZeV49VGc'),'História da Educação no Brasil - Aula 2 - A escola ontem e hoje','Análise histórica da escola e das transformações de suas formas de organização ao longo do tempo.','https://www.youtube.com/watch?v=BERZeV49VGc','https://www.youtube-nocookie.com/embed/BERZeV49VGc','youtube','UNIVESP',2,true),
('2b81e7f8-2d24-4ee0-90ff-35d509b96fc6'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=ipTG_kbNinw'),'Sociologia da Educação - Durkheim e os Fatos Sociais','Aula sobre Durkheim e o conceito de fato social para compreender relações entre sociedade, socialização e educação.','https://www.youtube.com/watch?v=ipTG_kbNinw','https://www.youtube-nocookie.com/embed/ipTG_kbNinw','youtube','UNIVESP',1,true),
('237d33e7-2181-4b44-8f28-c4ae5cd92989'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=0cx6GUifxIw'),'Psicologia da Educação - Neurociência e Educação Inclusiva','Discussão sobre neurociência e educação inclusiva no contexto da formação em Pedagogia.','https://www.youtube.com/watch?v=0cx6GUifxIw','https://www.youtube-nocookie.com/embed/0cx6GUifxIw','youtube','UNIVESP',1,true),
('66d2b56c-4c7e-4654-93d1-1c82edf24da4'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=2rik3uXvotQ'),'LIBRAS - Aula 02 - História da educação de surdos: no Brasil','Panorama histórico da educação de surdos no Brasil e das disputas em torno de língua, escolarização e direitos.','https://www.youtube.com/watch?v=2rik3uXvotQ','https://www.youtube-nocookie.com/embed/2rik3uXvotQ','youtube','UNIVESP',1,true),
('1db20109-504c-4632-9b83-d637c9ec0796'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=riy0N80zhmc'),'Formação para Docência e Gestão para a Educação das Relações Étnico-Raciais e Educação Escolar Quilombola — abertura do curso','Abertura de formação universitária voltada à educação das relações étnico-raciais e educação escolar quilombola.','https://www.youtube.com/watch?v=riy0N80zhmc','https://www.youtube-nocookie.com/embed/riy0N80zhmc','youtube','NEAD/UFSJ',1,true),
('87e359f3-d833-4783-a492-e73f7eede08c'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=LvUtpINd70w'),'Culturas e Territorialidades','Aula pública sobre culturas e territorialidades com foco em questões étnico-raciais e educacionais.','https://www.youtube.com/watch?v=LvUtpINd70w','https://www.youtube-nocookie.com/embed/LvUtpINd70w','youtube','NEAD/UFSJ',1,true)
) x(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
where source_id is not null
and not exists(select 1 from public.topic_videos tv where tv.topic_id=x.topic_id and tv.video_url=x.video_url);