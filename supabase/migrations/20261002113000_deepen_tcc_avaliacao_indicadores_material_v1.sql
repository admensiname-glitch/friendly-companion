-- Deepen TCC and Avaliação Educacional/Indicadores materials.
-- Generated from the verified current database state after content QA.
-- Idempotent data migration: updates existing sections by discipline/topic/position.

update public.material_sections ms
set content = v.content,
    updated_at = now()
from (values

) as v(discipline, topic, position, content)
join public.disciplines d on d.name = v.discipline
join public.topics t on t.discipline_id = d.id and t.name = v.topic
join public.materials m on m.topic_id = t.id
where ms.material_id = m.id
  and ms.position = v.position;

-- Keep the strongest directly relevant sources attached at material level.
insert into public.material_citations(material_id, source_id, citation_label)
select m.id, s.id, x.label
from (values
  ('Trabalho de Conclusão de Curso','Diretrizes de integridade na pesquisa — CNPq','Diretrizes de Integridade na Pesquisa'),
  ('Trabalho de Conclusão de Curso','Curso de Metodologia Científica — Aula 01 — A pesquisa científica','Metodologia científica — pesquisa'),
  ('Trabalho de Conclusão de Curso','Curso de Metodologia Científica — Aula 03 — A Introdução (2a parte)','Metodologia científica — introdução'),
  ('Trabalho de Conclusão de Curso','Curso de Metodologia Científica — Aula 04 — Justificativa e Objetivos','Metodologia científica — justificativa e objetivos'),
  ('Avaliação Educacional e Indicadores','Sistema de Avaliação da Educação Básica — Saeb','Saeb — Inep'),
  ('Avaliação Educacional e Indicadores','Censo Escolar da Educação Básica','Censo Escolar — Inep')
) x(discipline,source_title,label)
join public.disciplines d on d.name=x.discipline
join public.topics t on t.discipline_id=d.id
join public.materials m on m.topic_id=t.id
join public.sources s on s.title=x.source_title
where not exists (
  select 1 from public.material_citations mc
  where mc.material_id=m.id and mc.source_id=s.id
);