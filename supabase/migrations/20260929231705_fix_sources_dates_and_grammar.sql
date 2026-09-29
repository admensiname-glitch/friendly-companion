-- ============================================================
-- Migration: 20260929231705_fix_sources_dates_and_grammar.sql
-- Corrige publication_date das fontes e erro gramatical no material
-- ============================================================

DO $$
DECLARE
  mat_id uuid;
BEGIN
  -- Fonte Costa & Souza: ano correto 2024
  UPDATE sources
  SET publication_date = '2024-01-01'
  WHERE id = '00000000-0000-0000-0000-000000000011'
    AND (publication_date IS NULL OR publication_date <> '2024-01-01');

  RAISE NOTICE 'Source Costa & Souza: publication_date = 2024-01-01.';

  -- Fonte Casagrande & Faleiros: ano correto 1991
  UPDATE sources
  SET publication_date = '1991-01-01'
  WHERE id = '00000000-0000-0000-0000-000000000013'
    AND (publication_date IS NULL OR publication_date <> '1991-01-01');

  RAISE NOTICE 'Source Casagrande & Faleiros: publication_date = 1991-01-01.';

  -- Corrige erro gramatical: 'diagnostiquear' → 'diagnostique'
  UPDATE material_sections
  SET content = REPLACE(content, 'diagnostiquear', 'diagnostique'),
      updated_at = now()
  WHERE content LIKE '%diagnostiquear%';

  RAISE NOTICE 'Erro gramatical corrigido.';

END $$;
