-- Harden internal audit/queue tables. Do not FORCE RLS: owner-owned SECURITY DEFINER queue processor must continue to work.
alter table private.professor_topic_audits enable row level security;
alter table private.professor_question_audits enable row level security;
alter table private.assistant_content_audits enable row level security;
alter table private.content_rebuild_queue enable row level security;
-- No policies are created: direct access remains default-deny. Existing SECURITY DEFINER functions are owned by postgres and are not FORCE-subjected to RLS.
