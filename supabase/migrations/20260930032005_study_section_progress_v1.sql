create table public.student_material_section_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id uuid not null references public.material_sections(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, section_id)
);

create index student_material_section_progress_user_idx
  on public.student_material_section_progress(user_id, completed_at desc);

create index student_material_section_progress_section_idx
  on public.student_material_section_progress(section_id);

alter table public.student_material_section_progress enable row level security;

create policy "Students select own material section progress"
on public.student_material_section_progress
for select to authenticated
using (user_id = (select auth.uid()));

create policy "Students insert own material section progress"
on public.student_material_section_progress
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Students update own material section progress"
on public.student_material_section_progress
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Admins select all material section progress"
on public.student_material_section_progress
for select to authenticated
using (public.has_role('admin'));

create or replace function public.mark_material_section_complete(_section_id uuid)
returns table(completed_sections integer, total_sections integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_material_id uuid;
  v_topic_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_role('student') then
    raise exception 'student_role_required';
  end if;

  select ms.material_id, m.topic_id
    into v_material_id, v_topic_id
  from public.material_sections ms
  join public.materials m on m.id=ms.material_id
  join public.topics t on t.id=m.topic_id
  join public.disciplines d on d.id=t.discipline_id
  join public.courses c on c.id=d.course_id
  where ms.id=_section_id
    and m.status='published'
    and t.published
    and d.published
    and c.published;

  if v_material_id is null then
    raise exception 'section_not_available';
  end if;

  insert into public.student_material_section_progress(user_id, section_id)
  values (v_user_id, _section_id)
  on conflict (user_id, section_id)
  do update set completed_at=now();

  return query
  select
    (select count(*)::integer
     from public.student_material_section_progress p
     join public.material_sections ms on ms.id=p.section_id
     where p.user_id=v_user_id and ms.material_id=v_material_id),
    (select count(*)::integer
     from public.material_sections ms
     where ms.material_id=v_material_id);
end;
$$;

revoke all on function public.mark_material_section_complete(uuid) from public, anon;
grant execute on function public.mark_material_section_complete(uuid) to authenticated;
