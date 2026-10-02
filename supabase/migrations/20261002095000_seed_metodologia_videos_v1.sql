-- Seed curated YouTube videos for Metodologia Científica.
-- Public hosting is not treated as proof of a reuse license.
-- The app only embeds the player and links to the original page.

with seed as (
  select * from (values
    ('Curso de Metodologia Científica — Aula 01 — A pesquisa científica',
     '[{"name":"Prof. Matheus Passos"}]'::jsonb,
     'https://www.youtube.com/watch?v=WoGBWQafNAc',
     'ca520715-298e-48e8-8a80-a26f93549f4e'::uuid,
     'Introdução à pesquisa científica e aos elementos básicos de um trabalho acadêmico.', 1),
    ('Curso de Metodologia Científica — Aula 03 — A Introdução (2a parte)',
     '[{"name":"Prof. Matheus Passos"}]'::jsonb,
     'https://www.youtube.com/watch?v=zs8ekNYOqK4',
     'e1579d0e-6869-4592-a686-906611370ed5'::uuid,
     'Formulação e apresentação do problema de pesquisa em um trabalho acadêmico.', 1),
    ('Curso de Metodologia Científica — Aula 04 — Justificativa e Objetivos',
     '[{"name":"Prof. Matheus Passos"}]'::jsonb,
     'https://www.youtube.com/watch?v=seRS-cAIRCk',
     'e1579d0e-6869-4592-a686-906611370ed5'::uuid,
     'Justificativa e objetivos geral e específicos e sua relação com o problema de pesquisa.', 2)
  ) as x(title,authors,canonical_url,topic_id,description,position)
),
ins_sources as (
  insert into public.sources(title,source_type,authors,canonical_url,status)
  select s.title,'VIDEO',s.authors,s.canonical_url,'active'
  from seed s
  where not exists (select 1 from public.sources x where x.canonical_url=s.canonical_url)
  returning id,canonical_url
),
all_sources as (
  select x.id,x.canonical_url from public.sources x
  join seed s on s.canonical_url=x.canonical_url
),
ins_rights as (
  insert into public.source_rights(source_id,rights_class,access_model,evidence_url,evidence_note,verified_at)
  select x.id,'UNKNOWN','OPEN',x.canonical_url,
    'Vídeo hospedado publicamente no YouTube. A disponibilidade pública não foi tratada como licença de reutilização. O Ensina-me usa somente player incorporado e link para a página original; não copia, baixa ou redistribui o vídeo.',
    now()
  from all_sources x
  where not exists (
    select 1 from public.source_rights r
    where r.source_id=x.id and r.superseded_at is null
  )
  returning source_id
)
insert into public.topic_videos(
  topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,position,published
)
select s.topic_id,x.id,s.title,s.description,s.canonical_url,
  replace(s.canonical_url,'https://www.youtube.com/watch?v=','https://www.youtube-nocookie.com/embed/'),
  'youtube',
  'Prof. Matheus Passos',
  s.position,
  true
from seed s
join all_sources x on x.canonical_url=s.canonical_url
where not exists (
  select 1 from public.topic_videos tv
  where tv.video_url=s.canonical_url and tv.topic_id=s.topic_id
);