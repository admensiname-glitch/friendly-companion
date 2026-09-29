-- ============================================================
-- Migration: 20260929211805_academic_sources.sql
-- Base acadêmica real do Ensina-me
-- Fontes, licenças CC-BY, Pedagogia/Didática e tópicos iniciais
-- ============================================================

-- ── Etapa 1: drop de tabelas existentes (ordem de dependência) ──────────────

DROP TABLE IF EXISTS topic_sources;
DROP TABLE IF EXISTS source_rights;
DROP TABLE IF EXISTS sources;
DROP TABLE IF EXISTS licenses;

-- ── Etapa 2: tabelas ────────────────────────────────────────────────────────

-- Licenças (Creative Commons e outras)
CREATE TABLE licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  url text,
  permits_derivatives boolean NOT NULL DEFAULT false,
  permits_commercial boolean NOT NULL DEFAULT false,
  requires_attribution boolean NOT NULL DEFAULT true,
  notes text
);

-- Fontes acadêmicas
CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_type text NOT NULL,
  authors jsonb DEFAULT '[]'::jsonb,
  publisher text,
  publication_date date,
  doi text,
  canonical_url text,
  language text DEFAULT 'pt'::text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Direitos autorais por fonte
CREATE TABLE source_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  license_id uuid REFERENCES licenses(id),
  rights_class text NOT NULL CHECK (rights_class IN ('OPEN','METADATA_ONLY','USER_AUTHORIZED','RESTRICTED','UNKNOWN')),
  access_model text NOT NULL DEFAULT 'UNKNOWN' CHECK (access_model IN ('OPEN','PAYWALL','UNKNOWN')),
  evidence_url text,
  evidence_note text,
  verified_at timestamptz DEFAULT now(),
  superseded_at timestamptz,
  CONSTRAINT source_rights_source_id_unique UNIQUE (source_id)
);

-- Vínculo entre tópico e fonte
CREATE TABLE topic_sources (
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('BASE','COMPLEMENTAR','CONTEXTO')),
  status text NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('APPROVED','PROPOSED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, source_id)
);

-- ── Etapa 3: RLS ────────────────────────────────────────────────────────────

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_sources ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para aluno autenticado
CREATE OR REPLACE FUNCTION "auth_role"()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN current_setting('request.jwt.claim_role', true) IN ('student', 'admin') THEN current_setting('request.jwt.claim_role', true)
    ELSE NULL
  END;
$$;

-- Licenças: leitura pública (metadados são públicos)
CREATE POLICY "licenses_select_public"
  ON licenses FOR SELECT
  USING (true);

-- Fontes: leitura para alunos autenticados
CREATE POLICY "sources_select_authenticated"
  ON sources FOR SELECT
  USING (
    current_setting('request.jwt.claim_role', true) IN ('student', 'admin')
    AND status = 'active'
  );

-- Source rights: leitura de direitos OPEN para alunos autenticados
CREATE POLICY "source_rights_select_open"
  ON source_rights FOR SELECT
  USING (
    current_setting('request.jwt.claim_role', true) IN ('student', 'admin')
    AND rights_class = 'OPEN'
  );

-- Topic sources: leitura de vínculos APPROVED para alunos autenticados
CREATE POLICY "topic_sources_select_approved"
  ON topic_sources FOR SELECT
  USING (
    current_setting('request.jwt.claim_role', true) IN ('student', 'admin')
    AND status = 'APPROVED'
  );

-- Impedir escrita por todos
CREATE POLICY "licenses_no_insert" ON licenses FOR INSERT WITH CHECK (false);
CREATE POLICY "licenses_no_update" ON licenses FOR UPDATE USING (false);
CREATE POLICY "licenses_no_delete" ON licenses FOR DELETE USING (false);

CREATE POLICY "sources_no_insert" ON sources FOR INSERT WITH CHECK (false);
CREATE POLICY "sources_no_update" ON sources FOR UPDATE USING (false);
CREATE POLICY "sources_no_delete" ON sources FOR DELETE USING (false);

CREATE POLICY "source_rights_no_insert" ON source_rights FOR INSERT WITH CHECK (false);
CREATE POLICY "source_rights_no_update" ON source_rights FOR UPDATE USING (false);
CREATE POLICY "source_rights_no_delete" ON source_rights FOR DELETE USING (false);

CREATE POLICY "topic_sources_no_insert" ON topic_sources FOR INSERT WITH CHECK (false);
CREATE POLICY "topic_sources_no_update" ON topic_sources FOR UPDATE USING (false);
CREATE POLICY "topic_sources_no_delete" ON topic_sources FOR DELETE USING (false);

-- ── Etapa 4: licença inicial ────────────────────────────────────────────────

INSERT INTO licenses (id, code, name, url, permits_derivatives, permits_commercial, requires_attribution, notes)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'CC-BY-4.0',
  'Creative Commons Attribution 4.0 International',
  'https://creativecommons.org/licenses/by/4.0/deed.pt-br',
  true,
  true,
  true,
  'Licença aberta que permite uso comercial, criação de obras derivadas e redistribuição, desde que a atribuição adequada seja mantida.'
);

