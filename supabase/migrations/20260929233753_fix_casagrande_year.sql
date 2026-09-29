-- Corrige publication_date da fonte Casagrande & Faleiros
-- ID: 00000000-0000-0000-0000-000000000013
-- Ano correto: 1991

UPDATE sources
SET publication_date = '1991-01-01'
WHERE id = '00000000-0000-0000-0000-000000000013';
