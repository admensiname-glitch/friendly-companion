-- ============================================================
-- Migration: 20260929231227_fix_sources_metadata.sql
-- Corrige metadados das fontes e erros gramaticais do
-- material "Planejamento do ensino: fundamentos e elementos"
-- ============================================================

DO $$
DECLARE
  mat_id uuid;
BEGIN
  -- Localiza o material
  SELECT id INTO mat_id
  FROM materials
  WHERE title = 'Planejamento do ensino: fundamentos e elementos'
    AND status = 'published'
  LIMIT 1;

  IF mat_id IS NULL THEN
    RAISE NOTICE 'Material nao encontrado. Nenhuma alteracao aplicada.';
    RETURN;
  END IF;

  RAISE NOTICE 'Material encontrado: %', mat_id;

  -- ============================================================
  -- PARTE 1: Fontes
  -- ============================================================

  -- Fonte Costa & Souza (ID 011)
  UPDATE sources
  SET
    title        = 'Didática e planejamento de ensino na visão docente',
    authors      = '["Ademárcia Lopes de Oliveira Costa", "Maria Clara de Lima Souza"]'::jsonb,
    publication_date = '2024-01-01',
    doi          = '10.23925/2318-7115.2024v45i1e64401',
    canonical_url = 'https://revistas.pucsp.br/esp/article/view/64401'
  WHERE id = '00000000-0000-0000-0000-000000000011';

  RAISE NOTICE 'Fonte Costa & Souza atualizada.';

  -- Fonte Casagrande & Faleiros (ID 013)
  UPDATE sources
  SET
    title        = 'Didática no curso de pós-graduação: uma contribuição para a transformação do fazer docente na universidade',
    authors      = '["Lisete Diniz Ribas Casagrande", "Ana Maria Faleiros"]'::jsonb,
    publication_date = '1991-01-01',
    doi          = '10.1590/S0103-863X1991000100006',
    canonical_url = 'https://www.scielo.br/j/paideia/a/s3G8p9QJKh3ZgvRY5B8mGBk/?lang=pt'
  WHERE id = '00000000-0000-0000-0000-000000000013';

  RAISE NOTICE 'Fonte Casagrande & Faleiros atualizada.';

  -- ============================================================
  -- PARTE 2: Erros gramaticais na introduction
  -- ============================================================

  -- Corrige: 'decisões o processo educativo' → 'decisões sobre o processo educativo'
  UPDATE materials
  SET
    introduction = REPLACE(
      introduction,
      'decisões o processo educativo',
      'decisões sobre o processo educativo'
    ),
    updated_at = now()
  WHERE id = mat_id;

  RAISE NOTICE 'Introduction corrigida.';

  -- ============================================================
  -- PARTE 3: Erros gramaticais nas sections
  -- ============================================================

  -- Corrige: 'diagnostic' → 'diagnostique'
  UPDATE material_sections
  SET
    content = REPLACE(content, 'diagnostic', 'diagnostique'),
    updated_at = now()
  WHERE material_id = mat_id
    AND content LIKE '%diagnostic%';

  RAISE NOTICE 'Section 3: "diagnostic" → "diagnostique".';

  -- Corrige: 'comprender' (sem acento) → 'compreender' (com acento)
  UPDATE material_sections
  SET
    content = REPLACE(content, 'comprender', 'compreender'),
    updated_at = now()
  WHERE material_id = mat_id
    AND content LIKE '%comprender%';

  RAISE NOTICE 'Section: acentos de "compreender" normalizados.';

  RAISE NOTICE 'Migration concluida com sucesso.';

END $$;
