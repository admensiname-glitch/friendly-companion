-- Corrige a classificação de direitos dos vídeos.
-- Publicação no YouTube e possibilidade de embed não equivalem a licença Creative Commons.
-- Apenas o vídeo da USP/FE-USP foi mantido como CC BY 4.0 com evidência externa verificável.

update public.source_rights
set
  rights_class = 'UNKNOWN',
  access_model = 'OPEN',
  license_id = null,
  evidence_note = 'Vídeo hospedado publicamente no YouTube. A licença específica do vídeo não foi confirmada como Creative Commons. O Ensina-me usa apenas o player incorporado e mantém link para a página original; não copia, baixa ou redistribui o vídeo.',
  verified_at = now()
where source_id in (
 'b4000000-0000-4000-8000-000000000001',
 'b4000000-0000-4000-8000-000000000002',
 'b4000000-0000-4000-8000-000000000003',
 'b4000000-0000-4000-8000-000000000004',
 'b4000000-0000-4000-8000-000000000005',
 'b4000000-0000-4000-8000-000000000006',
 'b4000000-0000-4000-8000-000000000007',
 'b4000000-0000-4000-8000-000000000008',
 'b4000000-0000-4000-8000-000000000009',
 'b4000000-0000-4000-8000-000000000010',
 'b4000000-0000-4000-8000-000000000012',
 'b4000000-0000-4000-8000-000000000013',
 'b4000000-0000-4000-8000-000000000014',
 'b4000000-0000-4000-8000-000000000015',
 'b4000000-0000-4000-8000-000000000016',
 'b4000000-0000-4000-8000-000000000017'
);

update public.source_rights
set
  rights_class = 'OPEN',
  access_model = 'OPEN',
  license_id = '00000000-0000-0000-0000-000000000001',
  evidence_url = 'https://observatoriodeeducacao.institutounibanco.org.br/cedoc/detalhe/topicos-de-epistemologia-e-didatica-curriculo-planejamento-do-ensino-aula-8-parte-1%2C88269a8e-d636-4afc-9e6c-bfebecdd472f',
  evidence_note = 'O Observatório de Educação do Instituto Unibanco identifica este vídeo da Faculdade de Educação da USP como CCBY - Atribuição. A base do Ensina-me registra CC BY 4.0 como licença documentada e mantém atribuição/fonte original.',
  verified_at = now()
where source_id = 'b4000000-0000-4000-8000-000000000011';
