create or replace function public.finalize_formal_evaluation(_attempt_id uuid, _answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_topic_id uuid;
  v_discipline_id uuid;
  v_status text;
  v_total integer;
  v_answered integer := 0;
  v_correct integer := 0;
  v_score numeric(5,2);
  v_band text;
  v_best numeric(5,2);
  v_item jsonb;
  v_question_id uuid;
  v_selected_index integer;
  v_correct_index integer;
  v_ok boolean;
  v_tags text[];
  v_question_text text;
  v_options jsonb;
  v_explanation text;
  v_tag text;
  v_wrong jsonb := '[]'::jsonb;
  v_right jsonb := '[]'::jsonb;
begin
  if v_user_id is null or not (select public.has_role('student')) then
    raise exception 'Acesso de aluno necessário';
  end if;

  if jsonb_typeof(_answers) <> 'array' then
    raise exception 'Respostas da avaliação inválidas';
  end if;

  select ea.topic_id, t.discipline_id, ea.status, ea.total_questions
    into v_topic_id, v_discipline_id, v_status, v_total
  from public.evaluation_attempts ea
  join public.topics t on t.id = ea.topic_id
  where ea.id = _attempt_id and ea.user_id = v_user_id
  for update of ea;

  if v_topic_id is null then raise exception 'Tentativa de avaliação não encontrada'; end if;
  if v_discipline_id is null then raise exception 'Disciplina da avaliação não encontrada'; end if;
  if v_status <> 'in_progress' then raise exception 'Esta tentativa já foi finalizada'; end if;
  if jsonb_array_length(_answers) <> v_total or v_total <> 10 then
    raise exception 'A avaliação precisa ter exatamente 10 respostas';
  end if;

  for v_item in select value from jsonb_array_elements(_answers) loop
    begin
      v_question_id := (v_item->>'question_id')::uuid;
      v_selected_index := (v_item->>'selected_option_index')::integer;
    exception when invalid_text_representation then
      raise exception 'Identificador de questão inválido';
    end;

    if v_question_id is null or v_selected_index not between 0 and 3 then
      raise exception 'Resposta de avaliação inválida';
    end if;

    if exists(select 1 from public.formal_evaluation_answers
              where attempt_id=_attempt_id and question_id=v_question_id) then
      raise exception 'A mesma questão não pode ser respondida duas vezes';
    end if;

    select correct_option_index, concept_tags, question_text, options, explanation
      into v_correct_index, v_tags, v_question_text, v_options, v_explanation
    from public.formal_evaluation_questions
    where id=v_question_id and attempt_id=_attempt_id;

    if v_correct_index is null then raise exception 'Questão inválida para esta tentativa'; end if;

    v_ok := v_selected_index = v_correct_index;

    insert into public.formal_evaluation_answers(attempt_id,question_id,selected_option_index,is_correct)
    values(_attempt_id,v_question_id,v_selected_index,v_ok);

    v_answered := v_answered + 1;
    if v_ok then
      v_correct := v_correct + 1;
      v_right := v_right || jsonb_build_array(jsonb_build_object(
        'question_id',v_question_id,'question_text',v_question_text,
        'concept',coalesce(v_tags[1], 'conceito do tópico')
      ));
    else
      v_wrong := v_wrong || jsonb_build_array(jsonb_build_object(
        'question_id',v_question_id,
        'question_text',v_question_text,
        'concept',coalesce(v_tags[1], 'conceito do tópico'),
        'explanation',coalesce(v_explanation,'Revise este ponto e tente aplicá-lo novamente.'),
        'selected_option_index',v_selected_index,
        'correct_option_index',v_correct_index,
        'correct_answer',coalesce(v_options->v_correct_index,'')
      ));
    end if;

    perform public.update_topic_difficulty_after_answer(v_user_id,v_topic_id,v_tags,v_ok);

    foreach v_tag in array coalesce(v_tags,'{}'::text[]) loop
      if btrim(v_tag)='' then continue; end if;

      if not v_ok then
        insert into public.student_learning_signals(
          user_id,topic_id,discipline_id,concept,signal_type,severity,
          occurrences,correct_count,evidence,first_seen,last_seen,status
        ) values (
          v_user_id,v_topic_id,v_discipline_id,btrim(v_tag),'concept_gap',5,
          1,0,
          concat('Erro na avaliação: ',left(v_question_text,500)),
          now(),now(),'pending'
        )
        on conflict(user_id,topic_id,concept,signal_type) do update set
          severity=greatest(public.student_learning_signals.severity,5),
          occurrences=public.student_learning_signals.occurrences+1,
          evidence=concat('Erro recorrente na avaliação: ',left(v_question_text,500)),
          last_seen=now(),
          status='pending';
      else
        update public.student_learning_signals
        set correct_count=correct_count+1,
            last_seen=now(),
            status=case
              when correct_count+1 >= greatest(2,occurrences) then 'mastered'
              else 'improving'
            end
        where user_id=v_user_id and topic_id=v_topic_id
          and concept=btrim(v_tag) and signal_type='concept_gap';
      end if;
    end loop;
  end loop;

  v_score := round((v_correct::numeric/10::numeric)*100,2);
  v_band := case
    when v_score < 40 then 'novice'
    when v_score < 65 then 'developing'
    when v_score < 85 then 'proficient'
    else 'mastered'
  end;

  update public.evaluation_attempts
  set status='completed',answered_questions=v_answered,correct_answers=v_correct,
      score=v_score,completed_at=now(),updated_at=now()
  where id=_attempt_id and user_id=v_user_id;

  insert into public.student_topic_progress(
    user_id,topic_id,status,attempts_count,best_score,completed_at,updated_at
  ) values(v_user_id,v_topic_id,'completed',1,v_score,now(),now())
  on conflict(user_id,topic_id) do update set
    status='completed',
    attempts_count=public.student_topic_progress.attempts_count+1,
    best_score=greatest(coalesce(public.student_topic_progress.best_score,0),excluded.best_score),
    completed_at=excluded.completed_at,updated_at=now();

  select best_score into v_best
  from public.student_topic_progress
  where user_id=v_user_id and topic_id=v_topic_id;

  return jsonb_build_object(
    'attempt_id',_attempt_id,'score',v_score,'correct_answers',v_correct,
    'total_questions',10,'band',v_band,'best_score',v_best,
    'analysis',jsonb_build_object(
      'weak_points',v_wrong,
      'strengths',v_right,
      'next_action',case
        when v_score < 65 then 'review_errors'
        when jsonb_array_length(v_wrong) > 0 then 'practice_weak_points'
        else 'advance'
      end
    )
  );
end;
$function$;
