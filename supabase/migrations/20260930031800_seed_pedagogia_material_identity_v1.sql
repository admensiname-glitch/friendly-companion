-- Establish the stable material UUIDs referenced by historical content migrations.
-- Do not seed sections, exercises, or curriculum_status here; those dependencies are introduced later.
INSERT INTO public.materials(id, topic_id, title, introduction, status)
SELECT
  CASE lower(t.name)
    WHEN 'desenvolvimento e aprendizagem' THEN '00000000-0000-4000-8000-000000010002'::uuid
    WHEN 'construtivismo e construção do conhecimento' THEN '00000000-0000-4000-8000-000000010078'::uuid
    WHEN 'psicologia histórico-cultural e mediação' THEN '00000000-0000-4000-8000-000000010154'::uuid
    WHEN 'interação, afetividade e práticas educativas' THEN '00000000-0000-4000-8000-000000010230'::uuid
    WHEN 'sistema de escrita alfabética' THEN '0aca8546-f2ad-46ad-a8c7-21707cc46a59'::uuid
    WHEN 'leitura, escrita e práticas sociais' THEN '10c77160-d405-4484-a63c-e29ab1342f87'::uuid
    WHEN 'objetivos, conteúdos e métodos de ensino' THEN '43562e58-bff1-4eb3-9dd3-b7ab291362c0'::uuid
    WHEN 'alfabetização e letramento' THEN '7a1ee5b1-49e4-4722-9241-a9cd33464be0'::uuid
    WHEN 'consciência fonológica e relações grafofonêmicas' THEN 'bc46afac-e6d6-49d2-8387-13c40d3d0f0b'::uuid
    WHEN 'didática e os processos de ensinar e aprender' THEN 'ff7dafa5-7776-4b66-a65f-db6c4f583472'::uuid
    WHEN 'avaliação da aprendizagem' THEN 'd0aee9ac-e285-477e-aaec-e0a0e6964b18'::uuid
    ELSE gen_random_uuid()
  END,
  t.id,
  t.name,
  'Material em preparação do Ensina-me. A estrutura será preenchida e validada a partir de fontes acadêmicas e documentos oficiais antes da publicação.',
  'draft'
FROM public.topics t
JOIN public.disciplines d ON d.id = t.discipline_id
WHERE d.course_id = (SELECT id FROM public.courses WHERE slug = 'pedagogia' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.materials m WHERE m.topic_id = t.id
  );
