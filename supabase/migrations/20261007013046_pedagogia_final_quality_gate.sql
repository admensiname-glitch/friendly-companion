
do $$
declare n bigint;
begin
  if exists (
    select 1 from public.exercise_questions eq
    join public.exercises e on e.id=eq.exercise_id
    where e.published=true
      and (eq.question_text ilike '%CONTEXTO-PEDAGOGIA-2026%'
           or eq.question_text ilike '%No estudo de%')
  ) then raise exception 'QA_FAIL: old question templates remain'; end if;

  if exists (
    select 1 from public.exercise_questions eq
    join public.exercises e on e.id=eq.exercise_id
    where e.published=true
      and coalesce(trim(eq.question_text),'')=''
  ) then raise exception 'QA_FAIL: empty published question'; end if;

  if exists (
    select 1 from public.exercise_options o
    join public.exercise_questions q on q.id=o.question_id
    join public.exercises e on e.id=q.exercise_id
    where e.published=true
    group by o.question_id
    having count(*) <> 4 or count(*) filter (where o.is_correct) <> 1
  ) then raise exception 'QA_FAIL: published question does not have exactly 4 options and 1 correct answer'; end if;

  if exists (
    select 1 from public.exercise_options o
    join public.exercise_questions q on q.id=o.question_id
    join public.exercises e on e.id=q.exercise_id
    where e.published=true
      and ((o.is_correct=true and coalesce(trim(o.feedback_correct),'')='')
        or (o.is_correct=false and coalesce(trim(o.feedback_incorrect),'')=''))
  ) then raise exception 'QA_FAIL: option feedback missing'; end if;

  if exists (
    select 1 from public.exercise_questions eq
    join public.exercises e on e.id=eq.exercise_id
    where e.published=true
      and coalesce(trim(eq.feedback_hint),'')=''
  ) then raise exception 'QA_FAIL: question hint missing'; end if;

  if exists (
    select eq.question_text
    from public.exercise_questions eq
    join public.exercises e on e.id=eq.exercise_id
    where e.published=true
    group by eq.question_text
    having count(*) > 1
  ) then raise exception 'QA_FAIL: duplicate published question text'; end if;

  if exists (
    select 1 from public.exercises e
    where e.published=true and e.source_id is null
  ) then raise exception 'QA_FAIL: published exercise without source'; end if;

  if exists (
    select t.id
    from public.topics t
    left join public.exercises e on e.topic_id=t.id and e.published=true
    group by t.id
    having count(e.id)=0
  ) then raise exception 'QA_FAIL: topic without published exercise'; end if;

  if exists (
    select m.id
    from public.materials m
    left join public.material_sections s on s.material_id=m.id
    where m.status='published'
    group by m.id
    having count(s.id) <> 10
  ) then raise exception 'QA_FAIL: published material without exactly 10 sections'; end if;

  if exists (
    select t.id
    from public.topics t
    left join public.topic_sources ts on ts.topic_id=t.id and ts.status='APPROVED'
    where t.published=true
    group by t.id
    having count(ts.source_id)=0
  ) then raise exception 'QA_FAIL: published topic without approved source'; end if;

  if exists (
    select tv.topic_id
    from public.topic_videos tv
    where tv.published=true
    group by tv.topic_id
    having count(*) <> 1
  ) then raise exception 'QA_FAIL: topic does not have exactly one published video'; end if;

  if exists (
    select tv.video_url
    from public.topic_videos tv
    where tv.published=true
    group by tv.video_url
    having count(*) > 1
  ) then raise exception 'QA_FAIL: published video URL reused'; end if;
end $$;
