-- RLS is deny-by-default when no permissive policy exists.
-- Remove redundant explicit FALSE policies that only duplicate that behavior.

DROP POLICY IF EXISTS "No deletes on material_sections" ON public.material_sections;
DROP POLICY IF EXISTS material_sections_no_delete ON public.material_sections;
DROP POLICY IF EXISTS "No inserts on material_sections" ON public.material_sections;
DROP POLICY IF EXISTS material_sections_no_insert ON public.material_sections;
DROP POLICY IF EXISTS "No deletes on materials" ON public.materials;
DROP POLICY IF EXISTS materials_no_delete ON public.materials;
DROP POLICY IF EXISTS "No inserts on materials" ON public.materials;
DROP POLICY IF EXISTS materials_no_insert ON public.materials;
