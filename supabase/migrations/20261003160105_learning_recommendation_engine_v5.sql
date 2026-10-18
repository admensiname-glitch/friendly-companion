create or replace function private.get_student_study_recommendation()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_topic record;
  v_exam record;
begin
  if v_user_id is null or not (select public.has_role('student')) then
    raise exception 'Acesso de aluno necessário';
  end if;

  /*
   * 1. Avaliação próxima:
   *    mantém prioridade máxima para uma avaliação real cadastrada pelo aluno,
   *    mas escolhe dentro da disciplina o tópico com sinais mais fortes de fragilidade.
   */
  select se.id, se.discipline, se.exam_type, se.exam_date
  into v_exam
  from public.student_exams se
  join public.student_disciplines sd
    on sd.user_id = v_user_id
   and translate(lower(trim(se.discipline)),
     'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
    = translate(lower(trim(sd.discipline_name)),
     'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
  where se.user_id = v_user_id
    and se.exam_date is not null
    and se.exam_date >= (now() at time zone 'America/Sao_Paulo')::date
    and se.exam_date <= ((now() at time zone 'America/Sao_Paulo')::date + 14)
  order by se.exam_date, se.created_at
  limit 1;

  if v_exam.id is not null then
    with latest_topic_exam as (
      select
        e.topic_id,
        ea.attempt_id,
        count(*) as total,
        count(*) filter (where eaa.is_correct) as correct,
        max(eaa.answered_at) as answered_at
      from public.exam_attempts ea
      join public.exam_attempt_questions eaq on eaq.attempt_id = ea.id
      join public.exam_attempt_answers eaa
        on eaa.attempt_question_id = eaq.id
       and eaa.attempt_id = ea.id
      join public.exercise_questions eq on eq.id = eaq.question_id
      join public.exercises e on e.id = eq.exercise_id
      join public.topics t on t.id = e.topic_id and t.published
      join public.disciplines d on d.id = t.discipline_id and d.published
      join public.discipline_aliases da on da.discipline_id = d.id
      join public.student_disciplines sd
        on sd.user_id = v_user_id
       and da.normalized_alias =
         translate(lower(trim(sd.discipline_name)),
           'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      where ea.user_id = v_user_id
        and ea.status = 'completed'
        and translate(lower(trim(sd.discipline_name)),
          'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
          = translate(lower(trim(v_exam.discipline)),
            'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      group by e.topic_id, ea.attempt_id
    ),
    latest_topic_exam_score as (
      select distinct on (topic_id)
        topic_id,
        round((correct::numeric / nullif(total, 0)) * 100, 1) as score,
        answered_at
      from latest_topic_exam
      order by topic_id, answered_at desc
    )
    select
      t.id as topic_id,
      t.name as topic_name,
      d.name as discipline_name,
      d.id as discipline_id
    into v_topic
    from public.topics t
    join public.disciplines d on d.id = t.discipline_id and d.published
    join public.courses c on c.id = d.course_id and c.published
    join public.discipline_aliases a on a.discipline_id = d.id
    join public.student_disciplines sd
      on sd.user_id = v_user_id
     and a.normalized_alias =
       translate(lower(trim(sd.discipline_name)),
         'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
    left join public.student_topic_difficulties diff
      on diff.user_id = v_user_id
     and diff.topic_id = t.id
     and diff.review_status <> 'mastered'
    left join public.student_topic_progress p
      on p.user_id = v_user_id
     and p.topic_id = t.id
    left join latest_topic_exam_score les
      on les.topic_id = t.id
    where t.published
      and translate(lower(trim(sd.discipline_name)),
        'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
        = translate(lower(trim(v_exam.discipline)),
          'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      and coalesce(p.status, '') <> 'completed'
    order by
      case when les.score is not null and les.score < 70 then 0 else 1 end,
      case when diff.review_status = 'pending' then 0 else 1 end,
      case when les.score is not null then les.score else 100 end asc,
      coalesce(diff.last_occurrence, les.answered_at, p.updated_at) desc nulls last,
      coalesce(diff.count, 0) desc,
      t.position
    limit 1;

    if v_topic.topic_id is null then
      select
        t.id as topic_id,
        t.name as topic_name,
        d.name as discipline_name,
        d.id as discipline_id
      into v_topic
      from public.student_topic_progress p
      join public.topics t on t.id = p.topic_id and t.published
      join public.disciplines d on d.id = t.discipline_id and d.published
      join public.courses c on c.id = d.course_id and c.published
      join public.student_disciplines sd on sd.user_id = v_user_id
      join public.discipline_aliases a
        on a.discipline_id = d.id
       and a.normalized_alias =
         translate(lower(trim(sd.discipline_name)),
           'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      where p.user_id = v_user_id
        and p.status = 'in_progress'
        and translate(lower(trim(sd.discipline_name)),
          'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
          = translate(lower(trim(v_exam.discipline)),
            'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      order by p.updated_at desc
      limit 1;
    end if;

    if v_topic.topic_id is null then
      select
        t.id as topic_id,
        t.name as topic_name,
        d.name as discipline_name,
        d.id as discipline_id
      into v_topic
      from public.student_disciplines sd
      join public.discipline_aliases a
        on a.normalized_alias =
          translate(lower(trim(sd.discipline_name)),
            'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      join public.disciplines d on d.id = a.discipline_id and d.published
      join public.courses c on c.id = d.course_id and c.published
      join public.topics t on t.discipline_id = d.id and t.published
      left join public.student_topic_progress p
        on p.user_id = v_user_id and p.topic_id = t.id
      where sd.user_id = v_user_id
        and p.id is null
        and translate(lower(trim(sd.discipline_name)),
          'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
          = translate(lower(trim(v_exam.discipline)),
            'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      order by t.position
      limit 1;
    end if;

    if v_topic.topic_id is not null then
      return jsonb_build_object(
        'topic_id', v_topic.topic_id,
        'discipline_id', v_topic.discipline_id,
        'topic_name', v_topic.topic_name,
        'discipline_name', v_topic.discipline_name,
        'reason', 'assessment',
        'exam_date', v_exam.exam_date,
        'exam_type', v_exam.exam_type,
        'message', concat(
          'Sua ', lower(v_exam.exam_type), ' de ', v_exam.discipline,
          ' acontece em ', to_char(v_exam.exam_date, 'DD/MM'),
          '. Este tópico foi escolhido a partir do seu desempenho e dos seus sinais de aprendizagem.'
        )
      );
    end if;
  end if;

  /*
   * 2. Sem avaliação iminente:
   *    fragilidade recente + baixo desempenho de prova + revisão agendada
   *    vêm antes de simplesmente continuar o último tópico.
   */
  with latest_topic_exam as (
    select
      e.topic_id,
      ea.id as attempt_id,
      count(*) as total,
      count(*) filter (where eaa.is_correct) as correct,
      max(eaa.answered_at) as answered_at
    from public.exam_attempts ea
    join public.exam_attempt_questions eaq on eaq.attempt_id = ea.id
    join public.exam_attempt_answers eaa
      on eaa.attempt_question_id = eaq.id
     and eaa.attempt_id = ea.id
    join public.exercise_questions eq on eq.id = eaq.question_id
    join public.exercises e on e.id = eq.exercise_id
    join public.topics t on t.id = e.topic_id and t.published
    join public.disciplines d on d.id = t.discipline_id and d.published
    where ea.user_id = v_user_id
      and ea.status = 'completed'
    group by e.topic_id, ea.id
  ),
  latest_topic_exam_score as (
    select distinct on (topic_id)
      topic_id,
      round((correct::numeric / nullif(total, 0)) * 100, 1) as score,
      answered_at
    from latest_topic_exam
    order by topic_id, answered_at desc
  ),
  candidates as (
    select
      t.id as topic_id,
      t.name as topic_name,
      d.name as discipline_name,
      d.id as discipline_id,
      coalesce(diff.count, 0) as difficulty_count,
      diff.review_status,
      diff.last_occurrence,
      les.score as recent_exam_score,
      p.best_score,
      p.next_micro_review_at,
      p.updated_at,
      case
        when les.score is not null and les.score < 50 then 0
        when les.score is not null and les.score < 70 then 1
        when diff.review_status = 'pending' then 2
        when p.next_micro_review_at is not null
          and p.next_micro_review_at <= now() then 3
        when diff.count is not null then 4
        when p.best_score is not null and p.best_score < 70 then 5
        else 6
      end as priority
    from public.topics t
    join public.disciplines d on d.id = t.discipline_id and d.published
    join public.courses c on c.id = d.course_id and c.published
    join public.student_disciplines sd on sd.user_id = v_user_id
    join public.discipline_aliases a
      on a.discipline_id = d.id
     and a.normalized_alias =
       translate(lower(trim(sd.discipline_name)),
         'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
    left join public.student_topic_difficulties diff
      on diff.user_id = v_user_id
     and diff.topic_id = t.id
     and diff.review_status <> 'mastered'
    left join public.student_topic_progress p
      on p.user_id = v_user_id
     and p.topic_id = t.id
    left join latest_topic_exam_score les
      on les.topic_id = t.id
    where t.published
      and coalesce(p.status, '') <> 'completed'
      and (
        diff.id is not null
        or les.score is not null
        or (p.next_micro_review_at is not null and p.next_micro_review_at <= now())
      )
  )
  select *
  into v_topic
  from candidates
  order by
    priority,
    case when recent_exam_score is not null then recent_exam_score else 100 end asc,
    case when review_status = 'pending' then 0 else 1 end,
    difficulty_count desc,
    coalesce(last_occurrence, updated_at) desc nulls last
  limit 1;

  if v_topic.topic_id is not null then
    return jsonb_build_object(
      'topic_id', v_topic.topic_id,
      'discipline_id', v_topic.discipline_id,
      'topic_name', v_topic.topic_name,
      'discipline_name', v_topic.discipline_name,
      'reason', 'review',
      'message',
        case
          when v_topic.recent_exam_score is not null and v_topic.recent_exam_score < 70
            then concat(
              'Sua última avaliação neste tópico ficou em ',
              to_char(v_topic.recent_exam_score, 'FM999990D0'),
              '%. Vale retomar este ponto antes de avançar.'
            )
          when v_topic.review_status = 'pending'
            then 'Este tópico acumulou sinais de dificuldade e está pedindo uma revisão.'
          when v_topic.next_micro_review_at is not null
            and v_topic.next_micro_review_at <= now()
            then 'Chegou o momento de revisar este tópico para consolidar o que você aprendeu.'
          else 'Há sinais no seu histórico de que este tópico merece ser retomado.'
        end
    );
  end if;

  select
    t.id as topic_id,
    t.name as topic_name,
    d.name as discipline_name,
    d.id as discipline_id
  into v_topic
  from public.student_topic_progress p
  join public.topics t on t.id = p.topic_id and t.published
  join public.disciplines d on d.id = t.discipline_id and d.published
  join public.courses c on c.id = d.course_id and c.published
  join public.student_disciplines sd on sd.user_id = v_user_id
  join public.discipline_aliases a
    on a.discipline_id = d.id
   and a.normalized_alias =
     translate(lower(trim(sd.discipline_name)),
       'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
  where p.user_id = v_user_id
    and p.status = 'in_progress'
  order by
    case when p.next_micro_review_at is not null and p.next_micro_review_at <= now() then 0 else 1 end,
    p.updated_at desc
  limit 1;

  if v_topic.topic_id is not null then
    return jsonb_build_object(
      'topic_id', v_topic.topic_id,
      'discipline_id', v_topic.discipline_id,
      'topic_name', v_topic.topic_name,
      'discipline_name', v_topic.discipline_name,
      'reason', 'continue',
      'message', 'Você já começou este tópico. Continue de onde parou.'
    );
  end if;

  select
    t.id as topic_id,
    t.name as topic_name,
    d.name as discipline_name,
    d.id as discipline_id
  into v_topic
  from public.student_disciplines sd
  join public.discipline_aliases a
    on a.normalized_alias =
      translate(lower(trim(sd.discipline_name)),
        'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
  join public.disciplines d on d.id = a.discipline_id and d.published
  join public.courses c on c.id = d.course_id and c.published
  join public.topics t on t.discipline_id = d.id and t.published
  left join public.student_topic_progress p
    on p.user_id = v_user_id and p.topic_id = t.id
  where sd.user_id = v_user_id
    and p.id is null
  order by sd.created_at, t.position
  limit 1;

  if v_topic.topic_id is not null then
    return jsonb_build_object(
      'topic_id', v_topic.topic_id,
      'discipline_id', v_topic.discipline_id,
      'topic_name', v_topic.topic_name,
      'discipline_name', v_topic.discipline_name,
      'reason', 'start',
      'message', 'Este é o próximo tópico ainda não iniciado no seu percurso.'
    );
  end if;

  return jsonb_build_object(
    'topic_id', null,
    'reason', 'none',
    'message', 'Seu percurso está em dia.'
  );
end;
$function$;
