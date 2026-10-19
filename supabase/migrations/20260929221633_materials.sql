-- ============================================================
-- Migration: 20260929221633_materials.sql
-- Tabelas de material didático, seções e citações
-- ============================================================

-- ── Etapa 1: tabelas ────────────────────────────────────────────────────────

CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  introduction text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE material_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE material_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  section_id uuid REFERENCES material_sections(id) ON DELETE SET NULL,
  citation_label text,
  locator text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Etapa 2: índices ───────────────────────────────────────────────────────

CREATE INDEX idx_materials_topic_id ON materials(topic_id);
CREATE INDEX idx_materials_status ON materials(status);
CREATE INDEX idx_material_sections_material_id ON material_sections(material_id);
CREATE INDEX idx_material_sections_position ON material_sections(position);
CREATE INDEX idx_material_citations_material_id ON material_citations(material_id);
CREATE INDEX idx_material_citations_source_id ON material_citations(source_id);

-- ── Etapa 3: RLS ────────────────────────────────────────────────────────────

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_citations ENABLE ROW LEVEL SECURITY;

-- materials: leitura de publicados para alunos autenticados
CREATE POLICY "materials_select_published"
  ON materials FOR SELECT
  USING (
    current_setting('request.jwt.claim_role', true) IN ('student', 'admin')
    AND status = 'published'
  );

-- material_sections: leitura via material publicado
CREATE POLICY "material_sections_select"
  ON material_sections FOR SELECT
  USING (
    current_setting('request.jwt.claim_role', true) IN ('student', 'admin')
    AND EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_sections.material_id
        AND materials.status = 'published'
    )
  );

-- material_citations: leitura via material publicado
CREATE POLICY "material_citations_select"
  ON material_citations FOR SELECT
  USING (
    current_setting('request.jwt.claim_role', true) IN ('student', 'admin')
    AND EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_citations.material_id
        AND materials.status = 'published'
    )
  );

-- Bloqueio de escrita para todos
CREATE POLICY "materials_no_insert" ON materials FOR INSERT WITH CHECK (false);
CREATE POLICY "materials_no_update" ON materials FOR UPDATE USING (false);
CREATE POLICY "materials_no_delete" ON materials FOR DELETE USING (false);

CREATE POLICY "material_sections_no_insert" ON material_sections FOR INSERT WITH CHECK (false);
CREATE POLICY "material_sections_no_update" ON material_sections FOR UPDATE USING (false);
CREATE POLICY "material_sections_no_delete" ON material_sections FOR DELETE USING (false);

CREATE POLICY "material_citations_no_insert" ON material_citations FOR INSERT WITH CHECK (false);
CREATE POLICY "material_citations_no_update" ON material_citations FOR UPDATE USING (false);
CREATE POLICY "material_citations_no_delete" ON material_citations FOR DELETE USING (false);

-- ── Etapa 4: material inicial para "Planejamento do ensino" ────────────────

DO $$
DECLARE
  planning_topic_id uuid;
  material_id uuid;
  mat_sec1_id uuid;
  mat_sec2_id uuid;
  mat_sec3_id uuid;
  mat_sec4_id uuid;
  mat_sec5_id uuid;
  src1_id uuid := '00000000-0000-0000-0000-000000000011'::uuid;
  src2_id uuid := '00000000-0000-0000-0000-000000000013'::uuid;
