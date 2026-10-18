
-- Under RLS, absence of a permissive INSERT/DELETE policy is deny-by-default.
-- Remove duplicate false policies that only added planner work/advisor noise.

DROP POLICY IF EXISTS "No deletes on material_sections" ON public.material_sections;
DROP POLICY IF EXISTS material_sections_no_delete ON public.material_sections;
DROP POLICY IF EXISTS "No inserts on material_sections" ON public.material_sections;
DROP POLICY IF EXISTS material_sections_no_insert ON public.material_sections;
DROP POLICY IF EXISTS "No deletes on materials" ON public.materials;
DROP POLICY IF EXISTS materials_no_delete ON public.materials;
DROP POLICY IF EXISTS "No inserts on materials" ON public.materials;
DROP POLICY IF EXISTS materials_no_insert ON public.materials;
