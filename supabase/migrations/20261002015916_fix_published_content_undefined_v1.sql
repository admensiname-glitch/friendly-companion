
begin;

update public.material_sections ms
set content =
  'Um erro frequente ao trabalhar com ' || lower(trim(t.name)) ||
  ' é simplificar o tema ou aplicar uma receita sem considerar contexto, finalidade e evidências. ' ||
  regexp_replace(ms.content, '^Um erro frequente é undefined\.?[[:space:]]*', '', 'i')
from public.materials m
join public.topics t on t.id=m.topic_id
join public.disciplines d on d.id=t.discipline_id
join public.courses c on c.id=d.course_id
where ms.material_id=m.id
  and m.status='published'
  and t.published
  and d.published
  and c.published
  and ms.content ~* 'undefined';

alter table public.material_sections
  drop constraint if exists material_sections_no_undefined;

alter table public.material_sections
  add constraint material_sections_no_undefined
  check (position('undefined' in lower(coalesce(content,''))) = 0);

commit;
