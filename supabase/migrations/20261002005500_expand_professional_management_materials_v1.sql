-- Expansão editorial do núcleo profissional e de gestão de Pedagogia.
-- Conteúdo específico foi inserido na primeira seção dos tópicos correspondentes;
-- demais seções permanecem no scaffold de draft até revisão editorial.
-- Referência geral: LDB, BNCC e Resolução CNE/CP nº 4/2024.

UPDATE public.disciplines
SET curriculum_status='in_progress'
WHERE course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
AND name IN (
'Tecnologias Digitais e Educação','Políticas Públicas Educacionais',
'Legislação e Organização da Educação Brasileira','Gestão Escolar',
'Coordenação Pedagógica','Pedagogia em Espaços Não Escolares',
'Educação Profissional e Formação ao Longo da Vida',
'Estágio Curricular Supervisionado I','Estágio Curricular Supervisionado II',
'Estágio Curricular Supervisionado III','Estágio Curricular Supervisionado IV',
'Estágio Curricular Supervisionado V','Estágio Curricular Supervisionado VI',
'Extensão Universitária em Educação','Trabalho de Conclusão de Curso',
'Seminário Integrador e Práticas Pedagógicas'
);