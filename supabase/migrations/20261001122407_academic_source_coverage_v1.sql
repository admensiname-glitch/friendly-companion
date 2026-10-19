begin;

insert into public.sources
  (title, source_type, authors, publisher, publication_date, doi, canonical_url, language, status)
select
  'Contribuições da consciência fonológica e nomeação seriada rápida para a aprendizagem inicial da escrita',
  'article',
  '[{"name":"Angélica Galindo Carneiro Rosal"},{"name":"Ana Augusta de Andrade Cordeiro"},{"name":"Ana Carolina Francisca da Silva"},{"name":"Ronildo Lima Silva"},{"name":"Bianca Arruda Manchester de Queiroga"}]'::jsonb,
  'Revista CEFAC',
  '2016-01-01',
  '10.1590/1982-0216201618110315',
  'https://www.scielo.br/j/rcefac/a/s4ppdZRdyVTqMrWnJR9y5ds/',
  'pt',
  'active'
where not exists (
  select 1 from public.sources where doi = '10.1590/1982-0216201618110315'
);

insert into public.sources
  (title, source_type, authors, publisher, publication_date, doi, canonical_url, language, status)
select
  'Relação entre os níveis de escrita, consciência fonológica e conhecimento de letras',
  'article',
  '[{"name":"Mirna Rossi Barbosa"},{"name":"Lidiane Batista de Oliveira Medeiros"},{"name":"Ana Paula Simões do Vale"}]'::jsonb,
  'Estudos de Psicologia (Campinas)',
  '2016-10-01',
  '10.1590/1982-02752016000400010',
  'https://www.scielo.br/j/estpsi/a/dkDHRQB4HTV74sLJryFPNhf/',
  'pt',
  'active'
where not exists (
  select 1 from public.sources where doi = '10.1590/1982-02752016000400010'
);

insert into public.sources
  (title, source_type, authors, publisher, publication_date, doi, canonical_url, language, status)
select
  'Novas práticas de leitura e escrita: letramento na cibercultura',
  'article',
  '[{"name":"Magda Soares"}]'::jsonb,
  'Educação & Sociedade',
  '2002-12-01',
  '10.1590/S0101-73302002008100008',
  'https://www.scielo.br/j/es/a/zG4cBvLkSZfcZnXfZGLzsXb/',
  'pt',
  'active'
where not exists (
  select 1 from public.sources where doi = '10.1590/S0101-73302002008100008'
);

insert into public.source_rights
  (source_id, rights_class, access_model, evidence_url, evidence_note)
select
  s.id,
  'METADATA_ONLY',
  'OPEN',
  s.canonical_url,
  'Página de acesso aberto registrada como referência. A licença específica não foi presumida; manter uso limitado a metadados e link até validação jurídica da licença.'
from public.sources s
where s.doi in (
  '10.1590/1982-0216201618110315',
  '10.1590/1982-02752016000400010',
  '10.1590/S0101-73302002008100008'
)
and not exists (
  select 1
  from public.source_rights sr
  where sr.source_id = s.id
    and sr.superseded_at is null
);

insert into public.topic_sources (topic_id, source_id, role, status)
select t.id, s.id, v.role, 'APPROVED'
from (
  values
    ('Alfabetização e letramento','https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf','BASE'),
    ('Alfabetização e letramento','https://ceale.fae.ufmg.br/glossarioceale/verbetes/alfabetizacao','BASE'),
    ('Alfabetização e letramento','https://ceale.fae.ufmg.br/glossarioceale/verbetes/letramento','COMPLEMENTAR'),
    ('Alfabetização e letramento','https://revistas.usp.br/ep/pt_BR/article/view/238390','COMPLEMENTAR'),
    ('Sistema de escrita alfabética','https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf','BASE'),
    ('Sistema de escrita alfabética','https://www.scielo.br/j/estpsi/a/dkDHRQB4HTV74sLJryFPNhf/','BASE'),
    ('Sistema de escrita alfabética','https://www.scielo.br/j/rcefac/a/s4ppdZRdyVTqMrWnJR9y5ds/','COMPLEMENTAR'),
    ('Consciência fonológica e relações grafofonêmicas','https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf','BASE'),
    ('Consciência fonológica e relações grafofonêmicas','https://www.scielo.br/j/rcefac/a/s4ppdZRdyVTqMrWnJR9y5ds/','BASE'),
    ('Consciência fonológica e relações grafofonêmicas','https://www.scielo.br/j/estpsi/a/dkDHRQB4HTV74sLJryFPNhf/','COMPLEMENTAR'),
    ('Leitura, escrita e práticas sociais','https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf','BASE'),
    ('Leitura, escrita e práticas sociais','https://ceale.fae.ufmg.br/glossarioceale/verbetes/letramento','BASE'),
    ('Leitura, escrita e práticas sociais','https://www.scielo.br/j/es/a/zG4cBvLkSZfcZnXfZGLzsXb/','COMPLEMENTAR'),
    ('Leitura, escrita e práticas sociais','https://revistas.usp.br/ep/pt_BR/article/view/238390','COMPLEMENTAR')
) as v(topic_name, canonical_url, role)
join public.topics t on t.name=v.topic_name and t.published=true
join public.sources s on s.canonical_url=v.canonical_url
where not exists (
  select 1 from public.topic_sources ts where ts.topic_id=t.id and ts.source_id=s.id
);

insert into public.material_citations (material_id, source_id, citation_label)
select m.id, s.id, 'Base acadêmica do tópico'
from public.materials m
join public.topics t on t.id=m.topic_id and t.published=true
join public.sources s on s.canonical_url = any (
  case t.name
    when 'Alfabetização e letramento' then array[
      'https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf',
      'https://ceale.fae.ufmg.br/glossarioceale/verbetes/alfabetizacao',
      'https://ceale.fae.ufmg.br/glossarioceale/verbetes/letramento',
      'https://revistas.usp.br/ep/pt_BR/article/view/238390'
    ]
    when 'Sistema de escrita alfabética' then array[
      'https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf',
      'https://www.scielo.br/j/estpsi/a/dkDHRQB4HTV74sLJryFPNhf/',
      'https://www.scielo.br/j/rcefac/a/s4ppdZRdyVTqMrWnJR9y5ds/'
    ]
    when 'Consciência fonológica e relações grafofonêmicas' then array[
      'https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf',
      'https://www.scielo.br/j/rcefac/a/s4ppdZRdyVTqMrWnJR9y5ds/',
      'https://www.scielo.br/j/estpsi/a/dkDHRQB4HTV74sLJryFPNhf/'
    ]
    when 'Leitura, escrita e práticas sociais' then array[
      'https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf',
      'https://ceale.fae.ufmg.br/glossarioceale/verbetes/letramento',
      'https://www.scielo.br/j/es/a/zG4cBvLkSZfcZnXfZGLzsXb/',
      'https://revistas.usp.br/ep/pt_BR/article/view/238390'
    ]
    else array[]::text[]
  end
)
where m.status='published'
and not exists (
  select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=s.id
);

commit;