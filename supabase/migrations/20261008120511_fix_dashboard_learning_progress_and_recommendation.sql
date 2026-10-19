create or replace function public.get_student_dashboard_topics()
returns table(
  discipline_id uuid,
  discipline_name text,
  topic_id uuid,
  topic_name text,
  topic_description text,
  progress integer,
  best_score numeric,
  status text,
  review_count integer
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with student_catalog as (
    select
      sd.id as student_discipline_id,
      a.discipline_id as official_discipline_id,
      sd.discipline_name
    from public.student_disciplines sd
    left join public.discipline_aliases a
      on a.normalized_alias = translate(
        lower(trim(sd.discipline_name)),
        'áàãâäéèêëíìîïóòõôöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
      )
    where sd.user_id = auth.uid()
  ),
  topic_totals as (
    select e.topic_id, count(q.id)::integer as total
    from public.exercises e
    join public.exercise_questions q on q.exercise_id = e.id
    where e.exercise_type = 'application'
      and e.published
    group by e.topic_id
  ),
  topic_answered as (
    select
      e.topic_id,
      count(distinct a.question_id)::integer as answered
    from public.exercise_answers a
    join public.exercise_questions q on q.id = a.question_id
    join public.exercises e on e.id = q.exercise_id
    where a.user_id = auth.uid()
      and e.exercise_type = 'application'
      and e.published
    group by e.topic_id
  ),
  section_totals as (
    select m.topic_id, count(ms.id)::integer as total
    from public.materials m
    join public.material_sections ms on ms.material_id = m.id
    where m.status = 'published'
    group by m.topic_id
  )
  select
    sc.official_discipline_id,
    sc.discipline_name,
    t.id,
    t.name,
    t.description,
    case
      when coalesce(p.status, '') = 'completed' then 100
      when coalesce(st.total, 0) > 0 and p.last_position is not null
        then greatest(
          coalesce(
            case when coalesce(tt.total, 0) > 0
              then round((coalesce(ta.answered, 0)::numeric / tt.total::numeric) * 100)::integer
              else 0
            end,
            0
          ),
          least(100, round(((p.last_position + 1)::numeric / st.total::numeric) * 100)::integer)
        )
      when coalesce(tt.total, 0) > 0
        then greatest(0, least(100, round((coalesce(ta.answered, 0)::numeric / tt.total::numeric) * 100)::integer))
      else 0
    end,
    p.best_score,
    coalesce(
      case
        when coalesce(p.status, '') = 'completed' then 'completed'
        when coalesce(ta.answered, 0) > 0 and coalesce(ta.answered, 0) < coalesce(tt.total, 0)
          then 'in_progress'
        when coalesce(ta.answered, 0) >= coalesce(tt.total, 0) and coalesce(tt.total, 0) > 0
          then coalesce(p.status, 'in_progress')
        else coalesce(p.status, 'not_started')
      end,
      'not_started'
    ),
    coalesce((
      select count(*)::integer
      from public.student_topic_difficulties diff
      where diff.user_id = auth.uid()
        and diff.topic_id = t.id
        and diff.review_status <> 'mastered'
    ), 0)
  from student_catalog sc
  join public.disciplines d
    on d.id = sc.official_discipline_id
    and d.published
  join public.courses c
    on c.id = d.course_id
    and c.published
  join public.topics t
    on t.discipline_id = d.id
    and t.published
  left join topic_totals tt on tt.topic_id = t.id
  left join topic_answered ta on ta.topic_id = t.id
  left join section_totals st on st.topic_id = t.id
  left join public.student_topic_progress p
    on p.user_id = auth.uid()
    and p.topic_id = t.id
  where auth.uid() is not null
    and public.has_role('student')
  order by d.name, t.position;
$$;

revoke execute on function public.get_student_dashboard_topics() from public;
grant execute on function public.get_student_dashboard_topics() to authenticated;