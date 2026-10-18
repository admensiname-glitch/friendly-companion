create or replace function private.get_student_review_items()
returns table(
  topic_id uuid,
  topic_name text,
  discipline_id uuid,
  discipline_name text,
  difficulty_tag text,
  count integer,
  last_occurrence timestamptz,
  review_status text,
  correct_count integer
)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not (select public.has_role('student')) then
    raise exception 'Acesso de aluno necessário';
  end if;

  return query
  select
    t.id,
    t.name,
    d.id,
    d.name,
    diff.difficulty_tag,
    diff.count,
    diff.last_occurrence,
    diff.review_status,
    diff.correct_count
  from public.student_topic_difficulties diff
  join public.topics t
    on t.id = diff.topic_id
   and t.published
  join public.disciplines d
    on d.id = t.discipline_id
   and d.published
  where diff.user_id = v_user_id
    and diff.review_status <> 'mastered'
  order by
    case when diff.review_status = 'pending' then 0 else 1 end,
    diff.last_occurrence desc,
    diff.count desc;
end;
$function$;