-- Keep the database hardening already applied in production reproducible.
-- RLS without policies intentionally denies direct client access to this private backup.
ALTER TABLE IF EXISTS private.exercise_quality_feedback_backups_20261018
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ai_tutor_generation_requests_assessment_id_idx
  ON public.ai_tutor_generation_requests (assessment_id);

CREATE INDEX IF NOT EXISTS ai_tutor_generation_requests_conversation_id_idx
  ON public.ai_tutor_generation_requests (conversation_id);

CREATE INDEX IF NOT EXISTS ai_tutor_generation_requests_topic_id_idx
  ON public.ai_tutor_generation_requests (topic_id);
