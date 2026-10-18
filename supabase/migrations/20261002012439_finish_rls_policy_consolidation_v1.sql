
-- Finish RLS consolidation for the remaining advisor warnings.

DROP POLICY IF EXISTS "Admins select all evaluation attempts" ON public.evaluation_attempts;
DROP POLICY IF EXISTS "Students select own evaluation attempts" ON public.evaluation_attempts;
CREATE POLICY evaluation_attempts_select_student_admin
  ON public.evaluation_attempts
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins select all material chunk citations" ON public.material_chunk_citations;
DROP POLICY IF EXISTS "Students select published material chunk citations" ON public.material_chunk_citations;
CREATE POLICY material_chunk_citations_select_student_admin
  ON public.material_chunk_citations
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND EXISTS (
        SELECT 1
        FROM public.materials m
        WHERE m.id = public.material_chunk_citations.material_id
          AND m.status = 'published'
      )
    )
  );

-- No INSERT/DELETE policies means deny-by-default under RLS. The old
-- explicit false policies only duplicated that deny and triggered advisor warnings.
DROP POLICY IF EXISTS "No deletes on material_sections" ON public.material_sections;
DROP POLICY IF EXISTS material_sections_no_delete ON public.material_sections;
DROP POLICY IF EXISTS "No inserts on material_sections" ON public.material_sections;
DROP POLICY IF EXISTS material_sections_no_insert ON public.material_sections;
DROP POLICY IF EXISTS "No deletes on materials" ON public.materials;
DROP POLICY IF EXISTS materials_no_delete ON public.materials;
DROP POLICY IF EXISTS "No inserts on materials" ON public.materials;
DROP POLICY IF EXISTS materials_no_insert ON public.materials;
