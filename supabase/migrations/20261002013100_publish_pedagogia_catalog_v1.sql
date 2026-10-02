-- Release the validated Pedagogia learning catalog.
-- The course already exists and is published. This migration publishes the
-- complete canonical discipline/topic/material catalog only when each material
-- meets the publication gate. Static exercise banks intentionally remain draft.

begin;

with ready_materials as (
  select m.id
  from public.materials m
  join public.topics t on t.id = m.topic_id
  join public.disciplines d on d.id = t.discipline_id
  where d.course_id = 'b1733380-f5bf-435d-b516-ae5a489e0c46'
    and m.status = 'draft'
    and coalesce(trim(m.title), '') <> ''
    and (
      select count(*)
      from public.material_sections ms
      where ms.material_id = m.id
    ) = 10
    and not exists (
      select 1
      from public.material_sections ms
      where ms.material_id = m.id
        and (
          length(trim(coalesce(ms.content, ''))) < 180
          or ms.content ~* '(\\{\\{TOPICO\\}\\}|prática em preparação|avaliação formal em preparação|as questões serão revisadas)'
        )
    )
    and exists (
      select 1
      from public.topic_sources ts
      where ts.topic_id = m.topic_id
        and ts.status = 'APPROVED'
    )
    and exists (
      select 1
      from public.material_citations mc
      where mc.material_id = m.id
    )
)
update public.materials m
set status = 'published', updated_at = now()
where m.id in (select id from ready_materials);

update public.disciplines d
set published = true, updated_at = now()
where d.course_id = 'b1733380-f5bf-435d-b516-ae5a489e0c46';

update public.topics t
set published = true, updated_at = now()
where t.discipline_id in (
  select d.id
  from public.disciplines d
  where d.course_id = 'b1733380-f5bf-435d-b516-ae5a489e0c46'
)
and exists (
  select 1
  from public.materials m
  where m.topic_id = t.id
    and m.status = 'published'
    and (
      select count(*) from public.material_sections ms where ms.material_id = m.id
    ) = 10
    and not exists (
      select 1
      from public.material_sections ms
      where ms.material_id = m.id
        and (
          length(trim(coalesce(ms.content,''))) < 180
          or ms.content ~* '(\\{\\{TOPICO\\}\\}|prática em preparação|avaliação formal em preparação|as questões serão revisadas)'
        )
    )
    and exists (
      select 1 from public.topic_sources ts
      where ts.topic_id = t.id and ts.status = 'APPROVED'
    )
    and exists (
      select 1 from public.material_citations mc
      where mc.material_id = m.id
    )
);

commit;
