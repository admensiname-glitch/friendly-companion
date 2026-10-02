-- Adds a complementary approved source to topics in the first 30 Pedagogy curriculum components.
-- Only inserts when that source is not already linked to the topic.

with maps(discipline,source_id) as (
values
('Fundamentos da Educação','00000000-0000-0000-0000-000000000021'),
('História da Educação','00000000-0000-0000-0000-000000000031'),
('Filosofia da Educação','00000000-0000-0000-0000-000000000033'),
('Sociologia da Educação','00000000-0000-0000-0000-000000000035'),
('Antropologia e Educação','00000000-0000-0000-0000-000000000037'),
('Psicologia da Educação','00000000-0000-0000-0000-000000000022'),
('Metodologia Científica','00000000-0000-0000-0000-000000000053'),
('Didática','00000000-0000-0000-0000-000000000022'),
('Currículo e Organização do Trabalho Pedagógico','00000000-0000-0000-0000-000000000023'),
('Planejamento Educacional','00000000-0000-0000-0000-000000000022'),
('Avaliação da Aprendizagem','00000000-0000-0000-0000-000000000042'),
('Formação e Profissionalização Docente','00000000-0000-0000-0000-000000000041'),
('Alfabetização I','00000000-0000-0000-0000-000000000043'),
('Alfabetização II','00000000-0000-0000-0000-000000000043'),
('Leitura, Escrita e Letramento','00000000-0000-0000-0000-000000000043'),
('Educação Infantil','00000000-0000-0000-0000-000000000054'),
('Metodologias da Educação Infantil','00000000-0000-0000-0000-000000000054'),
('Literatura Infantil','00000000-0000-0000-0000-000000000043'),
('Ensino de Língua Portuguesa nos Anos Iniciais','00000000-0000-0000-0000-000000000023'),
('Ensino de Matemática nos Anos Iniciais','00000000-0000-0000-0000-000000000023'),
('Ensino de Ciências nos Anos Iniciais','00000000-0000-0000-0000-000000000023'),
('Ensino de História nos Anos Iniciais','00000000-0000-0000-0000-000000000023'),
('Ensino de Geografia nos Anos Iniciais','00000000-0000-0000-0000-000000000023'),
('Arte e Educação','00000000-0000-0000-0000-000000000023'),
('Corpo, Movimento e Educação Física','00000000-0000-0000-0000-000000000023'),
('Educação Inclusiva','00000000-0000-0000-0000-000000000024'),
('Educação Especial','00000000-0000-0000-0000-000000000044'),
('Libras e Educação de Surdos','00000000-0000-0000-0000-000000000051'),
('Educação das Relações Étnico-Raciais','00000000-0000-0000-0000-000000000045'),
('Educação, Diversidade e Direitos Humanos','00000000-0000-0000-0000-000000000046')
)
insert into public.topic_sources(topic_id,source_id,role,status)
select t.id,m.source_id::uuid,'COMPLEMENTAR','APPROVED'
from public.topics t
join public.disciplines d on d.id=t.discipline_id
join maps m on m.discipline=d.name
where d.course_id=(select id from public.courses where slug='pedagogia' limit 1)
and d.curriculum_order<=30
and not exists (
  select 1 from public.topic_sources ts
  where ts.topic_id=t.id and ts.source_id=m.source_id::uuid
);