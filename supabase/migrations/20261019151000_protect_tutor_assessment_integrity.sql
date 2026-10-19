-- Students may change only the lifecycle status through the client.
-- Answer key, explanation, selected answer and grading fields are server-owned.
REVOKE UPDATE ON TABLE public.ai_micro_assessments FROM authenticated;
GRANT UPDATE (status) ON TABLE public.ai_micro_assessments TO authenticated;
