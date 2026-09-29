-- ============================================================
-- Migration: 20260929225935_fix_material_citations_source_ids.sql
-- Validação e correção de source_id em material_citations
-- para o material "Planejamento do ensino: fundamentos e elementos"
-- ============================================================

DO $$
DECLARE
  mat_id uuid;
  src_costa uuid := '00000000-0000-0000-0000-000000000011'::uuid;
  src_casagrande uuid := '00000000-0000-0000-0000-000000000013'::uuid;
  citation_count integer;
  incorrect_count integer;
BEGIN
  -- Localiza o material
  SELECT id INTO mat_id
  FROM materials
  WHERE title = 'Planejamento do ensino: fundamentos e elementos'
    AND status = 'published'
  LIMIT 1;

  IF mat_id IS NULL THEN
    RAISE NOTICE 'Material "Planejamento do ensino: fundamentos e elementos" nao encontrado.';
    RETURN;
  END IF;

  -- Conta citations antes
  SELECT COUNT(*) INTO citation_count
  FROM material_citations
  WHERE material_id = mat_id;

  RAISE NOTICE 'Citations encontradas: %', citation_count;

  -- Verifica se as sources existem
  IF NOT EXISTS (SELECT 1 FROM sources WHERE id = src_costa) THEN
    RAISE EXCEPTION 'Source Costa & Souza (ID: %) nao encontrada em sources.', src_costa;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM sources WHERE id = src_casagrande) THEN
    RAISE EXCEPTION 'Source Casagrande & Faleiros (ID: %) nao encontrada em sources.', src_casagrande;
  END IF;

  -- Verifica se ha citations com source_id diferente das duas fontes reais
  SELECT COUNT(*) INTO incorrect_count
  FROM material_citations mc
  WHERE mc.material_id = mat_id
    AND mc.source_id NOT IN (src_costa, src_casagrande);

  RAISE NOTICE 'Citations com source_id incorreto: %', incorrect_count;

  -- Corrige source_id apenas se houver registros INCORRETOS (IDs que nao existem em sources)
  IF incorrect_count > 0 THEN
    -- Primeiro: corrige citations que apontam para IDs nao-existentes em sources
    -- baseando-se no citation_label para determinar a fonte correta
    UPDATE material_citations
    SET source_id = src_costa
    WHERE material_id = mat_id
      AND source_id NOT IN (src_costa, src_casagrande)
      AND citation_label ILIKE '%Costa%';

    UPDATE material_citations
    SET source_id = src_casagrande
    WHERE material_id = mat_id
      AND source_id NOT IN (src_costa, src_casagrande)
      AND citation_label ILIKE '%Casagrande%';

    -- Se ainda houver IDs incorretos (sem correspondencia via label), corrige
    -- usando o locator/DOI para identificar a fonte
    UPDATE material_citations
    SET source_id = src_costa
    WHERE material_id = mat_id
      AND source_id NOT IN (src_costa, src_casagrande)
      AND locator ILIKE '%23925%';

    UPDATE material_citations
    SET source_id = src_casagrande
    WHERE material_id = mat_id
      AND source_id NOT IN (src_costa, src_casagrande)
      AND locator ILIKE '%1590%';

    RAISE NOTICE 'Correcao aplicada: source_id atualizado para IDs reais.';
  ELSE
    RAISE NOTICE 'Nenhuma correcao necessaria: todos os source_id ja apontam para fontes reais.';
  END IF;

  -- Verificacao final: todas as citations do material agora apontam para sources existentes
  IF EXISTS (
    SELECT 1 FROM material_citations mc
    WHERE mc.material_id = mat_id
      AND NOT EXISTS (SELECT 1 FROM sources s WHERE s.id = mc.source_id)
  ) THEN
    RAISE WARNING 'AINDA EXISTEM citations com source_id sem correspondencia em sources!';
  ELSE
    RAISE NOTICE 'Verificacao final: todas as % citations apontam para sources validos.', citation_count;
  END IF;

END $$;
