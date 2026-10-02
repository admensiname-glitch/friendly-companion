-- Seed three additional academic YouTube videos for Philosophy of Education
-- and teacher professionalization. Public hosting is not treated as proof
-- of a reuse license; the app embeds and links to the original page only.

insert into public.sources(title,source_type,authors,canonical_url,status)
select * from (values
('Filosofia da Educação - Aula 11 - Teoria do Conhecimento e Educação - 1','VIDEO','[{"name":"Marcos Antônio Lorieri"},{"name":"Sanny S. da Rosa"}]'::jsonb,'https://www.youtube.com/watch?v=Dkh81383Y08','active'),
('Filosofia da Educação - Aula 10 - Antropologia filosófica e educação - 4','VIDEO','[{"name":"Marcos Antônio Lorieri"}]'::jsonb,'https://www.youtube.com/watch?v=rWbYN0xnCFg','active'),
('História da Educação no Brasil - Aula 24 - A formação dos professores: o conhecimento científico e os saberes da experiência','VIDEO','[{"name":"Rosario Genta Lugli"},{"name":"Paula Perin Vicentini"}]'::jsonb,'https://www.youtube.com/watch?v=j72-q8PcO64','active')
) v(title,source_type,authors,canonical_url,status)
where not exists(select 1 from public.sources s where s.canonical_url=v.canonical_url);

insert into public.source_rights(source_id,rights_class,access_model,evidence_url,evidence_note,verified_at)
select s.id,'UNKNOWN','OPEN',s.canonical_url,
'Vídeo hospedado publicamente no YouTube. A disponibilidade pública não foi tratada como licença de reutilização. O Ensina-me usa somente player incorporado e link para a página original; não copia, baixa ou redistribui o vídeo.',now()
from public.sources s
where s.canonical_url in (
'https://www.youtube.com/watch?v=Dkh81383Y08',
'https://www.youtube.com/watch?v=rWbYN0xnCFg',
'https://www.youtube.com/watch?v=j72-q8PcO64')
and not exists(select 1 from public.source_rights r where r.source_id=s.id and r.superseded_at is null);

insert into public.topic_videos(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
select * from (values
('812c281b-45b4-4a9f-a476-5bc50f737bf1'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=Dkh81383Y08'),'Filosofia da Educação - Aula 11 - Teoria do Conhecimento e Educação - 1','Teoria do conhecimento e suas relações com a educação, em aula da disciplina Filosofia da Educação da UNIVESP.','https://www.youtube.com/watch?v=Dkh81383Y08','https://www.youtube-nocookie.com/embed/Dkh81383Y08','youtube','UNIVESP',1,true),
('adbbca43-3a22-4589-8963-87618ad2e4e3'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=rWbYN0xnCFg'),'Filosofia da Educação - Aula 10 - Antropologia filosófica e educação - 4','Antropologia filosófica e sua relação com educação e formação humana.','https://www.youtube.com/watch?v=rWbYN0xnCFg','https://www.youtube-nocookie.com/embed/rWbYN0xnCFg','youtube','UNIVESP',1,true),
('529c4f56-70ac-4db4-89f5-8e9c03e69f4b'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=j72-q8PcO64'),'História da Educação no Brasil - Aula 24 - A formação dos professores: o conhecimento científico e os saberes da experiência','Discussão histórica sobre formação docente, conhecimento científico e saberes da experiência.','https://www.youtube.com/watch?v=j72-q8PcO64','https://www.youtube-nocookie.com/embed/j72-q8PcO64','youtube','UNIVESP',1,true)
) x(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
where source_id is not null
and not exists(select 1 from public.topic_videos tv where tv.topic_id=x.topic_id and tv.video_url=x.video_url);