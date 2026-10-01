create or replace function public.get_student_study_recommendation()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid:=auth.uid();
  v_topic record;
  v_exam record;
begin
  if v_user_id is null or not (select public.has_role('student')) then
    raise exception 'Acesso de aluno necessário';
  end if;

  select se.id,se.discipline,se.exam_type,se.exam_date
  into v_exam
  from public.student_exams se
  join public.student_disciplines sd on sd.user_id=v_user_id
   and translate(lower(trim(se.discipline)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
    = translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
  where se.user_id=v_user_id
    and se.exam_date is not null
    and se.exam_date >= (now() at time zone 'America/Sao_Paulo')::date
    and se.exam_date <= ((now() at time zone 'America/Sao_Paulo')::date + 14)
  order by se.exam_date,se.created_at
  limit 1;

  if v_exam.id is not null then
    select t.id as topic_id,t.name as topic_name,d.name as discipline_name,d.id as discipline_id
    into v_topic
    from public.student_topic_difficulties diff
    join public.topics t on t.id=diff.topic_id and t.published
    join public.disciplines d on d.id=t.discipline_id and d.published
    join public.courses c on c.id=d.course_id and c.published
    join public.discipline_aliases a on a.discipline_id=d.id
    join public.student_disciplines sd on sd.user_id=v_user_id
     and a.normalized_alias=translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
    where diff.user_id=v_user_id
      and diff.review_status<>'mastered'
      and translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
       = translate(lower(trim(v_exam.discipline)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
    order by case when diff.review_status='pending' then 0 else 1 end,
             diff.last_occurrence desc,diff.count desc
    limit 1;

    if v_topic.topic_id is null then
      select t.id as topic_id,t.name as topic_name,d.name as discipline_name,d.id as discipline_id
      into v_topic
      from public.student_topic_progress p
      join public.topics t on t.id=p.topic_id and t.published
      join public.disciplines d on d.id=t.discipline_id and d.published
      join public.courses c on c.id=d.course_id and c.published
      join public.student_disciplines sd on sd.user_id=v_user_id
      join public.discipline_aliases a on a.discipline_id=d.id
       and a.normalized_alias=translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      where p.user_id=v_user_id and p.status='in_progress'
        and translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
         = translate(lower(trim(v_exam.discipline)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      order by p.updated_at desc
      limit 1;
    end if;

    if v_topic.topic_id is null then
      select t.id as topic_id,t.name as topic_name,d.name as discipline_name,d.id as discipline_id
      into v_topic
      from public.student_disciplines sd
      join public.discipline_aliases a on a.normalized_alias=translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      join public.disciplines d on d.id=a.discipline_id and d.published
      join public.courses c on c.id=d.course_id and c.published
      join public.topics t on t.discipline_id=d.id and t.published
      left join public.student_topic_progress p on p.user_id=v_user_id and p.topic_id=t.id
      where sd.user_id=v_user_id and p.id is null
        and translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
         = translate(lower(trim(v_exam.discipline)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
      order by t.position
      limit 1;
    end if;

    if v_topic.topic_id is not null then
      return jsonb_build_object('topic_id',v_topic.topic_id,'discipline_id',v_topic.discipline_id,
        'topic_name',v_topic.topic_name,'discipline_name',v_topic.discipline_name,
        'reason','assessment','exam_date',v_exam.exam_date,'exam_type',v_exam.exam_type,
        'message',concat('Sua ',lower(v_exam.exam_type),' de ',v_exam.discipline,' acontece em ',to_char(v_exam.exam_date,'DD/MM'),'. Este tópico foi escolhido para preparar você com base no seu histórico.'));
    end if;
  end if;

  select t.id as topic_id,t.name as topic_name,d.name as discipline_name,d.id as discipline_id
  into v_topic
  from public.student_topic_difficulties diff
  join public.topics t on t.id=diff.topic_id and t.published
  join public.disciplines d on d.id=t.discipline_id and d.published
  join public.courses c on c.id=d.course_id and c.published
  join public.student_disciplines sd on sd.user_id=v_user_id
  join public.discipline_aliases a on a.discipline_id=d.id
   and a.normalized_alias=translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
  where diff.user_id=v_user_id and diff.review_status<>'mastered'
  order by case when diff.review_status='pending' then 0 else 1 end,diff.last_occurrence desc,diff.count desc
  limit 1;

  if v_topic.topic_id is not null then
    return jsonb_build_object('topic_id',v_topic.topic_id,'discipline_id',v_topic.discipline_id,'topic_name',v_topic.topic_name,'discipline_name',v_topic.discipline_name,'reason','review','message','Há um ponto que merece ser retomado para consolidar o conhecimento.');
  end if;

  select t.id as topic_id,t.name as topic_name,d.name as discipline_name,d.id as discipline_id
  into v_topic
  from public.student_topic_progress p
  join public.topics t on t.id=p.topic_id and t.published
  join public.disciplines d on d.id=t.discipline_id and d.published
  join public.courses c on c.id=d.course_id and c.published
  join public.student_disciplines sd on sd.user_id=v_user_id
  join public.discipline_aliases a on a.discipline_id=d.id
   and a.normalized_alias=translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
  where p.user_id=v_user_id and p.status='in_progress'
  order by p.updated_at desc
  limit 1;

  if v_topic.topic_id is not null then
    return jsonb_build_object('topic_id',v_topic.topic_id,'discipline_id',v_topic.discipline_id,'topic_name',v_topic.topic_name,'discipline_name',v_topic.discipline_name,'reason','continue','message','Você já começou este tópico. Continue de onde parou.');
  end if;

  select t.id as topic_id,t.name as topic_name,d.name as discipline_name,d.id as discipline_id
  into v_topic
  from public.student_disciplines sd
  join public.discipline_aliases a on a.normalized_alias=translate(lower(trim(sd.discipline_name)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')
  join public.disciplines d on d.id=a.discipline_id and d.published
  join public.courses c on c.id=d.course_id and c.published
  join public.topics t on t.discipline_id=d.id and t.published
  left join public.student_topic_progress p on p.user_id=v_user_id and p.topic_id=t.id
  where sd.user_id=v_user_id and p.id is null
  order by sd.created_at,t.position
  limit 1;

  if v_topic.topic_id is not null then
    return jsonb_build_object('topic_id',v_topic.topic_id,'discipline_id',v_topic.discipline_id,'topic_name',v_topic.topic_name,'discipline_name',v_topic.discipline_name,'reason','start','message','Este é o próximo tópico ainda não iniciado no seu percurso.');
  end if;

  return jsonb_build_object('topic_id',null,'reason','none','message','Seu percurso está em dia.');
end;
$function$;