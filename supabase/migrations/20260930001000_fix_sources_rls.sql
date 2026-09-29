-- ============================================================
-- Migration: 20260930001000_fix_sources_rls.sql
-- Corrige a policy RLS de SELECT da tabela public.sources
-- Troca request.jwt.claim_role por public.has_role()
-- ============================================================

BEGIN;

-- Remove a policy antiga que depende de request.jwt.claim_role
DROP POLICY IF EXISTS "sources_select" ON sources;

-- Cria a policy nova com has_role usando subselect escalar (mais compatível)
CREATE POLICY "sources_select_permitted"
  ON sources FOR SELECT
  TO authenticated
  USING (
    ((select public.has_role('student')) OR (select public.has_role('admin')))
  );

COMMIT;
