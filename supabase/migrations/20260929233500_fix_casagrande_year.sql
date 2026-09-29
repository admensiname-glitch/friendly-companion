-- Migration: 20260929233500_fix_casagrande_year.sql
-- Corrige publication_date da fonte Casagrande & Faleiros
-- Ano real: 1991 (não 1990)

UPDATE sources
SET publication_date = '1991-01-01'
WHERE id = '00000000-0000-0000-0000-000000000013';
