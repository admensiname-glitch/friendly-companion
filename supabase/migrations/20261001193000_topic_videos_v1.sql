-- Video complementar por tópico.
-- Mantém o vídeo fora do texto principal, com player embutido e link explícito para a fonte original.

begin;

create table if not exists public.topic_videos (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  source_id uuid null references public.sources(id) on delete set null,
  title text not null,
  description text null,
  video_url text not null,
  embed_url text not null,
  platform text not null default 'youtube',
  channel_name text null,
  duration_label text null,
  position integer not null default 1,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topic_videos_position_check check (position > 0),
  constraint topic_videos_platform_check check (platform in ('youtube')),
  constraint topic_videos_youtube_embed_check check (
    embed_url like 'https://www.youtube-nocookie.com/embed/%'
  ),
  constraint topic_videos_youtube_url_check check (
    video_url like 'https://www.youtube.com/watch%'
    or video_url like 'https://youtu.be/%'
  ),
  constraint topic_videos_topic_url_unique unique (topic_id, video_url)
);

create index if not exists topic_videos_topic_published_position_idx
  on public.topic_videos (topic_id, published, position);

alter table public.topic_videos enable row level security;

revoke all on public.topic_videos from anon, authenticated;
grant select on public.topic_videos to authenticated;

drop policy if exists "Students and admins can read published topic videos" on public.topic_videos;
create policy "Students and admins can read published topic videos"
  on public.topic_videos
  for select
  to authenticated
  using (
    published = true
    and (has_role('student'::text) or has_role('admin'::text))
    and exists (
      select 1
      from public.topics t
      join public.disciplines d on d.id = t.discipline_id
      join public.courses c on c.id = d.course_id
      where t.id = topic_videos.topic_id
        and t.published = true
        and d.published = true
        and c.published = true
    )
  );

insert into public.sources (
  id, title, source_type, authors, publisher, publication_date,
  canonical_url, language, status
) values
(
  'b4000000-0000-4000-8000-000000000001',
  'D16 - Alfabetização e a psicogênese da língua escrita',
  'VIDEO',
  '[{"name":"UNIVESP"}]'::jsonb,
  'UNIVESP',
  '2015-12-17',
  'https://www.youtube.com/watch?v=HYD_UYxbF90',
  'pt',
  'active'
),
(
  'b4000000-0000-4000-8000-000000000002',
  'Alfaletrar: Psicogênese da Língua Escrita no Projeto de Alfabetização',
  'VIDEO',
  '[{"name":"NOVA ESCOLA"}]'::jsonb,
  'NOVA ESCOLA',
  '2017-07-19',
  'https://www.youtube.com/watch?v=aovD7Kq-Dmg',
  'pt',
  'active'
),
(
  'b4000000-0000-4000-8000-000000000003',
  'Sequência Didática - Como fazer uma sequência didática passo a passo',
  'VIDEO',
  '[{"name":"Ivan Claudio Guedes"}]'::jsonb,
  'Prof. Ivan Claudio Guedes',
  null,
  'https://www.youtube.com/watch?v=7xYzokz5aVo',
  'pt',
  'active'
),
(
  'b4000000-0000-4000-8000-000000000004',
  'Autorregulação da aprendizagem: como estudar e aprender melhor.',
  'VIDEO',
  '[{"name":"Centro Universitário FMU"}]'::jsonb,
  'Centro Universitário FMU',
  '2024-10-15',
  'https://www.youtube.com/watch?v=qA4jtN517so',
  'pt',
  'active'
),
(
  'b4000000-0000-4000-8000-000000000005',
  'Você sabe estudar? O que é autorregulação da aprendizagem!!',
  'VIDEO',
  '[{"name":"Nexo do Saber"}]'::jsonb,
  'Nexo do Saber',
  '2020-12-19',
  'https://www.youtube.com/watch?v=McBjl4clSz4',
  'pt',
  'active'
)
on conflict (id) do nothing;

