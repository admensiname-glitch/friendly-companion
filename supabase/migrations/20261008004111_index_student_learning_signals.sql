create index if not exists student_learning_signals_user_last_seen_idx on public.student_learning_signals(user_id, last_seen desc);
create index if not exists student_learning_signals_topic_idx on public.student_learning_signals(topic_id);
create index if not exists student_learning_signals_discipline_idx on public.student_learning_signals(discipline_id);