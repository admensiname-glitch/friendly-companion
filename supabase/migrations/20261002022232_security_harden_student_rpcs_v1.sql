-- Ensina-me: isolate student-facing privileged RPC implementations.
-- The public API keeps the existing function contract but is SECURITY INVOKER.
-- The privileged implementation remains in the private schema.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.finalize_topic_evaluation(uuid,jsonb) set schema private;
alter function public.finish_study_session(uuid) set schema private;
alter function public.get_student_dashboard_topics() set schema private;
alter function public.get_student_performance_summary() set schema private;
alter function public.get_student_recent_evaluations(integer) set schema private;
alter function public.get_student_review_items() set schema private;
alter function public.get_student_study_recommendation() set schema private;
alter function public.get_student_today_study() set schema private;
alter function public.get_student_topic_application_progress(uuid) set schema private;
alter function public.has_role(text) set schema private;
alter function public.mark_material_section_complete(uuid) set schema private;
alter function public.start_study_session(uuid) set schema private;
alter function public.start_topic_evaluation(uuid) set schema private;
alter function public.submit_application_answer(uuid,uuid,text) set schema private;

revoke execute on function private.finalize_topic_evaluation(uuid,jsonb) from public, anon;
revoke execute on function private.finish_study_session(uuid) from public, anon;
revoke execute on function private.get_student_dashboard_topics() from public, anon;
revoke execute on function private.get_student_performance_summary() from public, anon;
revoke execute on function private.get_student_recent_evaluations(integer) from public, anon;
revoke execute on function private.get_student_review_items() from public, anon;
revoke execute on function private.get_student_study_recommendation() from public, anon;
revoke execute on function private.get_student_today_study() from public, anon;
revoke execute on function private.get_student_topic_application_progress(uuid) from public, anon;
revoke execute on function private.has_role(text) from public, anon;
revoke execute on function private.mark_material_section_complete(uuid) from public, anon;
revoke execute on function private.start_study_session(uuid) from public, anon;
revoke execute on function private.start_topic_evaluation(uuid) from public, anon;
revoke execute on function private.submit_application_answer(uuid,uuid,text) from public, anon;

grant execute on function private.finalize_topic_evaluation(uuid,jsonb) to authenticated;
grant execute on function private.finish_study_session(uuid) to authenticated;
grant execute on function private.get_student_dashboard_topics() to authenticated;
grant execute on function private.get_student_performance_summary() to authenticated;
grant execute on function private.get_student_recent_evaluations(integer) to authenticated;
grant execute on function private.get_student_review_items() to authenticated;
grant execute on function private.get_student_study_recommendation() to authenticated;
grant execute on function private.get_student_today_study() to authenticated;
grant execute on function private.get_student_topic_application_progress(uuid) to authenticated;
grant execute on function private.has_role(text) to authenticated;
grant execute on function private.mark_material_section_complete(uuid) to authenticated;
grant execute on function private.start_study_session(uuid) to authenticated;
grant execute on function private.start_topic_evaluation(uuid) to authenticated;
grant execute on function private.submit_application_answer(uuid,uuid,text) to authenticated;

create or replace function public.finalize_topic_evaluation(_attempt_id uuid,_answers jsonb)
returns jsonb language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select private.finalize_topic_evaluation($1,$2); $$;

create or replace function public.finish_study_session(_session_id uuid)
returns jsonb language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select private.finish_study_session($1); $$;

create or replace function public.get_student_dashboard_topics()
returns table(
  discipline_id uuid, discipline_name text, topic_id uuid, topic_name text,
  topic_description text, progress integer, best_score numeric, status text, review_count integer
)
language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select * from private.get_student_dashboard_topics(); $$;

create or replace function public.get_student_performance_summary()
returns jsonb language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select private.get_student_performance_summary(); $$;

create or replace function public.get_student_recent_evaluations(_limit integer default 10)
returns table(
  attempt_id uuid, topic_id uuid, topic_name text, discipline_name text,
  score numeric, correct_answers integer, total_questions integer, completed_at timestamptz
)
language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select * from private.get_student_recent_evaluations($1); $$;

create or replace function public.get_student_review_items()
returns table(
  topic_id uuid, topic_name text, discipline_id uuid, discipline_name text,
  difficulty_tag text, count integer, last_occurrence timestamptz, review_status text, correct_count integer
)
language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select * from private.get_student_review_items(); $$;

create or replace function public.get_student_study_recommendation()
returns jsonb language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select private.get_student_study_recommendation(); $$;

create or replace function public.get_student_today_study()
returns jsonb language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select private.get_student_today_study(); $$;

create or replace function public.get_student_topic_application_progress(_topic_id uuid)
returns table(answered_questions integer,total_questions integer,progress integer)
language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select * from private.get_student_topic_application_progress($1); $$;

create or replace function public.has_role(required_role text)
returns boolean language sql stable security invoker
set search_path to 'public','pg_temp'
as $$ select private.has_role($1); $$;

create or replace function public.mark_material_section_complete(_section_id uuid)
returns table(completed_sections integer,total_sections integer)
language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select * from private.mark_material_section_complete($1); $$;

create or replace function public.start_study_session(_topic_id uuid)
returns jsonb language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select private.start_study_session($1); $$;

create or replace function public.start_topic_evaluation(_topic_id uuid)
returns jsonb language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select private.start_topic_evaluation($1); $$;

create or replace function public.submit_application_answer(
  _question_id uuid,
  _selected_option_id uuid default null,
  _open_text text default null
)
returns jsonb language sql volatile security invoker
set search_path to 'public','pg_temp'
as $$ select private.submit_application_answer($1,$2,$3); $$;

revoke execute on function public.finalize_topic_evaluation(uuid,jsonb) from public, anon;
revoke execute on function public.finish_study_session(uuid) from public, anon;
revoke execute on function public.get_student_dashboard_topics() from public, anon;
revoke execute on function public.get_student_performance_summary() from public, anon;
revoke execute on function public.get_student_recent_evaluations(integer) from public, anon;
revoke execute on function public.get_student_review_items() from public, anon;
revoke execute on function public.get_student_study_recommendation() from public, anon;
revoke execute on function public.get_student_today_study() from public, anon;
revoke execute on function public.get_student_topic_application_progress(uuid) from public, anon;
revoke execute on function public.has_role(text) from public, anon;
revoke execute on function public.mark_material_section_complete(uuid) from public, anon;
revoke execute on function public.start_study_session(uuid) from public, anon;
revoke execute on function public.start_topic_evaluation(uuid) from public, anon;
revoke execute on function public.submit_application_answer(uuid,uuid,text) from public, anon;

grant execute on function public.finalize_topic_evaluation(uuid,jsonb) to authenticated;
grant execute on function public.finish_study_session(uuid) to authenticated;
grant execute on function public.get_student_dashboard_topics() to authenticated;
grant execute on function public.get_student_performance_summary() to authenticated;
grant execute on function public.get_student_recent_evaluations(integer) to authenticated;
grant execute on function public.get_student_review_items() to authenticated;
grant execute on function public.get_student_study_recommendation() to authenticated;
grant execute on function public.get_student_today_study() to authenticated;
grant execute on function public.get_student_topic_application_progress(uuid) to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.mark_material_section_complete(uuid) to authenticated;
grant execute on function public.start_study_session(uuid) to authenticated;
grant execute on function public.start_topic_evaluation(uuid) to authenticated;
grant execute on function public.submit_application_answer(uuid,uuid,text) to authenticated;
