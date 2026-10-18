create table if not exists public.student_focus_disciplines (
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, discipline_id)
);

create index if not exists student_focus_disciplines_discipline_idx
  on public.student_focus_disciplines (discipline_id);

alter table public.student_focus_disciplines enable row level security;

drop policy if exists "Students can view their focus disciplines" on public.student_focus_disciplines;
create policy "Students can view their focus disciplines"
  on public.student_focus_disciplines for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Students can add their focus disciplines" on public.student_focus_disciplines;
create policy "Students can add their focus disciplines"
  on public.student_focus_disciplines for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Students can remove their focus disciplines" on public.student_focus_disciplines;
create policy "Students can remove their focus disciplines"
  on public.student_focus_disciplines for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into public.student_focus_disciplines (user_id, discipline_id)
select user_id, discipline_id
from public.student_focus_discipline
on conflict (user_id, discipline_id) do nothing;

create or replace function public.set_student_focus_discipline(_discipline_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária';
  end if;

  select d.name into v_name
  from public.disciplines d
  join public.student_profiles sp
    on sp.user_id = v_user_id
   and sp.course_id = d.course_id
  where d.id = _discipline_id
    and d.published;

  if v_name is null then
    raise exception 'Disciplina não pertence ao curso do aluno';
  end if;

  insert into public.student_focus_disciplines (user_id, discipline_id, updated_at)
  values (v_user_id, _discipline_id, now())
  on conflict (user_id, discipline_id) do update
    set updated_at = now();

  return jsonb_build_object(
    'discipline_id', _discipline_id,
    'discipline_name', v_name
  );
end;
$$;

create or replace function public.remove_student_focus_discipline(_discipline_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária';
  end if;

  delete from public.student_focus_disciplines
  where user_id = v_user_id
    and discipline_id = _discipline_id;

  return jsonb_build_object('discipline_id', _discipline_id, 'removed', true);
end;
$$;

create or replace function public.get_student_focus_disciplines()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'discipline_id', sfd.discipline_id,
        'discipline_name', d.name
      )
      order by d.name
    ),
    '[]'::jsonb
  )
  from public.student_focus_disciplines sfd
  join public.disciplines d on d.id = sfd.discipline_id
  where sfd.user_id = auth.uid()
    and d.published;
$$;

create or replace function public.get_student_focus_discipline()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'discipline_id', sfd.discipline_id,
        'discipline_name', d.name
      )
      from public.student_focus_disciplines sfd
      join public.disciplines d on d.id = sfd.discipline_id
      where sfd.user_id = auth.uid()
        and d.published
      order by sfd.updated_at desc
      limit 1
    ),
    '{}'::jsonb
  );
$$;

revoke execute on function public.set_student_focus_discipline(uuid) from public, anon;
grant execute on function public.set_student_focus_discipline(uuid) to authenticated;
revoke execute on function public.remove_student_focus_discipline(uuid) from public, anon;
grant execute on function public.remove_student_focus_discipline(uuid) to authenticated;
revoke execute on function public.get_student_focus_disciplines() from public, anon;
grant execute on function public.get_student_focus_disciplines() to authenticated;
revoke execute on function public.get_student_focus_discipline() from public, anon;
grant execute on function public.get_student_focus_discipline() to authenticated;
