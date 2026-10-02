-- Seed five curated UNIVESP YouTube videos for Pedagogy.
-- Public hosting is not treated as proof of a reuse license.

insert into public.sources(title,source_type,authors,canonical_url,status)
select * from (values
('D-13 - Avaliação na Educação Infantil - legislação, pesquisas e práticas','VIDEO','[{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=hP2DMHpQNJo','active'),
('Fundamentos e Práticas no Ensino de Matemática - Unidades temáticas - Matemática nos anos iniciais','VIDEO','[{"name":"Maria Ednéia Martins Salandim"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=G23H8ddcR5M','active'),
('Formação de professores de Ciências - Ana Maria Pessoa de Carvalho','VIDEO','[{"name":"Ana Maria Pessoa de Carvalho"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=IMyfqxACezE','active'),
('Fundamentos e Práticas no Ensino de História - O saber histórico e suas relações com o conhecimento','VIDEO','[{"name":"Claudete de Sousa Nogueira"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=IIQvZV0ToWo','active'),
('Educação Mediada por Tecnologias - A evolução histórica e perspectivas','VIDEO','[{"name":"Raquel Gitahy"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=BJTjX1C6yfU','active')
) v(title,source_type,authors,canonical_url,status)
where not exists(select 1 from public.sources s where s.canonical_url=v.canonical_url);

insert into public.source_rights(source_id,rights_class,access_model,evidence_url,evidence_note,verified_at)
select s.id,'UNKNOWN','OPEN',s.canonical_url,
'Vídeo hospedado publicamente no YouTube. A disponibilidade pública não foi tratada como licença de reutilização. O Ensina-me usa somente player incorporado e link para a página original; não copia, baixa ou redistribui o vídeo.',now()
from public.sources s
where s.canonical_url in (
'https://www.youtube.com/watch?v=hP2DMHpQNJo',
'https://www.youtube.com/watch?v=G23H8ddcR5M',
'https://www.youtube.com/watch?v=IMyfqxACezE',
'https://www.youtube.com/watch?v=IIQvZV0ToWo',
'https://www.youtube.com/watch?v=BJTjX1C6yfU')
and not exists(select 1 from public.source_rights r where r.source_id=s.id and r.superseded_at is null);

insert into public.topic_videos(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
select * from (values
('4770fd65-ed4f-4bd2-86ce-60bd84548600'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=hP2DMHpQNJo'),'D-13 - Avaliação na Educação Infantil - legislação, pesquisas e práticas','Apresenta legislação, pesquisas e exemplos de práticas avaliativas em creches e pré-escolas.','https://www.youtube.com/watch?v=hP2DMHpQNJo','https://www.youtube-nocookie.com/embed/hP2DMHpQNJo','youtube','UNIVESP',1,true),
('f4253c3b-9996-465b-b83f-a93d2c454aaf'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=G23H8ddcR5M'),'Fundamentos e Práticas no Ensino de Matemática - Unidades temáticas - Matemática nos anos iniciais','Aula de Pedagogia da UNIVESP sobre as unidades temáticas de Matemática nos anos iniciais.','https://www.youtube.com/watch?v=G23H8ddcR5M','https://www.youtube-nocookie.com/embed/G23H8ddcR5M','youtube','UNIVESP',1,true),
('c55659bd-7097-4d25-8279-4a22127b5c7d'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=IMyfqxACezE'),'Formação de professores de Ciências - Ana Maria Pessoa de Carvalho','Discussão sobre formação de professores para o ensino de Ciências nos primeiros anos do Ensino Fundamental.','https://www.youtube.com/watch?v=IMyfqxACezE','https://www.youtube-nocookie.com/embed/IMyfqxACezE','youtube','UNIVESP',1,true),
('6c24a3de-7fd5-4239-a4b4-b5721cdffc7d'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=IIQvZV0ToWo'),'Fundamentos e Práticas no Ensino de História - O saber histórico e suas relações com o conhecimento','Aula sobre o saber histórico e suas relações com o conhecimento histórico escolar nos anos iniciais.','https://www.youtube.com/watch?v=IIQvZV0ToWo','https://www.youtube-nocookie.com/embed/IIQvZV0ToWo','youtube','UNIVESP',1,true),
('3af3a151-6699-4050-99e3-0b3c3e27e894'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=BJTjX1C6yfU'),'Educação Mediada por Tecnologias - A evolução histórica e perspectivas','Panorama histórico do uso de tecnologia no ensino e aprendizagem e relação com documentos e políticas educacionais.','https://www.youtube.com/watch?v=BJTjX1C6yfU','https://www.youtube-nocookie.com/embed/BJTjX1C6yfU','youtube','UNIVESP',1,true)
) x(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
where source_id is not null
and not exists(select 1 from public.topic_videos tv where tv.topic_id=x.topic_id and tv.video_url=x.video_url);