-- Correção definitiva dos anos de publication_date das fontes do material
-- 'Planejamento do ensino: fundamentos e elementos'

-- Fonte: Costa & Souza (2024)
UPDATE sources
SET publication_date = '2024-01-01'
WHERE doi = '10.23925/2318-7115.2024v45i1e64401';

-- Fonte: Casagrande & Faleiros (1991)
UPDATE sources
SET publication_date = '1991-01-01'
WHERE doi = '10.1590/S0103-863X1991000100006';