-- ── Etapa 5: fontes reais ───────────────────────────────────────────────────

-- Fonte 1: Costa & Souza (2024)
WITH src1 AS (
  INSERT INTO sources (id, title, source_type, authors, publisher, publication_date, doi, canonical_url, language, status)
  VALUES (
    '00000000-0000-0000-0000-000000000011'::uuid,
    'Didática e planejamento de ensino na visão docente',
    'article',
    '[
      {"name": "Ademárcia Lopes de Oliveira Costa"},
      {"name": "Maria Clara de Lima Souza"}
    ]'::jsonb,
    'The ESPecialist',
    '2024-01-01',
    '10.23925/2318-7115.2024v45i1e64401',
    'https://revista.pucsp.br/ttps/article/view/64401',
    'pt',
    'active'
  )
  RETURNING id
)
INSERT INTO source_rights (source_id, license_id, rights_class, access_model, evidence_url, evidence_note)
SELECT src1.id, '00000000-0000-0000-0000-000000000001'::uuid, 'OPEN', 'OPEN',
  'https://creativecommons.org/licenses/by/4.0/deed.pt-br',
  'Periódico utiliza licença CC BY 4.0 conforme indicado na página de direitos. Este registro usa o artigo exclusivamente como fonte para síntese e metadados acadêmicos.'
FROM src1;

-- Fonte 2: Ferreira & Silva (2009)
WITH src2 AS (
  INSERT INTO sources (id, title, source_type, authors, publisher, publication_date, doi, canonical_url, language, status)
  VALUES (
    '00000000-0000-0000-0000-000000000012'::uuid,
    '"Didática" no contexto da Educação a Distância: quais os desafios?',
    'article',
    '[
      {"name": "Renilze de B. A. dos S. Ferreira"},
      {"name": "Ivanda Maria Martins Silva"}
    ]'::jsonb,
    'Revista Brasileira de Aprendizagem Aberta e a Distância',
    '2009-01-01',
    '10.17143/rbaad.v8i0.217',
    'https://www.unirevista.unisul.br/PPGInter/index.php/rbaad/article/view/217',
    'pt',
    'active'
  )
  RETURNING id
)
INSERT INTO source_rights (source_id, license_id, rights_class, access_model, evidence_url, evidence_note)
SELECT src2.id, '00000000-0000-0000-0000-000000000001'::uuid, 'OPEN', 'OPEN',
  'https://creativecommons.org/licenses/by/4.0/deed.pt-br',
  'Periódico RBAAD indica licença CC BY 4.0. Fonte utilizada exclusivamente como referência para síntese e metadados.'
FROM src2;

-- Fonte 3: Casagrande & Faleiros (1991)
WITH src3 AS (
  INSERT INTO sources (id, title, source_type, authors, publisher, publication_date, doi, canonical_url, language, status)
  VALUES (
    '00000000-0000-0000-0000-000000000013'::uuid,
    'Didática no curso de pós-graduação: uma contribuição para a transformação do fazer docente na universidade',
    'article',
    '[
      {"name": "Lisete Diniz Ribas Casagrande"},
      {"name": "Ana Maria Faleiros"}
    ]'::jsonb,
    'Paidéia (Ribeirão Preto)',
    '1991-01-01',
    '10.1590/S0103-863X1991000100006',
    'https://www.scielo.br/j/paideia/a/s3G8p9QJKh3ZgvRY5B8mGBk/?lang=pt',
    'pt',
    'active'
  )
  RETURNING id
)
INSERT INTO source_rights (source_id, license_id, rights_class, access_model, evidence_url, evidence_note)
SELECT src3.id, '00000000-0000-0000-0000-000000000001'::uuid, 'OPEN', 'OPEN',
  'https://www.scielo.br/j/paideia/about',
  'Periódico SciELO indica licença CC BY. Este registro utiliza o artigo exclusivamente como fonte para síntese e metadados. Não são reproduzidos trechos extensos, figuras ou tabelas.'
FROM src3;

-- ── Etapa 6: curso Pedagogia publicado ──────────────────────────────────────

UPDATE courses SET published = true
WHERE slug = 'pedagogia' OR name ILIKE '%Pedagogia%';

-- ── Etapa 7: disciplina Didática ─────────────────────────────────────────────

-- Verifica se já existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM disciplines WHERE name = 'Didática') THEN
    UPDATE disciplines
    SET published = true, course_id = (SELECT id FROM courses WHERE slug = 'pedagogia' OR name ILIKE '%Pedagogia%' LIMIT 1)
    WHERE name = 'Didática';
  ELSE
    INSERT INTO disciplines (name, course_id, published, description)
    SELECT
      'Didática',
      id,
      true,
      'Estudo dos processos de ensino e aprendizagem, planejamento didático, métodos e avaliação educacional.'
    FROM courses
    WHERE slug = 'pedagogia' OR name ILIKE '%Pedagogia%'
    LIMIT 1;
  END IF;
END $$;

