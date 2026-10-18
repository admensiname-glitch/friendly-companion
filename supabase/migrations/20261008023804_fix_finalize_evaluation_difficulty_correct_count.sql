create or replace function public.update_topic_difficulty_after_answer(_user_id uuid, _topic_id uuid, _difficulty_tags text[], _is_correct boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_tag text;
begin
  foreach v_tag in array coalesce(_difficulty_tags,'{}'::text[]) loop
    if btrim(v_tag)='' then
      continue;
    end if;

    if _is_correct then
      update public.student_topic_difficulties
      set
        correct_count=correct_count+1,
        last_occurrence=now(),
        review_status=case
          when correct_count+1 >= 2 then 'mastered'
          else 'reviewed'
        end
      where user_id=_user_id
        and topic_id=_topic_id
        and difficulty_tag=btrim(v_tag);
    else
      insert into public.student_topic_difficulties(
        user_id,topic_id,difficulty_tag,count,correct_count,
        first_occurrence,last_occurrence,review_status
      )
      values(_user_id,_topic_id,btrim(v_tag),1,0,now(),now(),'pending')
      on conflict(user_id,topic_id,difficulty_tag)
      do update set
        count=public.student_topic_difficulties.count+1,
        correct_count=0,
        last_occurrence=now(),
        review_status='pending';
    end if;
  end loop;
end;
$function$;