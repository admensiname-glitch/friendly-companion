-- Fase 2B: corrigir persistência de respostas, progresso e dificuldades de exercícios de aplicação.
-- O cliente não calcula nem grava diretamente métricas de aprendizagem.
-- Uma única RPC executa a operação de forma atômica e usa auth.uid().

-- O aluno não deve conseguir alterar diretamente seu próprio progresso.
drop policy if exists "Students insert own topic progress" on public.student_topic_progress;
drop policy if exists "Students update own topic progress" on public.student_topic_progress;

-- RPC anterior deixa de ser exposta ao cliente: o novo fluxo consolida tudo em uma operação.
revoke all on function public.record_topic_difficulty(uuid, text) from public;
revoke all on function public.record_topic_difficulty(uuid, text) from authenticated;

create or replace function public.submit_application_answer(
  _question_id uuid,
  _selected_option_id uuid default null,
  _open_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  v_option_exists boolean := false;
  v_tag text;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not public.has_role('student') then
    raise exception 'Somente alunos podem responder exercícios de aplicação';
  end if;

  select
    q.question_type,
    q.difficulty_tag,
    e.id,
    e.topic_id
  into
    v_question_type,
    v_difficulty_tags,
    v_exercise_id,
    v_topic_id
  from public.exercise_questions q
  join public.exercises e on e.id = q.exercise_id
  join public.topics t on t.id = e.topic_id
  where q.id = _question_id
    and e.exercise_type = 'application'
    and e.published = true
    and t.published = true
  limit 1;

  if v_exercise_id is null then
    raise exception 'Questão de aplicação não encontrada ou não publicada';
  end if;

  if v_question_type = 'multiple_choice' then
    if _selected_option_id is null or _open_text is not null then
      raise exception 'Resposta inválida para questão de múltipla escolha';
    end if;

    select
      o.is_correct,
      case
        when o.is_correct then o.feedback_correct
        else o.feedback_incorrect
      end
    into
      v_is_correct,
      v_feedback
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

  insert into public.exercise_answers (
    user_id,
    question_id,
    selected_option_id,
    open_text,
    is_correct,
    feedback,
    answered_at
  )
  values (
    v_user_id,
    _question_id,
    _selected_option_id,
    case when v_question_type = 'open_text' then _open_text else null end,
    v_is_correct,
    v_feedback,
    now()
  )
  returning id into v_answer_id;

  if v_question_type = 'multiple_choice' and v_is_correct = false then
    foreach v_tag in array coalesce(v_difficulty_tags, '{}'::text[]) loop
      if btrim(v_tag) <> '' then
        insert into public.student_topic_difficulties (
          user_id,
          topic_id,
          difficulty_tag,
          count,
          first_occurrence,
          last_occurrence,
          review_status
        )
        values (
          v_user_id,
          v_topic_id,
          btrim(v_tag),
          1,
          now(),
          now(),
          'pending'
        )
        on conflict (user_id, topic_id, difficulty_tag)
        do update set
          count = public.student_topic_difficulties.count + 1,
          last_occurrence = now(),
          review_status = 'pending';
      end if;
    end loop;
  end if;

  select count(distinct e.id)::integer
  into v_exercises_completed
  from public.exercise_answers a
  join public.exercise_questions q on q.id = a.question_id
  join public.exercises e on e.id = q.exercise_id
  where a.user_id = v_user_id
    and e.topic_id = v_topic_id
    and e.exercise_type = 'application'
    and e.published = true;

  insert into public.student_topic_progress (
    user_id,
    topic_id,
    status,
    exercises_completed,
    started_at,
    updated_at
  )
  values (
    v_user_id,
    v_topic_id,
    'in_progress',
    v_exercises_completed,
    now(),
    now()
  )
  on conflict (user_id, topic_id)
  do update set
    status = 'in_progress',
    exercises_completed = excluded.exercises_completed,
    updated_at = now();

  return jsonb_build_object(
    'answer_id', v_answer_id,
    'is_correct', v_is_correct,
    'feedback', v_feedback,
    'exercises_completed', v_exercises_completed
  );
end;
$$;

revoke all on function public.submit_application_answer(uuid, uuid, text) from public;
grant execute on function public.submit_application_answer(uuid, uuid, text) to authenticated;