-- ── Etapa 8: quatro tópicos de Didática ──────────────────────────────────────

-- Obtém o id da disciplina Didática criada/atualizada
DO $$
DECLARE
  didatica_id uuid;
BEGIN
  SELECT id INTO didatica_id FROM disciplines WHERE name = 'Didática' LIMIT 1;

  -- Tópico 1
  INSERT INTO topics (discipline_id, name, description, position, published)
  VALUES (didatica_id,
    'Didática e os processos de ensinar e aprender',
    'A Didática pode ser compreendida como um campo de reflexão e ação sobre os processos de ensinar e aprender e sobre as relações que os constituem.',
    1, true)
  ON CONFLICT DO NOTHING;

  -- Tópico 2
  INSERT INTO topics (discipline_id, name, description, position, published)
  VALUES (didatica_id,
    'Planejamento do ensino',
    'O planejamento organiza intencionalmente o ensino em relação a objetivos, conteúdos, métodos e avaliação, considerando as condições concretas da prática educativa.',
    2, true)
  ON CONFLICT DO NOTHING;

  -- Tópico 3
  INSERT INTO topics (discipline_id, name, description, position, published)
  VALUES (didatica_id,
    'Objetivos, conteúdos e métodos de ensino',
    'Os objetivos orientam os resultados esperados; os conteúdos selecionam e organizam conhecimentos a serem trabalhados; e os métodos correspondem aos meios e procedimentos utilizados para favorecer a aprendizagem.',
    3, true)
  ON CONFLICT DO NOTHING;

  -- Tópico 4
  INSERT INTO topics (discipline_id, name, description, position, published)
  VALUES (didatica_id,
    'Avaliação da aprendizagem',
    'A avaliação integra o processo de ensino e pode fornecer informações para analisar a aprendizagem, identificar dificuldades e orientar decisões e replanejamento.',
    4, true)
  ON CONFLICT DO NOTHING;
END $$;

-- ── Etapa 9: vínculos topic_sources APPROVED ────────────────────────────────

DO $$
DECLARE
  t1_id uuid;
  t2_id uuid;
  t3_id uuid;
  t4_id uuid;
  s1_id uuid := '00000000-0000-0000-0000-000000000011'::uuid;
  s2_id uuid := '00000000-0000-0000-0000-000000000012'::uuid;
  s3_id uuid := '00000000-0000-0000-0000-000000000013'::uuid;
BEGIN
  SELECT id INTO t1_id FROM topics WHERE name = 'Didática e os processos de ensinar e aprender' LIMIT 1;
  SELECT id INTO t2_id FROM topics WHERE name = 'Planejamento do ensino' LIMIT 1;
  SELECT id INTO t3_id FROM topics WHERE name = 'Objetivos, conteúdos e métodos de ensino' LIMIT 1;
  SELECT id INTO t4_id FROM topics WHERE name = 'Avaliação da aprendizagem' LIMIT 1;

  -- Tópico 1: Fonte 1 BASE, Fonte 2 COMPLEMENTAR
  IF t1_id IS NOT NULL THEN
    INSERT INTO topic_sources (topic_id, source_id, role, status) VALUES (t1_id, s1_id, 'BASE', 'APPROVED') ON CONFLICT DO NOTHING;
    INSERT INTO topic_sources (topic_id, source_id, role, status) VALUES (t1_id, s2_id, 'COMPLEMENTAR', 'APPROVED') ON CONFLICT DO NOTHING;
  END IF;

  -- Tópico 2: Fonte 1 BASE, Fonte 3 COMPLEMENTAR
  IF t2_id IS NOT NULL THEN
    INSERT INTO topic_sources (topic_id, source_id, role, status) VALUES (t2_id, s1_id, 'BASE', 'APPROVED') ON CONFLICT DO NOTHING;
    INSERT INTO topic_sources (topic_id, source_id, role, status) VALUES (t2_id, s3_id, 'COMPLEMENTAR', 'APPROVED') ON CONFLICT DO NOTHING;
  END IF;

  -- Tópico 3: Fonte 1 BASE, Fonte 3 COMPLEMENTAR
  IF t3_id IS NOT NULL THEN
    INSERT INTO topic_sources (topic_id, source_id, role, status) VALUES (t3_id, s1_id, 'BASE', 'APPROVED') ON CONFLICT DO NOTHING;
    INSERT INTO topic_sources (topic_id, source_id, role, status) VALUES (t3_id, s3_id, 'COMPLEMENTAR', 'APPROVED') ON CONFLICT DO NOTHING;
  END IF;

  -- Tópico 4: Fonte 1 BASE, Fonte 3 COMPLEMENTAR
  IF t4_id IS NOT NULL THEN
    INSERT INTO topic_sources (topic_id, source_id, role, status) VALUES (t4_id, s1_id, 'BASE', 'APPROVED') ON CONFLICT DO NOTHING;
    INSERT INTO topic_sources (topic_id, source_id, role, status) VALUES (t4_id, s3_id, 'COMPLEMENTAR', 'APPROVED') ON CONFLICT DO NOTHING;
  END IF;
END $$;
