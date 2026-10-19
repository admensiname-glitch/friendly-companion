-- Keep the answer key and explanation private until the server has recorded an answer.
-- Edge Function answer grading reads these columns with the service role after checking
-- the authenticated user ID. The student client only receives the safe question fields.
REVOKE SELECT ON TABLE public.ai_micro_assessments FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  topic_id,
  conversation_id,
  question_text,
  options,
  difficulty,
  concept_tags,
  status,
  selected_option_index,
  is_correct,
  created_at,
  answered_at
) ON TABLE public.ai_micro_assessments TO authenticated;
