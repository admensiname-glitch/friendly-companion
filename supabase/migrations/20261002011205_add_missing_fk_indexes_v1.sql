create index if not exists ai_micro_assessments_conversation_id_idx on public.ai_micro_assessments(conversation_id);
create index if not exists evaluation_attempts_exercise_id_idx on public.evaluation_attempts(exercise_id);
create index if not exists exercises_source_id_idx on public.exercises(source_id);
create index if not exists source_rights_license_id_idx on public.source_rights(license_id);
create index if not exists topic_videos_source_id_idx on public.topic_videos(source_id);