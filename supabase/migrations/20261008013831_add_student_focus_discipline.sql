create table if not exists public.student_focus_discipline (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.student_focus_discipline enable row level security;

create policy "student_focus_discipline_select_own"
on public.student_focus_discipline for select to authenticated
using (user_id = auth.uid());

create policy "student_focus_discipline_insert_own"
on public.student_focus_discipline for insert to authenticated
with check (user_id = auth.uid());

create policy "student_focus_discipline_update_own"
on public.student_focus_discipline for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "student_focus_discipline_delete_own"
on public.student_focus_discipline for delete to authenticated
using (user_id = auth.uid());

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
  if v_user_id is null then raise exception 'Autenticação necessária'; end if;

  select d.name into v_name
  from disciplines d
  where d.id = _discipline_id
    and d.published
    and exists (
      select 1
      from student_disciplines sd
      join discipline_aliases da
        on da.normalized_alias = translate(lower(trim(sd.discipline_name)),
          'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      where sd.user_id = v_user_id
        and da.discipline_id = d.id
    );

  if v_name is null then raise exception 'Disciplina não pertence ao seu percurso'; end if;

  insert into student_focus_discipline(user_id, discipline_id, updated_at)
  values(v_user_id, _discipline_id, now())
  on conflict(user_id) do update
    set discipline_id = excluded.discipline_id, updated_at = now();

  return jsonb_build_object('discipline_id', _discipline_id, 'discipline_name', v_name);
end;
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
        'discipline_id', f.discipline_id,
        'discipline_name', d.name,
        'updated_at', f.updated_at
      )
      from student_focus_discipline f
      join disciplines d on d.id = f.discipline_id
      where f.user_id = auth.uid() and d.published
    ),
    '{}'::jsonb
  );
$$;

grant execute on function public.set_student_focus_discipline(uuid) to authenticated;
grant execute on function public.get_student_focus_discipline() to authenticated;
revoke execute on function public.set_student_focus_discipline(uuid) from anon;
revoke execute on function public.get_student_focus_discipline() from anon;

create index if not exists student_focus_discipline_discipline_idx
on public.student_focus_discipline(discipline_id);
