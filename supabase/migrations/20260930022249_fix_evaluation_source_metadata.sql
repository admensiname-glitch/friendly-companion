
update public.sources
set
  title='Professores e lacunas formativas em avaliação da aprendizagem: evidências e problematizações',
  authors='[{"name":"Valéria Aparecida de Souza Siqueira"},{"name":"Pâmela Félix Freitas"},{"name":"Ocimar Munhoz Alavarse"}]'::jsonb,
  publication_date='2021-01-01',
  canonical_url='https://www.scielo.br/j/ep/a/XyFBQj6K5qhVJWsRBMPRvRF/',
  publisher='Educação e Pesquisa',
  language='pt-BR',
  status='active'
where doi='10.1590/S1678-4634202147241339';

update public.source_rights
set
  rights_class='METADATA_ONLY',
  access_model='OPEN',
  evidence_note='Fonte pública usada como referência bibliográfica e para síntese original; o Ensina-me não armazena texto integral.',
  evidence_url='https://www.scielo.br/j/ep/a/XyFBQj6K5qhVJWsRBMPRvRF/',
  verified_at=now()
where source_id=(select id from public.sources where doi='10.1590/S1678-4634202147241339');
