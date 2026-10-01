-- Cobertura de fontes primárias para os tópicos do currículo canônico de Pedagogia.
-- Os vínculos são referências de estudo; não autorizam copiar ou redistribuir conteúdo.
-- Direitos permanecem conservadores no catálogo.

INSERT INTO public.sources(id,title,source_type,authors,publisher,publication_date,canonical_url,language,status) VALUES
('00000000-0000-0000-0000-000000000054','Resolução CNE/CEB nº 1, de 17 de outubro de 2024 — Diretrizes Operacionais Nacionais de Qualidade e Equidade para a Educação Infantil','official_document','[{"name":"Conselho Nacional de Educação"}]'::jsonb,'Ministério da Educação','2024-10-17','https://www.gov.br/mec/pt-br/cne/resolucoes-ceb-2024','pt','active'),
('00000000-0000-0000-0000-000000000055','Educação Híbrida: Conceito e Orientações Pedagógicas','official_document','[{"name":"Ministério da Educação"}]'::jsonb,'Ministério da Educação','2025-01-01','https://www.gov.br/mec/pt-br/rieh/Manual_MEC_ebookRIEH.pdf','pt','active'),
('00000000-0000-0000-0000-000000000056','Sistema de Avaliação da Educação Básica — Saeb','official_document','[{"name":"Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira"}]'::jsonb,'Inep','2026-01-01','https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/saeb','pt','active'),
('00000000-0000-0000-0000-000000000057','Censo Escolar da Educação Básica','official_document','[{"name":"Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira"}]'::jsonb,'Inep','2026-01-01','https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar','pt','active'),
('00000000-0000-0000-0000-000000000058','Resolução CNE/CES nº 7, de 18 de dezembro de 2018 — Diretrizes para a Extensão na Educação Superior','official_document','[{"name":"Conselho Nacional de Educação"}]'::jsonb,'Ministério da Educação','2018-12-18','https://www.gov.br/mec/pt-br/cne/pdf/normas-classificadas-por-assunto/extensao-na-educacao-superior-brasileira/rces007_18.pdf','pt','active')
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.topic_sources(topic_id,source_id,role,status)
SELECT t.id,x.source_id,x.role,'APPROVED'
FROM public.topics t
JOIN public.disciplines d ON d.id=t.discipline_id
JOIN (VALUES
('Leitura, Escrita e Letramento','00000000-0000-0000-0000-000000000023'::uuid,'BASE'),
('Educação Infantil','00000000-0000-0000-0000-000000000054'::uuid,'BASE'),
('Metodologias da Educação Infantil','00000000-0000-0000-0000-000000000054'::uuid,'BASE'),
('Literatura Infantil','00000000-0000-0000-0000-000000000023'::uuid,'BASE'),
('Ensino de Língua Portuguesa nos Anos Iniciais','00000000-0000-0000-0000-000000000023'::uuid,'BASE'),
('Ensino de Matemática nos Anos Iniciais','00000000-0000-0000-0000-000000000023'::uuid,'BASE'),
('Ensino de Ciências nos Anos Iniciais','00000000-0000-0000-0000-000000000023'::uuid,'BASE'),
('Ensino de História nos Anos Iniciais','00000000-0000-0000-0000-000000000023'::uuid,'BASE'),
('Ensino de Geografia nos Anos Iniciais','00000000-0000-0000-0000-000000000023'::uuid,'BASE'),
('Arte e Educação','00000000-0000-0000-0000-000000000023'::uuid,'BASE'),
('Corpo, Movimento e Educação Física','00000000-0000-0000-0000-000000000023'::uuid,'BASE'),
('Tecnologias Digitais e Educação','00000000-0000-0000-0000-000000000055'::uuid,'BASE'),
('Políticas Públicas Educacionais','00000000-0000-0000-0000-000000000021'::uuid,'BASE'),
('Legislação e Organização da Educação Brasileira','00000000-0000-0000-0000-000000000021'::uuid,'BASE'),
('Gestão Escolar','00000000-0000-0000-0000-000000000021'::uuid,'BASE'),
('Coordenação Pedagógica','00000000-0000-0000-0000-000000000024'::uuid,'BASE'),
('Pedagogia em Espaços Não Escolares','00000000-0000-0000-0000-000000000024'::uuid,'BASE'),
('Educação Profissional e Formação ao Longo da Vida','00000000-0000-0000-0000-000000000024'::uuid,'BASE'),
('Pesquisa em Educação','00000000-0000-0000-0000-000000000053'::uuid,'BASE'),
('Avaliação Educacional e Indicadores','00000000-0000-0000-0000-000000000056'::uuid,'BASE'),
('Estatística Aplicada à Educação','00000000-0000-0000-0000-000000000057'::uuid,'BASE'),
('Estágio Curricular Supervisionado I','00000000-0000-0000-0000-000000000024'::uuid,'BASE'),
('Estágio Curricular Supervisionado II','00000000-0000-0000-0000-000000000024'::uuid,'BASE'),
('Estágio Curricular Supervisionado III','00000000-0000-0000-0000-000000000024'::uuid,'BASE'),
('Estágio Curricular Supervisionado IV','00000000-0000-0000-0000-000000000024'::uuid,'BASE'),
('Estágio Curricular Supervisionado V','00000000-0000-0000-0000-000000000024'::uuid,'BASE'),
('Estágio Curricular Supervisionado VI','00000000-0000-0000-0000-000000000024'::uuid,'BASE'),
('Extensão Universitária em Educação','00000000-0000-0000-0000-000000000058'::uuid,'BASE'),
('Trabalho de Conclusão de Curso','00000000-0000-0000-0000-000000000053'::uuid,'BASE'),
('Seminário Integrador e Práticas Pedagógicas','00000000-0000-0000-0000-000000000024'::uuid,'BASE')
) x(discipline_name,source_id,role) ON x.discipline_name=d.name
ON CONFLICT DO NOTHING;