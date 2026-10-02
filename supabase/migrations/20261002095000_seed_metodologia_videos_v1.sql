-- Seed curated YouTube videos for Metodologia Científica.
-- Public hosting is not treated as proof of a reuse license.
-- The app only embeds the player and links to the original page.

insert into public.sources(title,source_type,authors,canonical_url,status)
select v.title,'VIDEO',v.authors,v.canonical_url,'active'
from (values
('Curso de Metodologia Científica — Aula 01 — A pesquisa científica','[{"name":"Prof. Matheus Passos"}]'::jsonb,'https://www.youtube.com/watch?v=WoGBWQafNAc'),
('Curso de Metodologia Científica — Aula 03 — A Introdução (2a parte)','[{"name":"Prof. Matheus Passos"}]'::jsonb,'https://www.youtube.com/watch?v=zs8ekNYOqK4'),
('Curso de Metodologia Científica — Aula 04 — Justificativa e Objetivos','[{"name":"Prof. Matheus Passos"}]'::jsonb,'https://www.youtube.com/watch?v=seRS-cAIRCk')
) v(title,authors,canonical_url)
where not exists (select 1 from public.sources s where s.canonical_url=v.canonical_url);

insert into public.source_rights(source_id,rights_class,access_model,evidence_url,evidence_note,verified_at)
select s.id,'UNKNOWN','OPEN',s.canonical_url,
'Vídeo hospedado publicamente no YouTube. A disponibilidade pública não foi tratada como licença de reutilização. O Ensina-me usa somente player incorporado e link para a página original; não copia, baixa ou redistribui o vídeo.',
now()
from public.sources s
where s.canonical_url in (
'https://www.youtube.com/watch?v=WoGBWQafNAc',
'https://www.youtube.com/watch?v=zs8ekNYOqK4',
'https://www.youtube.com/watch?v=seRS-cAIRCk')
and not exists (select 1 from public.source_rights r where r.source_id=s.id and r.superseded_at is null);

insert into public.topic_videos(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
select * from (values
('ca520715-298e-48e8-8a80-a26f93549f4e'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=WoGBWQafNAc'),'Curso de Metodologia Científica — Aula 01 — A pesquisa científica','Introdução à pesquisa científica e aos elementos básicos de um trabalho acadêmico.','https://www.youtube.com/watch?v=WoGBWQafNAc','https://www.youtube-nocookie.com/embed/WoGBWQafNAc','youtube','Prof. Matheus Passos',1,true),
('e1579d0e-6869-4592-a686-906611370ed5'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=zs8ekNYOqK4'),'Curso de Metodologia Científica — Aula 03 — A Introdução (2a parte)','Formulação e apresentação do problema de pesquisa em um trabalho acadêmico.','https://www.youtube.com/watch?v=zs8ekNYOqK4','https://www.youtube-nocookie.com/embed/zs8ekNYOqK4','youtube','Prof. Matheus Passos',1,true),
('e1579d0e-6869-4592-a686-906611370ed5'::uuid,(select id from public.sources where canonical_url='https://www.youtube.com/watch?v=seRS-cAIRCk'),'Curso de Metodologia Científica — Aula 04 — Justificativa e Objetivos','Justificativa e objetivos geral e específicos e sua relação com o problema de pesquisa.','https://www.youtube.com/watch?v=seRS-cAIRCk','https://www.youtube-nocookie.com/embed/seRS-cAIRCk','youtube','Prof. Matheus Passos',2,true)
) x(topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published)
where source_id is not null
and not exists(select 1 from public.topic_videos tv where tv.topic_id=x.topic_id and tv.video_url=x.video_url);