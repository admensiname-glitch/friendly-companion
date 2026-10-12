REVOKE EXECUTE ON FUNCTION public.apply_community_owner_identity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_exam_text_answer(uuid, text) FROM PUBLIC, anon;