insert into public.source_rights (
  id, source_id, license_id, rights_class, access_model,
  evidence_url, evidence_note, verified_at
) values
(
  'b4100000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  null, 'METADATA_ONLY', 'OPEN',
  'https://www.youtube.com/watch?v=HYD_UYxbF90',
  'Vídeo público. O Ensina-me armazena somente metadados e incorpora o player; não copia o conteúdo do vídeo.',
  now()
),
(
  'b4100000-0000-4000-8000-000000000002',
  'b4000000-0000-4000-8000-000000000002',
  null, 'METADATA_ONLY', 'OPEN',
  'https://www.youtube.com/watch?v=aovD7Kq-Dmg',
  'Vídeo público. O Ensina-me armazena somente metadados e incorpora o player; não copia o conteúdo do vídeo.',
  now()
),
(
  'b4100000-0000-4000-8000-000000000003',
  'b4000000-0000-4000-8000-000000000003',
  null, 'METADATA_ONLY', 'OPEN',
  'https://www.youtube.com/watch?v=7xYzokz5aVo',
  'Vídeo público. O Ensina-me armazena somente metadados e incorpora o player; não copia o conteúdo do vídeo.',
  now()
),
(
  'b4100000-0000-4000-8000-000000000004',
  'b4000000-0000-4000-8000-000000000004',
  null, 'METADATA_ONLY', 'OPEN',
  'https://www.youtube.com/watch?v=qA4jtN517so',
  'Vídeo público. O Ensina-me armazena somente metadados e incorpora o player; não copia o conteúdo do vídeo.',
  now()
),
(
  'b4100000-0000-4000-8000-000000000005',
  'b4000000-0000-4000-8000-000000000005',
  null, 'METADATA_ONLY', 'OPEN',
  'https://www.youtube.com/watch?v=McBjl4clSz4',
  'Vídeo público. O Ensina-me armazena somente metadados e incorpora o player; não copia o conteúdo do vídeo.',
  now()
)
on conflict (id) do nothing;

insert into public.topic_videos (
  id, topic_id, source_id, title, description, video_url,
  embed_url, platform, channel_name, duration_label, position, published
) values
(
  'd4000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  'Alfabetização e a psicogênese da língua escrita',
  'Aula da UNIVESP sobre alfabetização e psicogênese da língua escrita.',
  'https://www.youtube.com/watch?v=HYD_UYxbF90',
  'https://www.youtube-nocookie.com/embed/HYD_UYxbF90',
  'youtube',
  'UNIVESP',
  null,
  1,
  true
),
(
  'd4000000-0000-4000-8000-000000000002',
  'c1000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000002',
  'Psicogênese da Língua Escrita no Projeto de Alfabetização',
  'Vídeo complementar da série Alfaletrar, com foco na base teórica da psicogênese.',
  'https://www.youtube.com/watch?v=aovD7Kq-Dmg',
  'https://www.youtube-nocookie.com/embed/aovD7Kq-Dmg',
  'youtube',
  'NOVA ESCOLA',
  null,
  2,
  true
),
(
  'd4000000-0000-4000-8000-000000000003',
  'c2000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000003',
  'Como fazer uma sequência didática passo a passo',
  'Explicação introdutória sobre o conceito e a organização de uma sequência didática.',
  'https://www.youtube.com/watch?v=7xYzokz5aVo',
  'https://www.youtube-nocookie.com/embed/7xYzokz5aVo',
  'youtube',
  'Ivan Claudio Guedes',
  null,
  1,
  true
),
(
  'd4000000-0000-4000-8000-000000000004',
  'c3000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000004',
  'Autorregulação da aprendizagem: como estudar e aprender melhor',
  'Aula do Centro Universitário FMU sobre autorregulação da aprendizagem e estratégias para estudar melhor.',
  'https://www.youtube.com/watch?v=qA4jtN517so',
  'https://www.youtube-nocookie.com/embed/qA4jtN517so',
  'youtube',
  'Centro Universitário FMU',
  null,
  1,
  true
),
(
  'd4000000-0000-4000-8000-000000000005',
  'c3000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000005',
  'O que é autorregulação da aprendizagem',
  'Vídeo complementar com uma introdução acessível ao conceito de autorregulação da aprendizagem.',
  'https://www.youtube.com/watch?v=McBjl4clSz4',
  'https://www.youtube-nocookie.com/embed/McBjl4clSz4',
  'youtube',
  'Nexo do Saber',
  null,
  2,
  true
)
on conflict (topic_id, video_url) do update set
  source_id = excluded.source_id,
  title = excluded.title,
  description = excluded.description,
  embed_url = excluded.embed_url,
  platform = excluded.platform,
  channel_name = excluded.channel_name,
  duration_label = excluded.duration_label,
  position = excluded.position,
  published = excluded.published,
  updated_at = now();

commit;
