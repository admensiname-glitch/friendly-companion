create or replace function public.record_micro_assessment_answer(
  _assessment_id uuid,
  _selected_option_index integer
)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_topic_id uuid;
  v_tags text[];
  v_correct_index integer;
  v_correct boolean;
  v_status text;
  v_difficulty text;
  v_attempted integer;
  v_correct_total integer;
  v_streak_correct integer := 0;
  v_streak_incorrect integer := 0;
  v_accuracy numeric := 0;
  v_next_difficulty text;
  v_mastery_level text;
  v_next_review_at timestamptz;
  v_item record;
  v_tag text;
  v_existing_status text;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not public.has_role('student') then
    raise exception 'Somente alunos podem responder microavaliações';
  end if;

  select topic_id, concept_tags, correct_option_index, status, difficulty
    into v_topic_id, v_tags, v_correct_index, v_status, v_difficulty
  from public.ai_micro_assessments
  where id = _assessment_id
    and user_id = v_user_id
  for update;

  if v_topic_id is null then
    raise exception 'Microavaliação não encontrada';
  end if;

  if v_status <> 'pending' then
    raise exception 'Esta microavaliação já foi respondida';
  end if;

  if _selected_option_index < 0 or _selected_option_index > 3 then
    raise exception 'Alternativa inválida';
  end if;

  v_correct := (_selected_option_index = v_correct_index);

  update public.ai_micro_assessments
  set selected_option_index = _selected_option_index,
      is_correct = v_correct,
      status = 'answered',
      answered_at = now()
  where id = _assessment_id
    and user_id = v_user_id;

  if not v_correct then
    foreach v_tag in array coalesce(v_tags, array[]::text[]) loop
      if nullif(trim(v_tag), '') is not null then
        perform public.record_topic_difficulty(v_topic_id, v_tag);
      end if;
    end loop;
  else
    update public.student_topic_difficulties
    set correct_count = correct_count + 1,
        review_status = case
          when correct_count + 1 >= 2
               and correct_count + 1 >= count
            then 'mastered'
          else review_status
        end
    where user_id = v_user_id
      and topic_id = v_topic_id
      and difficulty_tag = any(coalesce(v_tags, array[]::text[]));
  end if;

  select
    micro_questions_attempted,
    micro_questions_correct,
    status
  into
    v_attempted,
    v_correct_total,
    v_existing_status
  from public.student_topic_progress
  where user_id = v_user_id
    and topic_id = v_topic_id;

  v_attempted := coalesce(v_attempted, 0) + 1;
  v_correct_total := coalesce(v_correct_total, 0) + case when v_correct then 1 else 0 end;
  v_accuracy := case
    when v_attempted > 0 then round((v_correct_total::numeric / v_attempted::numeric) * 100, 1)
    else 0
  end;

  for v_item in
    select is_correct
    from public.ai_micro_assessments
    where user_id = v_user_id
      and topic_id = v_topic_id
      and status = 'answered'
      and answered_at is not null
    order by answered_at desc
    limit 12
  loop
    if v_item.is_correct then
      if v_streak_incorrect > 0 then
        exit;
      end if;
      v_streak_correct := v_streak_correct + 1;
    else
      if v_streak_correct > 0 then
        exit;
      end if;
      v_streak_incorrect := v_streak_incorrect + 1;
    end if;
  end loop;

  if v_correct then
    v_next_difficulty := case v_difficulty
      when 'introductory' then 'intermediate'
      when 'intermediate' then 'advanced'
      else 'advanced'
    end;

    v_next_review_at := case
      when v_streak_correct >= 3 then now() + interval '7 days'
      when v_streak_correct = 2 then now() + interval '3 days'
      else now() + interval '1 day'
    end;
  else
    v_next_difficulty := case v_difficulty
      when 'advanced' then 'intermediate'
      when 'intermediate' then 'introductory'
      else 'introductory'
    end;

    v_next_review_at := now() + interval '1 day';
  end if;

  v_mastery_level := case
    when v_attempted >= 6 and v_accuracy >= 85 and v_streak_correct >= 3 then 'mastered'
    when v_attempted >= 4 and v_accuracy >= 75 and v_streak_correct >= 2 then 'proficient'
    when v_attempted >= 2 and v_accuracy >= 50 then 'consolidating'
    else 'emerging'
  end;

  insert into public.student_topic_progress(
    user_id,
    topic_id,
    status,
    micro_questions_attempted,
    micro_questions_correct,
    last_learning_activity_at,
    next_micro_review_at,
    micro_mastery_level,
    micro_current_difficulty,
    updated_at
  )
  values (
    v_user_id,
    v_topic_id,
    case when v_existing_status = 'completed' then 'completed' else 'in_progress' end,
    v_attempted,
    v_correct_total,
    now(),
    v_next_review_at,
    v_mastery_level,
    v_next_difficulty,
    now()
  )
  on conflict (user_id, topic_id)
  do update set
    status = case
      when public.student_topic_progress.status = 'completed' then 'completed'
      else 'in_progress'
    end,
    micro_questions_attempted = v_attempted,
    micro_questions_correct = v_correct_total,
    last_learning_activity_at = now(),
    next_micro_review_at = v_next_review_at,
    micro_mastery_level = v_mastery_level,
    micro_current_difficulty = v_next_difficulty,
    updated_at = now();

  return jsonb_build_object(
    'assessment_id', _assessment_id,
    'topic_id', v_topic_id,
    'is_correct', v_correct,
    'attempted', v_attempted,
    'correct', v_correct_total,
    'accuracy', v_accuracy,
    'consecutive_correct', v_streak_correct,
    'consecutive_incorrect', v_streak_incorrect,
    'next_difficulty', v_next_difficulty,
    'mastery_level', v_mastery_level,
    'next_review_at', v_next_review_at
  );
end;
$function$;

revoke execute on function public.record_micro_assessment_answer(uuid, integer) from public, anon;
grant execute on function public.record_micro_assessment_answer(uuid, integer) to authenticated;

insert into public.discipline_aliases (discipline_id, alias, normalized_alias)
select
  d.id,
  d.name,
  translate(
    lower(trim(d.name)),
    'áàãâäéèêëíìîïóòõôöúùûüç',
    'aaaaaeeeeiiiiooooouuuuc'
  )
from public.disciplines d
where d.published = true
  and not exists (
    select 1
    from public.discipline_aliases existing
    where existing.discipline_id = d.id
      and existing.normalized_alias = translate(
        lower(trim(d.name)),
        'áàãâäéèêëíìîïóòõôöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
      )
  );
