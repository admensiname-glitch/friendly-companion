-- Seed the stable Psychology of Education topic IDs referenced by the
-- historical psychology content migration that runs immediately afterward.
DO $migration$
DECLARE
  v_course_id uuid;
  v_discipline_id uuid;
BEGIN
  SELECT id INTO v_course_id
  FROM public.courses
  WHERE slug = 'pedagogia'
  ORDER BY created_at
  LIMIT 1;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Cannot seed Psychology topics: Pedagogia course is missing';
  END IF;

  SELECT id INTO v_discipline_id
  FROM public.disciplines
  WHERE course_id = v_course_id
    AND lower(name) = lower('Psicologia da Educação')
  ORDER BY created_at
  LIMIT 1;

  IF v_discipline_id IS NULL THEN
    INSERT INTO public.disciplines (
      course_id, name, description, published
    )
    VALUES (
      v_course_id,
      'Psicologia da Educação',
      'Desenvolvimento, aprendizagem, mediação, motivação e processos psicológicos na educação.',
      true
    )
    RETURNING id INTO v_discipline_id;
  ELSE
    UPDATE public.disciplines
    SET published = true
    WHERE id = v_discipline_id;
  END IF;

  -- A later psychology content migration links this source to the first two topics.
  INSERT INTO public.sources (
    id, title, publisher, source_type, status, language, canonical_url, doi, authors, publication_date
  )
  VALUES (
    '2d54eae8-d36c-4aa0-a4a4-a09d125d569f'::uuid,
    'Desenvolvimento e aprendizagem: da perspectiva construtivista à socioconstrutivista',
    'Psicologia da Educação',
    'article',
    'active',
    'pt-BR',
    'https://pepsic.bvsalud.org/scielo.php?pid=S1414-69752012000100004&script=sci_arttext',
    NULL,
    '[{"name":"Maria da Conceição Rodrigues Ferreira"},{"name":"Susana Maria Rodrigues Fernandes"}]'::jsonb,
    '2012-06-01'::date
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.source_rights (
    source_id, rights_class, access_model, evidence_url, evidence_note, verified_at
  )
  VALUES (
    '2d54eae8-d36c-4aa0-a4a4-a09d125d569f'::uuid,
    'METADATA_ONLY',
    'OPEN',
    'https://pepsic.bvsalud.org/scielo.php?pid=S1414-69752012000100004&script=sci_arttext',
    'Artigo público em base acadêmica; utilizado como referência e síntese original, sem armazenamento do texto integral.',
    now()
  )
  ON CONFLICT (source_id) DO NOTHING;

  INSERT INTO public.sources (
    id, title, publisher, source_type, status, language, canonical_url, doi, authors, publication_date
  )
  VALUES (
    'bdc07365-c40b-440a-93ce-484eb86f9002'::uuid,
    'O humano no homem: os pressupostos teórico-metodológicos da teoria histórico-cultural',
    'Psicologia & Sociedade',
    'article',
    'active',
    'pt-BR',
    'https://www.periodicos.capes.gov.br/index.php/acervo/buscador.html?id=W2076549406&source=all&task=detalhes',
    '10.1590/S0102-71822011000300005',
    '[{"name":"Vanessa Dias Moretti"},{"name":"Flávia da Silva Ferreira Asbahr"},{"name":"Algacir José Rigon"}]'::jsonb,
    '2011-09-01'::date
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.source_rights (
    source_id, rights_class, access_model, evidence_url, evidence_note, verified_at
  )
  VALUES (
    'bdc07365-c40b-440a-93ce-484eb86f9002'::uuid,
    'METADATA_ONLY',
    'OPEN',
    'https://www.periodicos.capes.gov.br/index.php/acervo/buscador.html?id=W2076549406&source=all&task=detalhes',
    'Referência acadêmica de acesso público no acervo CAPES; utilizado como referência e síntese original.',
    now()
  )
  ON CONFLICT (source_id) DO NOTHING;

  INSERT INTO public.sources (
    id, title, publisher, source_type, status, language, canonical_url, doi, authors, publication_date
  )
  VALUES (
    'c3673fd0-2a1c-499f-9d9b-6796dac1305a'::uuid,
    'Psicologia da educação II',
    'Universidade do Estado de Santa Catarina / eduCapes',
    'open_educational_resource',
    'active',
    'pt-BR',
    'https://educapes.capes.gov.br/handle/capes/560911?mode=full',
    NULL,
    '[{"name":"Giseli Renata Gouvêa"},{"name":"Maria da Glória Silva e Silva"},{"name":"Patrícia de Oliveira e Silva Pereira Mendes"}]'::jsonb,
    '2011-01-01'::date
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.source_rights (
    source_id, rights_class, access_model, evidence_url, evidence_note, verified_at
  )
  VALUES (
    'c3673fd0-2a1c-499f-9d9b-6796dac1305a'::uuid,
    'METADATA_ONLY',
    'OPEN',
    'https://educapes.capes.gov.br/handle/capes/560911?mode=full',
    'Recurso educacional disponível publicamente no eduCapes; utilizado como referência e síntese original.',
    now()
  )
  ON CONFLICT (source_id) DO NOTHING;

  INSERT INTO public.topics (
    id, discipline_id, name, description, position, published
  )
  VALUES
    (
      '7b5e6723-9d87-46dd-9e2e-4e00d1ec05eb'::uuid,
      v_discipline_id,
      'Desenvolvimento e aprendizagem',
      'Como diferentes perspectivas psicológicas explicam a relação entre desenvolvimento, ação, aprendizagem e contexto educativo.',
      1, true
    ),
    (
      '7b8f766f-dc23-44ce-8b44-7fc5c0135ddd'::uuid,
      v_discipline_id,
      'Construtivismo e construção do conhecimento',
      'Como o conhecimento é construído, revisto e reorganizado nas perspectivas construtivistas e socioconstrutivistas.',
      2, true
    ),
    (
      '60592ad9-932f-41cb-afba-1b022b8cdecb'::uuid,
      v_discipline_id,
      'Psicologia histórico-cultural e mediação',
      'Cultura, linguagem, atividade e mediação na constituição humana e nos processos educativos.',
      3, true
    ),
    (
      'b95907ea-b1bf-44f9-8a63-744dc9584248'::uuid,
      v_discipline_id,
      'Interação, afetividade e práticas educativas',
      'Relações professor-aluno, afetividade, interação e condições educativas para a aprendizagem.',
      4, true
    )
  ON CONFLICT (id) DO UPDATE
  SET discipline_id = EXCLUDED.discipline_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      position = EXCLUDED.position,
      published = EXCLUDED.published;
END
$migration$;
