-- Seed curated academic YouTube videos for History, Sociology, Inclusive Education,
-- Libras and Ethnic-Racial Relations. Public hosting is not treated as proof
-- of a reuse license; the app embeds and links to the original page only.

with seed(title,authors,canonical_url,topic_id,description,channel_name,position) as (
values
('História da Educação no Brasil - Aula 1 - Introdução à disciplina e diferentes concepções sobre História','[{"name":"Paula Perin Vicentini"},{"name":"Vivian Batista da Silva"},{"name":"Rita de Cassia Gallego"}]'::jsonb,'https://www.youtube.com/watch?v=xB3y1f9jGvc','62be4937-4a7e-4483-9e85-6ff62afd3871'::uuid,'Introdução à disciplina de História da Educação e diferentes concepções de história aplicadas ao estudo da educação.','UNIVESP',1),
('História da Educação no Brasil - Aula 2 - A escola ontem e hoje','[{"name":"Paula Perin Vicentini"},{"name":"Rita de Cassia Gallego"},{"name":"Vivian Batista da Silva"}]'::jsonb,'https://www.youtube.com/watch?v=BERZeV49VGc','62be4937-4a7e-4483-9e85-6ff62afd3871'::uuid,'Análise histórica da escola e das transformações de suas formas de organização ao longo do tempo.','UNIVESP',2),
('Sociologia da Educação - Durkheim e os Fatos Sociais','[{"name":"Jorge Machado"}]'::jsonb,'https://www.youtube.com/watch?v=ipTG_kbNinw','2b81e7f8-2d24-4ee0-90ff-35d509b96fc6'::uuid,'Aula sobre Durkheim e o conceito de fato social para compreender relações entre sociedade, socialização e educação.','UNIVESP',1),
('Psicologia da Educação - Neurociência e Educação Inclusiva','[{"name":"Rita Melissa Lepre"}]'::jsonb,'https://www.youtube.com/watch?v=0cx6GUifxIw','237d33e7-2181-4b44-8f28-c4ae5cd92989'::uuid,'Discussão sobre neurociência e educação inclusiva no contexto da formação em Pedagogia.','UNIVESP',1),
('LIBRAS - Aula 02 - História da educação de surdos: no Brasil','[{"name":"André Xavier"}]'::jsonb,'https://www.youtube.com/watch?v=2rik3uXvotQ','66d2b56c-4c7e-4654-93d1-1c82edf24da4'::uuid,'Panorama histórico da educação de surdos no Brasil e das disputas em torno de língua, escolarização e direitos.','UNIVESP',1),
('Formação para Docência e Gestão para a Educação das Relações Étnico-Raciais e Educação Escolar Quilombola — abertura do curso','[{"name":"NEAD/UFSJ"}]'::jsonb,'https://www.youtube.com/watch?v=riy0N80zhmc','1db20109-504c-4632-9b83-d637c9ec0796'::uuid,'Abertura de formação universitária voltada à educação das relações étnico-raciais e educação escolar quilombola.','NEAD/UFSJ',1),
('Culturas e Territorialidades','[{"name":"Denise Maria Botelho"},{"name":"NEAD/UFSJ"}]'::jsonb,'https://www.youtube.com/watch?v=LvUtpINd70w','87e359f3-d833-4783-a492-e73f7eede08c'::uuid,'Aula pública sobre culturas e territorialidades com foco em questões étnico-raciais e educacionais.','NEAD/UFSJ',1)
),
ins_sources as (
 insert into public.sources(title,source_type,authors,canonical_url,status)
 select title,'VIDEO',authors,canonical_url,'active' from seed
 where not exists(select 1 from public.sources x where x.canonical_url=seed.canonical_url)
 returning id,canonical_url
),
src as (
 select x.id,s.* from public.sources x join seed s on s.canonical_url=x.canonical_url
),
rights as (
 insert into public.source_rights(source_id,rights_class,access_model,evidence_url,evidence_note,verified_at)
 select id,'UNKNOWN','OPEN',canonical_url,
 'Vídeo hospedado publicamente no YouTube. A disponibilidade pública não foi tratada como licença de reutilização. O Ensina-me usa somente player incorporado e link para a página original; não copia, baixa ou redistribui o vídeo.',
 now()
 from src s
 where not exists(select 1 from public.source_rights r where r.source_id=s.id and r.superseded_at is null)
 returning source_id
)
insert into public.topic_videos(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
select topic_id,id,title,description,canonical_url,
 replace(canonical_url,'https://www.youtube.com/watch?v=','https://www.youtube-nocookie.com/embed/'),
 'youtube',channel_name,position,true
from src s
where not exists(select 1 from public.topic_videos tv where tv.topic_id=s.topic_id and tv.video_url=s.canonical_url);