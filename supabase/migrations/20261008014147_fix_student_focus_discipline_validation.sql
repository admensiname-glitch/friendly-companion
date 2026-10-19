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
  join student_profiles sp on sp.user_id = v_user_id and sp.course_id = d.course_id
  where d.id = _discipline_id
    and d.published;

  if v_name is null then raise exception 'Disciplina não pertence ao curso do aluno'; end if;

  insert into student_focus_discipline(user_id, discipline_id, updated_at)
  values(v_user_id, _discipline_id, now())
  on conflict(user_id) do update
    set discipline_id = excluded.discipline_id, updated_at = now();

  return jsonb_build_object('discipline_id', _discipline_id, 'discipline_name', v_name);
end;
$$;

revoke execute on function public.set_student_focus_discipline(uuid) from public;
grant execute on function public.set_student_focus_discipline(uuid) to authenticated;