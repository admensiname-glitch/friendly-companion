begin;

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
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not (select public.has_role('student')) then
    raise exception 'Acesso de aluno necessário';
  end if;

  return query
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
    where sd.user_id = v_user_id
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
    where a.user_id = v_user_id
      and e.exercise_type = 'application'
      and e.published
    group by e.topic_id
  )
  select
    sc.official_discipline_id,
    sc.discipline_name,
    t.id,
    t.name,
    t.description,
    case
      when coalesce(tt.total, 0) > 0
      then greatest(
        0,
        least(
          100,
          round((coalesce(ta.answered, 0)::numeric / tt.total::numeric) * 100)::integer
        )
      )
      else 0
    end,
    p.best_score,
    case
      when coalesce(ta.answered, 0) > 0 and coalesce(ta.answered, 0) < coalesce(tt.total, 0)
        then 'in_progress'
      when coalesce(ta.answered, 0) >= coalesce(tt.total, 0) and coalesce(tt.total, 0) > 0
        then coalesce(p.status, 'in_progress')
      else coalesce(p.status, 'not_started')
    end,
    coalesce((
      select count(*)::integer
      from public.student_topic_difficulties diff
      where diff.user_id = v_user_id
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
  left join topic_totals tt
    on tt.topic_id = t.id
  left join topic_answered ta
    on ta.topic_id = t.id
  left join public.student_topic_progress p
    on p.user_id = v_user_id
    and p.topic_id = t.id
  order by d.name, t.position;
end;
$function$;

create or replace function public.get_student_topic_application_progress(_topic_id uuid)
returns table(
  answered_questions integer,
  total_questions integer,
  progress integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_total integer;
  v_answered integer;
begin
  if v_user_id is null or not (select public.has_role('student')) then
    raise exception 'Acesso de aluno necessário';
  end if;

  if not exists (
    select 1
    from public.topics t
    join public.disciplines d on d.id = t.discipline_id and d.published
    join public.courses c on c.id = d.course_id and c.published
    where t.id = _topic_id
      and t.published
  ) then
    raise exception 'Tópico não encontrado ou não publicado';
  end if;

  select count(q.id)::integer
    into v_total
  from public.exercises e
  join public.exercise_questions q on q.exercise_id = e.id
  where e.topic_id = _topic_id
    and e.exercise_type = 'application'
    and e.published;

  select count(distinct a.question_id)::integer
    into v_answered
  from public.exercise_answers a
  join public.exercise_questions q on q.id = a.question_id
  join public.exercises e on e.id = q.exercise_id
  where a.user_id = v_user_id
    and e.topic_id = _topic_id
    and e.exercise_type = 'application'
    and e.published;

  return query
  select
    v_answered,
    v_total,
    case
      when v_total > 0
        then greatest(0, least(100, round((v_answered::numeric / v_total::numeric) * 100)::integer))
      else 0
    end;
end;
$function$;

create or replace function public.submit_application_answer(
  _question_id uuid,
  _selected_option_id uuid default null,
  _open_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_question_type text;
  v_topic_id uuid;
  v_exercise_id uuid;
  v_difficulty_tags text[] := '{}'::text[];
  v_is_correct boolean := null;
  v_feedback text := null;
  v_answer_id uuid;
  v_exercises_completed integer := 0;
  v_answered_questions integer := 0;
  v_total_questions integer := 0;
  v_existing_status text;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;
  if not (select public.has_role('student')) then
    raise exception 'Somente alunos podem responder exercícios de aplicação';
  end if;

  select q.question_type, q.difficulty_tag, e.id, e.topic_id
    into v_question_type, v_difficulty_tags, v_exercise_id, v_topic_id
  from public.exercise_questions q
  join public.exercises e on e.id = q.exercise_id
  join public.topics t on t.id = e.topic_id
  join public.disciplines d on d.id = t.discipline_id
  join public.courses c on c.id = d.course_id
  where q.id = _question_id
    and e.exercise_type = 'application'
    and e.published = true
    and t.published = true
    and d.published = true
    and c.published = true
  limit 1;

  if v_exercise_id is null then
    raise exception 'Questão de aplicação não encontrada ou não publicada';
  end if;

  if v_question_type = 'multiple_choice' then
    if _selected_option_id is null or _open_text is not null then
      raise exception 'Resposta inválida para questão de múltipla escolha';
    end if;

    select o.is_correct,
           case when o.is_correct then o.feedback_correct else o.feedback_incorrect end
      into v_is_correct, v_feedback
    from public.exercise_options o
    where o.id = _selected_option_id
      and o.question_id = _question_id;

    if not found then
      raise exception 'Alternativa inválida para esta questão';
    end if;
  elsif v_question_type = 'open_text' then
    if _selected_option_id is not null or _open_text is null or btrim(_open_text) = '' then
      raise exception 'Resposta inválida para questão aberta';
    end if;
  else
    raise exception 'Tipo de questão não suportado';
  end if;

  insert into public.exercise_answers(
    user_id,
    question_id,
    selected_option_id,
    open_text,
    is_correct,
    feedback,
    answered_at
  )
  values(
    v_user_id,
    _question_id,
    _selected_option_id,
    case when v_question_type = 'open_text' then _open_text else null end,
    v_is_correct,
    v_feedback,
    now()
  )
  returning id into v_answer_id;

  if v_question_type = 'multiple_choice' then
    perform public.update_topic_difficulty_after_answer(
      v_user_id,
      v_topic_id,
      v_difficulty_tags,
      coalesce(v_is_correct, false)
    );
  end if;

  select count(distinct e.id)::integer
    into v_exercises_completed
  from public.exercise_answers a
  join public.exercise_questions q on q.id = a.question_id
  join public.exercises e on e.id = q.exercise_id
  join public.topics t on t.id = e.topic_id
  join public.disciplines d on d.id = t.discipline_id
  join public.courses c on c.id = d.course_id
  where a.user_id = v_user_id
    and e.topic_id = v_topic_id
    and e.exercise_type = 'application'
    and e.published = true
    and t.published = true
    and d.published = true
    and c.published = true;

  select count(distinct a.question_id)::integer
    into v_answered_questions
  from public.exercise_answers a
  join public.exercise_questions q on q.id = a.question_id
  join public.exercises e on e.id = q.exercise_id
  where a.user_id = v_user_id
    and e.topic_id = v_topic_id
    and e.exercise_type = 'application'
    and e.published = true;

  select count(q.id)::integer
    into v_total_questions
  from public.exercise_questions q
  join public.exercises e on e.id = q.exercise_id
  where e.topic_id = v_topic_id
    and e.exercise_type = 'application'
    and e.published = true;

  select status into v_existing_status
  from public.student_topic_progress
  where user_id = v_user_id and topic_id = v_topic_id;

  insert into public.student_topic_progress(
    user_id, topic_id, status, exercises_completed, started_at, updated_at
  )
  values(
    v_user_id,
    v_topic_id,
    case
      when v_existing_status = 'completed' then 'completed'
      else 'in_progress'
    end,
    v_exercises_completed,
    coalesce(
      (select started_at from public.student_topic_progress where user_id = v_user_id and topic_id = v_topic_id),
      now()
    ),
    now()
  )
  on conflict(user_id,topic_id)
  do update set
    status=case
      when public.student_topic_progress.status='completed' then 'completed'
      else 'in_progress'
    end,
    exercises_completed=excluded.exercises_completed,
    updated_at=now();

  return jsonb_build_object(
    'answer_id', v_answer_id,
    'is_correct', v_is_correct,
    'feedback', v_feedback,
    'exercises_completed', v_exercises_completed,
    'answered_questions', v_answered_questions,
    'total_questions', v_total_questions,
    'progress',
      case
        when v_total_questions > 0
          then round((v_answered_questions::numeric / v_total_questions::numeric) * 100, 0)
        else 0
      end
  );
end;
$function$;

revoke all on function public.get_student_topic_application_progress(uuid) from public;
grant execute on function public.get_student_topic_application_progress(uuid) to authenticated;

commit;