BEGIN
  -- Localiza o tópico
  SELECT id INTO planning_topic_id
  FROM topics
  WHERE name = 'Planejamento do ensino'
    AND published = true
  LIMIT 1;

  IF planning_topic_id IS NULL THEN
    RAISE NOTICE 'Tópico Planejamento do ensino não encontrado. Material não criado.';
    RETURN;
  END IF;

  -- Insere material
  INSERT INTO materials (id, topic_id, title, introduction, status)
  VALUES (
    '84439dee-5451-47a7-9062-9a7664db631d'::uuid,
    planning_topic_id,
    'Planejamento do ensino: fundamentos e elementos',
    'O planejamento do ensino é uma prática intencional que organiza o trabalho pedagógico em relação a objetivos, conteúdos, métodos e avaliação. Em vez de agir apenas pela improvisação ou pelo hábito, o docente que planeja reflete previamente sobre o que deseja alcançar, o que será trabalhado, de que forma e como verificar se a aprendizagem ocorreu. Essa organização não é um exercício burocrático: é uma ferramenta que permite tomar decisões conscious about the educational process, considerando as condições concretas da prática e os saberes dos estudantes. Nesta disciplina, você conhecerá os elementos fundamentais do planejamento e poderá utilizá-los como referência para a organização de suas práticas de ensino.',
    'published'
  )
  RETURNING id INTO material_id;

  -- Seção 1
  INSERT INTO material_sections (id, material_id, title, content, position)
  VALUES (
    gen_random_uuid(),
    material_id,
    'O que é planejamento do ensino',
    'Planejar o ensino significa organizar, de forma intencional e fundamentada, os elementos que compõem o processo de ensino e aprendizagem. Essa organização envolve decidir o que será ensinado (conteúdos), para quê será ensinado (objetivos), como será ensinado (métodos e procedimentos) e como verificar se a aprendizagem ocorreu (avaliação).\n\nO planejamento não é um ato isolado nem uma formalidade burocrática: ele é parte constitutiva da docência. A pesquisa de Costa e Souza (2024) destaca que o planejamento permite ao professor antecipar percursos didáticos, antecipar dificuldades e preparar estratégias adequadas ao contexto em que atua. Quando o docente planeja, ele deixa de reagir apenas aos acontecimentos e passa a conduzir intencionalmente o processo educativo.\n\nCasagrande e Faleiros (1991) apontam que a capacidade de planejar está diretamente ligada à formação docente e à compreensão do papel da Didática na organização do ensino. Ou seja, planejar exige domínio de conhecimentos pedagógicos e willingness to reflect on practice.',
    1
  )
  RETURNING id INTO mat_sec1_id;

  -- Seção 2
  INSERT INTO material_sections (id, material_id, title, content, position)
  VALUES (
    gen_random_uuid(),
    material_id,
    'Objetivos, conteúdos, métodos e avaliação',
    'Os quatro elementos centrais do planejamento — objetivos, conteúdos, métodos e avaliação — formam um conjunto interdependente. Os objetivos definem o que se espera que o estudante aprenda; os conteúdos representam os saberes selecionados para serem trabalhados; os métodos correspondem aos caminhos e procedimentos utilizados para promover a aprendizagem; e a avaliação fornece informações sobre o que foi aprendido e indica rumos para o replanejamento.\n\nCosta e Souza (2024) observam que a articulação entre esses elementos é o que confere coerência ao planejamento. Um planejamento em que os métodos não dialogam com os objetivos ou em que a avaliação não corresponde ao que foi trabalhado perde sua eficácia pedagógica. A articulação exige que o professor compreenda cada elemento em relação aos demais e em função do contexto específico de ensino.',
    2
  )
  RETURNING id INTO mat_sec2_id;

  -- Seção 3
  INSERT INTO material_sections (id, material_id, title, content, position)
  VALUES (
    gen_random_uuid(),
    material_id,
    'Planejamento e realidade da prática educativa',
    'Todo planejamento worthwhile é aquele que considera as condições concretas em que será desenvolvido. Isso inclui conhecer os estudantes — seus conhecimentos prévios, suas experiências, suas dificuldades e seus interesses — e considerar os recursos disponíveis, o tempo disponível e as características do ambiente educativo.\n\nCasagrande e Faleiros (1991) enfatizam que o planejamento na formação de professores não pode ser tratado como um exercício abstrato: ele precisa estar conectado à realidade das práticas docentes. Um planejamento que ignora o contexto corre o risco de ser irrealizável ou de não responder às necessidades efetivas dos estudantes. Por isso, o planejamento pedagógico exige que o professor observe, diagnostic e compreenda o cenário educativo antes de definir caminhos de ação.',
    3
  )
  RETURNING id INTO mat_sec3_id;

  -- Seção 4
  INSERT INTO material_sections (id, material_id, title, content, position)
  VALUES (
    gen_random_uuid(),
    material_id,
    'Planejar também é tomar decisões',
    'Uma visão comum, porém limitada, apresenta o planejamento como uma lista de atividades a serem cumpridas. Em uma perspectiva mais ampla, planejar é um processo de tomada de decisões. O professor precisa escolher entre diferentes possibilidades: qual abordagem metodológica é mais adequada? Que tipo de avaliação vai fornecer informações mais úteis? Que conteúdos são prioritários considerando o tempo disponível?\n\nEssas decisões não são técnicas no sentido restrito: elas envolvem valores, concepções de ensino e aprendizagem e compreensões sobre o papel da educação. Costa e Souza (2024) indicam que a visão docente sobre planejamento está diretamente ligada à conception que o professor tem de seu próprio papel profissional. Um docente que se vê como transmissor de conteúdos tende a planejar de forma diferente daquele que compreende o ensino como processo de mediação entre conhecimentos e estudantes.',
    4
  )
  RETURNING id INTO mat_sec4_id;

  -- Seção 5
  INSERT INTO material_sections (id, material_id, title, content, position)
  VALUES (
    gen_random_uuid(),
    material_id,
    'Síntese para estudo',
    'O planejamento do ensino é uma prática reflexiva e intencional que organiza os elementos do processo educativo — objetivos, conteúdos, métodos e avaliação — em função de resultados de aprendizagem definidos. Ele não é um documento fixo, mas um instrumento vivo que orienta a ação docente e deve ser permanentemente avaliado e replanejado.\n\nOs estudos de Costa e Souza (2024) e Casagrande e Faleiros (1991) mostram que a capacidade de planejar está vinculada tanto à formação teórica do professor quanto ao seu conhecimento sobre a realidade educacional em que atua. Para planejar de forma meaningful, o docente precisa conhecer os estudantes, comprender os objetivos de aprendizagem, selecionar conteúdos relevantes e escolher métodos adequados ao contexto. A avaliação, por sua vez, fornece os dados necessários para que o planejamento seja continuamente revisado e aprimorado.\n\nPerguntas para reflexão:\n• Como você tem organizado seu planejamento de ensino até agora?\n• Quais elementos você considera mais difíceis de articular ao planejar?\n• De que forma o conhecimento sobre seus estudantes influencia suas decisões de planejamento?',
    5
  )
  RETURNING id INTO mat_sec5_id;

  -- Vínculos de citação
  INSERT INTO material_citations (id, material_id, source_id, section_id, citation_label, locator)
  VALUES
    (gen_random_uuid(), material_id, src1_id, mat_sec1_id, 'Costa & Souza (2024)', 'DOI: 10.23925/2318-7115.2024v45i1e64401'),
    (gen_random_uuid(), material_id, src2_id, mat_sec1_id, 'Casagrande & Faleiros (1991)', 'DOI: 10.1590/S0103-863X1991000100006'),
    (gen_random_uuid(), material_id, src1_id, mat_sec2_id, 'Costa & Souza (2024)', 'DOI: 10.23925/2318-7115.2024v45i1e64401'),
    (gen_random_uuid(), material_id, src1_id, mat_sec4_id, 'Costa & Souza (2024)', 'DOI: 10.23925/2318-7115.2024v45i1e64401'),
    (gen_random_uuid(), material_id, src1_id, mat_sec5_id, 'Costa & Souza (2024)', 'DOI: 10.23925/2318-7115.2024v45i1e64401'),
    (gen_random_uuid(), material_id, src2_id, mat_sec5_id, 'Casagrande & Faleiros (1991)', 'DOI: 10.1590/S0103-863X1991000100006');

END $$;
