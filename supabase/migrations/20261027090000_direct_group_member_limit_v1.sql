-- Safety fix: keep Direct groups within the product limit of 20 total participants.
-- The creator is one participant, so at most 19 additional member IDs are accepted.
-- This migration is reviewed in an isolated branch and is NOT deployed by this commit.
create or replace function public.direct_create_group(group_title text, member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  new_conversation uuid;
  member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(coalesce(group_title, ''))) not between 2 and 80 then
    raise exception 'Invalid group title';
  end if;

  if coalesce(array_length(member_ids, 1), 0) < 1
     or array_length(member_ids, 1) > 19 then
    raise exception 'Invalid group members: groups support up to 20 participants including the creator';
  end if;

  if exists (
    select 1
    from unnest(member_ids) as x
    where x is null or x = auth.uid()
  ) then
    raise exception 'Invalid group members';
  end if;

  if (
    select count(*) from unnest(member_ids) as x
  ) <> (
    select count(distinct x) from unnest(member_ids) as x
  ) then
    raise exception 'Duplicate group members';
  end if;

  if exists (
    select 1
    from unnest(member_ids) as x
    where exists (
      select 1
      from public.direct_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = x)
         or (b.blocker_id = x and b.blocked_id = auth.uid())
    )
  ) then
    raise exception 'A selected member is blocked';
  end if;

  insert into public.direct_conversations(kind, title, created_by)
  values ('group', trim(group_title), auth.uid())
  returning id into new_conversation;

  insert into public.direct_conversation_members(conversation_id, user_id, role)
  values (new_conversation, auth.uid(), 'owner');

  foreach member_id in array member_ids loop
    insert into public.direct_conversation_members(conversation_id, user_id, role)
    values (new_conversation, member_id, 'member');
  end loop;

  return new_conversation;
end;
$function$;
