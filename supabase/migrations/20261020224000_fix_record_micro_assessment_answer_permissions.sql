-- Keep answer-key data protected while allowing the validated RPC to record a student's answer.
-- The function checks auth.uid(), student role, assessment ownership, pending status and option bounds.
ALTER FUNCTION public.record_micro_assessment_answer(uuid, integer)
  SECURITY DEFINER;

ALTER FUNCTION public.record_micro_assessment_answer(uuid, integer)
  SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.record_micro_assessment_answer(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_micro_assessment_answer(uuid, integer) TO authenticated;
