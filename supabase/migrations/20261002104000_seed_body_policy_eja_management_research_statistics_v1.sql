-- Seed additional curated YouTube videos for Pedagogy: body/culture,
-- policies, EJA, statistics, management and research.
-- Public hosting is not treated as proof of a reuse license.

insert into public.sources(title,source_type,authors,canonical_url,status)
select * from (values
('Educação e Cultura Corporal: Fundamentos e Práticas - A produção cultural do corpo','VIDEO','[{"name":"Marcos Neira"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=i8JfsThEcUQ','active'),
('Políticas Educacionais e Estrutura e Organização da Educação Básica - Estrutura da Educação','VIDEO','[{"name":"Marcia Lopes Reis"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=6_ckf8itWO8','active'),
('Educação de Jovens e Adultos (EJA) - Conceito e definição de Educação e de EJA (LIBRAS)','VIDEO','[{"name":"Roberto da Silva"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=NAGK-zZL92w','active'),
('Gestão Escolar - Concepções de gestão - Parte 1','VIDEO','[{"name":"Keite Silva de Melo"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=dBEPCGmQfso','active'),
('Metodologias para a Pesquisa em Educação - Pesquisa em Educação','VIDEO','[{"name":"Taitiâny Kárita Bonzanini"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=BHMAKCPMqP8','active'),
('Estatística Aplicada à Educação - Mais Análise Descritiva','VIDEO','[{"name":"Airlane Pereira Alencar"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=pRRPBBjs6y0','active'),
('Estatística Aplicada à Educação - Correlação e regressão linear','VIDEO','[{"name":"Airlane Pereira Alencar"},{"name":"UNIVESP"}]'::jsonb,'https://www.youtube.com/watch?v=eRTQ91ba7OI','active')
) v(title,source_type,authors,canonical_url,status)
where not exists(select 1 from public.sources s where s.canonical_url=v.canonical_url);

insert into public.source_rights(source_id,rights_class,access_model,evidence_url,evidence_note,verified_at)
select s.id,'UNKNOWN','OPEN',s.canonical_url,
'Vídeo hospedado publicamente no YouTube. A disponibilidade pública não foi tratada como licença de reutilização. O Ensina-me usa somente player incorporado e link para a página original; não copia, baixa ou redistribui o vídeo.',now()
from public.sources s
where s.canonical_url in (
'https://www.youtube.com/watch?v=i8JfsThEcUQ',
'https://www.youtube.com/watch?v=6_ckf8itWO8',
'https://www.youtube.com/watch?v=NAGK-zZL92w',
'https://www.youtube.com/watch?v=dBEPCGmQfso',
'https://www.youtube.com/watch?v=BHMAKCPMqP8',
'https://www.youtube.com/watch?v=pRRPBBjs6y0',
'https://www.youtube.com/watch?v=eRTQ91ba7OI')
and not exists(select 1 from public.source_rights r where r.source_id=s.id and r.superseded_at is null);

insert into public.topic_videos(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
select * from (values
('7d8ddaa3-064b-424e-870f-16c4b411cb3c'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=i8JfsThEcUQ'),'Educação e Cultura Corporal: Fundamentos e Práticas - A produção cultural do corpo','Aula de Pedagogia da UNIVESP sobre cultura corporal e produção cultural do corpo.','https://www.youtube.com/watch?v=i8JfsThEcUQ','https://www.youtube-nocookie.com/embed/i8JfsThEcUQ','youtube','UNIVESP',1,true),
('652ae1f4-f75a-4ffb-8a0f-2e8750796fc7'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=6_ckf8itWO8'),'Políticas Educacionais e Estrutura e Organização da Educação Básica - Estrutura da Educação','Aula sobre a estrutura da Educação Básica brasileira e organização do sistema educacional.','https://www.youtube.com/watch?v=6_ckf8itWO8','https://www.youtube-nocookie.com/embed/6_ckf8itWO8','youtube','UNIVESP',1,true),
('2d31b2b4-4cbf-4015-9058-0043df89d0a7'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=NAGK-zZL92w'),'Educação de Jovens e Adultos (EJA) - Conceito e definição de Educação e de EJA (LIBRAS)','Introdução aos conceitos de educação e Educação de Jovens e Adultos em material da UNIVESP.','https://www.youtube.com/watch?v=NAGK-zZL92w','https://www.youtube-nocookie.com/embed/NAGK-zZL92w','youtube','UNIVESP',1,true),
('4f5eba7b-0c41-457d-a88e-c05d8a930094'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=dBEPCGmQfso'),'Gestão Escolar - Concepções de gestão - Parte 1','Aula de Pedagogia da UNIVESP sobre concepções de gestão escolar e influências das teorias da administração.','https://www.youtube.com/watch?v=dBEPCGmQfso','https://www.youtube-nocookie.com/embed/dBEPCGmQfso','youtube','UNIVESP',1,true),
('fe30cf51-450d-49e3-9d97-7728d4ad00d5'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=BHMAKCPMqP8'),'Metodologias para a Pesquisa em Educação - Pesquisa em Educação','Aula da UNIVESP sobre metodologias para pesquisa em educação.','https://www.youtube.com/watch?v=BHMAKCPMqP8','https://www.youtube-nocookie.com/embed/BHMAKCPMqP8','youtube','UNIVESP',1,true),
('ab02b87a-18ad-465b-a0de-e79d731c065a'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=pRRPBBjs6y0'),'Estatística Aplicada à Educação - Mais Análise Descritiva','Aula de Pedagogia da UNIVESP aprofundando análise descritiva aplicada à educação.','https://www.youtube.com/watch?v=pRRPBBjs6y0','https://www.youtube-nocookie.com/embed/pRRPBBjs6y0','youtube','UNIVESP',1,true),
('4ead6efb-5b08-4217-808d-15473a48df81'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=eRTQ91ba7OI'),'Estatística Aplicada à Educação - Correlação e regressão linear','Aula de Pedagogia da UNIVESP sobre correlação e regressão linear aplicada a dados educacionais.','https://www.youtube.com/watch?v=eRTQ91ba7OI','https://www.youtube-nocookie.com/embed/eRTQ91ba7OI','youtube','UNIVESP',1,true)
) x(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
where source_id is not null
and not exists(select 1 from public.topic_videos tv where tv.topic_id=x.topic_id and tv.video_url=x.video_url);