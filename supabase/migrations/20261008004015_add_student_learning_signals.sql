create table if not exists public.student_learning_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  concept text not null,
  signal_type text not null check (signal_type = any (array[
    'comprehension_gap','comparison_gap','application_gap','concept_gap','procedure_gap','micro_error'
  ]::text[])),
  severity integer not null default 3 check (severity between 1 and 5),
  occurrences integer not null default 1 check (occurrences >= 1),
  correct_count integer not null default 0 check (correct_count >= 0),
  evidence text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  status text not null default 'pending' check (status = any (array['pending','improving','mastered']::text[])),
  unique (user_id, topic_id, concept, signal_type)
);

alter table public.student_learning_signals enable row level security;

drop policy if exists "students_select_own_learning_signals" on public.student_learning_signals;
create policy "students_select_own_learning_signals"
on public.student_learning_signals
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.record_learning_signal(
  _topic_id uuid,
  _concept text,
  _signal_type text,
  _severity integer default 3,
  _evidence text default null,
  _correct boolean default false
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_discipline_id uuid;
begin
  if v_user_id is null then
    raise exception 'auth_required';
  end if;

  select discipline_id into v_discipline_id
  from public.topics
  where id = _topic_id and published = true;

  if v_discipline_id is null then
    raise exception 'topic_not_found';
  end if;

  if _concept is null or btrim(_concept) = '' then
    return;
  end if;

  insert into public.student_learning_signals
    (user_id, topic_id, discipline_id, concept, signal_type, severity, occurrences, correct_count, evidence, status)
  values
    (v_user_id, _topic_id, v_discipline_id, left(btrim(_concept), 180), _signal_type,
     greatest(1, least(coalesce(_severity, 3), 5)), 1,
     case when coalesce(_correct, false) then 1 else 0 end,
     nullif(left(coalesce(_evidence, ''), 500), ''), 'pending')
  on conflict (user_id, topic_id, concept, signal_type)
  do update set
    severity = greatest(public.student_learning_signals.severity, excluded.severity),
    occurrences = public.student_learning_signals.occurrences + 1,
    correct_count = public.student_learning_signals.correct_count + excluded.correct_count,
    evidence = coalesce(excluded.evidence, public.student_learning_signals.evidence),
    last_seen = now(),
    status = case
      when public.student_learning_signals.occurrences + 1 >= 4
        and public.student_learning_signals.correct_count + excluded.correct_count >= 3
        then 'improving'
      else 'pending'
    end;
end;
$$;

revoke all on function public.record_learning_signal(uuid,text,text,integer,text,boolean) from public;
grant execute on function public.record_learning_signal(uuid,text,text,integer,text,boolean) to authenticated;
