-- Only the trusted ai-tutor server may create micro-assessments, including answer keys.
-- All four creation paths now use the service-role client and derive user_id from the
-- authenticated session; student clients retain SELECT on safe columns and UPDATE(status).
REVOKE INSERT ON TABLE public.ai_micro_assessments FROM anon, authenticated;
