-- Corrects placeholder detection in the publication gate without relying on
-- backslash escaping inside PostgreSQL regex string literals.

create or replace function public.admin_set_publication(
  _entity_type text,
  _entity_id uuid,
  _published boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_course_id uuid;
  v_discipline_id uuid;
  v_topic_id uuid;
  v_exercise_id uuid;
begin
  if v_user_id is null or not (select public.has_role('admin')) then
    raise exception 'Acesso administrativo negado';
  end if;

  if _published then
    case _entity_type
      when 'discipline' then
        select d.course_id into v_course_id
        from public.disciplines d
        where d.id = _entity_id;

        if v_course_id is null then
          raise exception 'Disciplina não encontrada';
        end if;

        if not exists (
          select 1 from public.courses c
          where c.id = v_course_id and c.published
        ) then
          raise exception 'Publique o curso antes da disciplina';
        end if;

      when 'topic' then
        select t.discipline_id into v_discipline_id
        from public.topics t
        where t.id = _entity_id;

        if v_discipline_id is null then
          raise exception 'Tópico não encontrado';
        end if;

        if not exists (
          select 1
          from public.disciplines d
          join public.courses c on c.id = d.course_id
          where d.id = v_discipline_id
            and d.published
            and c.published
        ) then
          raise exception 'Publique a disciplina e o curso antes do tópico';
        end if;

        if not exists (
          select 1
          from public.materials m
          where m.topic_id = _entity_id
            and m.status in ('draft', 'published')
            and coalesce(trim(m.title), '') <> ''
            and (
              select count(*)
              from public.material_sections ms
              where ms.material_id = m.id
            ) = 10
            and not exists (
              select 1
              from public.material_sections ms
              where ms.material_id = m.id
                and (
                  length(trim(coalesce(ms.content, ''))) < 180
                  or position('{{TOPICO}}' in coalesce(ms.content, '')) > 0
                  or ms.content ~* '(prática em preparação|avaliação formal em preparação|as questões serão revisadas)'
                )
            )
            and exists (
              select 1
              from public.topic_sources ts
              where ts.topic_id = _entity_id
                and ts.status = 'APPROVED'
            )
            and exists (
              select 1
              from public.material_citations mc
              where mc.material_id = m.id
            )
        ) then
          raise exception 'O tópico precisa ter um material completo, validado e referenciado antes da publicação';
        end if;

      when 'material' then
        select m.topic_id into v_topic_id
        from public.materials m
        where m.id = _entity_id;

        if v_topic_id is null then
          raise exception 'Material não encontrado';
        end if;

        if not exists (
          select 1
          from public.materials m
          where m.id = _entity_id
            and coalesce(trim(m.title), '') <> ''
            and (
              select count(*)
              from public.material_sections ms
              where ms.material_id = m.id
            ) = 10
            and not exists (
              select 1
              from public.material_sections ms
              where ms.material_id = m.id
                and (
                  length(trim(coalesce(ms.content, ''))) < 180
                  or position('{{TOPICO}}' in coalesce(ms.content, '')) > 0
                  or ms.content ~* '(prática em preparação|avaliação formal em preparação|as questões serão revisadas)'
                )
            )
            and exists (
              select 1
              from public.topic_sources ts
              where ts.topic_id = v_topic_id
                and ts.status = 'APPROVED'
            )
            and exists (
              select 1
              from public.material_citations mc
              where mc.material_id = m.id
            )
        ) then
          raise exception 'O material precisa ter 10 seções completas, fonte aprovada e referências antes da publicação';
        end if;

      when 'exercise' then
        select e.id into v_exercise_id
        from public.exercises e
        where e.id = _entity_id;

        if v_exercise_id is null then
          raise exception 'Exercício não encontrado';
        end if;

        if not exists (
          select 1 from public.exercise_questions q
          where q.exercise_id = _entity_id
        ) then
          raise exception 'O exercício precisa ter pelo menos uma questão';
        end if;

        if exists (
          select 1
          from public.exercise_questions q
          where q.exercise_id = _entity_id
            and q.question_type = 'multiple_choice'
            and (
              not exists (
                select 1 from public.exercise_options o
                where o.question_id = q.id
              )
              or not exists (
                select 1 from public.exercise_options o
                where o.question_id = q.id and o.is_correct
              )
            )
        ) then
          raise exception 'Toda questão de múltipla escolha precisa ter opções e uma resposta correta';
        end if;
    end case;
  end if;

  case _entity_type
    when 'course' then
      update public.courses
      set published = _published
      where id = _entity_id
      returning name into v_name;

    when 'discipline' then
      update public.disciplines
      set published = _published, updated_at = now()
      where id = _entity_id
      returning name into v_name;

    when 'topic' then
      update public.topics
      set published = _published, updated_at = now()
      where id = _entity_id
      returning name into v_name;

    when 'material' then
      update public.materials
      set status = case when _published then 'published' else 'draft' end,
          updated_at = now()
      where id = _entity_id
      returning title into v_name;

    when 'exercise' then
      update public.exercises
      set published = _published, updated_at = now()
      where id = _entity_id
      returning title into v_name;

    else
      raise exception 'Tipo de conteúdo inválido';
  end case;

  if v_name is null then
    raise exception 'Conteúdo não encontrado';
  end if;

  return jsonb_build_object(
    'entity_type', _entity_type,
    'entity_id', _entity_id,
    'name', v_name,
    'published', _published
  );
end;
$function$;
