-- Seed de vídeos complementares para os 12 tópicos originais.
-- Apenas metadados + embed do player; o conteúdo audiovisual permanece hospedado na fonte original.

begin;

insert into public.sources (
  id, title, source_type, authors, publisher, publication_date,
  canonical_url, language, status
) values
('b4000000-0000-4000-8000-000000000006','CEALE DEBATE: Alfabetização e letramento na sala de aula - Magda Soares','VIDEO','[{"name":"Magda Soares"}]'::jsonb,'Ceale - FaE/UFMG','2020-09-08','https://www.youtube.com/watch?v=devkCGKPfO8','pt','active'),
('b4000000-0000-4000-8000-000000000007','O procedimento das casinhas','VIDEO','[{"name":"Alfaletrar Cenpec"}]'::jsonb,'Alfaletrar Cenpec',null,'https://www.youtube.com/watch?v=YYmXG6Hcpa8','pt','active'),
('b4000000-0000-4000-8000-000000000008','CONSCIÊNCIA FONOLÓGICA: A BASE DA ALFABETIZAÇÃO','VIDEO','[{"name":"Carla Silva"}]'::jsonb,'Carla Silva Psychopedagogue','2021-09-09','https://www.youtube.com/watch?v=rkYzj5ZIEG4','pt','active'),
('b4000000-0000-4000-8000-000000000009','MODOS DE LER: IMPLICAÇÕES PARA COM A FORMAÇÃO DE LEITORES NO CONTEXTO ESCOLAR','VIDEO','[{"name":"Diego Durães Ferreira"},{"name":"Emanuela Carla Medeiros de Queiros"},{"name":"Leonardo Montes Lopes"}]'::jsonb,'Universidade Estadual de Londrina','2024-09-18','https://www.youtube.com/watch?v=eYemdXtMiwE','pt','active'),
('b4000000-0000-4000-8000-000000000010','Didática – Processos Didáticos de Ensino e Aprendizagem','VIDEO','[{"name":"Processos Didáticos de Ensino e Aprendizagem"}]'::jsonb,null,null,'https://www.youtube.com/watch?v=nMcYA-VoaGA','pt','active'),
('b4000000-0000-4000-8000-000000000011','Tópicos de Epistemologia e Didática - Currículo: Planejamento do Ensino - Aula 8 - Parte 1','VIDEO','[{"name":"Nilson José Machado"}]'::jsonb,'Faculdade de Educação da USP','2012-01-01','https://www.youtube.com/watch?v=spePDvTbSks','pt','active'),
('b4000000-0000-4000-8000-000000000012','Desafios futuros','VIDEO','[{"name":"José Carlos Libâneo"}]'::jsonb,null,null,'https://www.youtube.com/watch?v=bERxLjM7G0I','pt','active'),
('b4000000-0000-4000-8000-000000000013','Avaliação da aprendizagem - Cipriano Luckesi','VIDEO','[{"name":"Cipriano Luckesi"}]'::jsonb,null,null,'https://www.youtube.com/watch?v=JqSRs9Hqgtc','pt','active'),
('b4000000-0000-4000-8000-000000000014','Fases do Desenvolvimento','VIDEO','[{"name":"Fundamentos da Psicologia do Desenvolvimento e da Aprendizagem"}]'::jsonb,null,null,'https://www.youtube.com/watch?v=EnRlAQDN2go','pt','active'),
('b4000000-0000-4000-8000-000000000015','Piaget (3): construtivismo na escola','VIDEO','[{"name":"Grandes Educadores"}]'::jsonb,null,null,'https://www.youtube.com/watch?v=z-FfrQLVyN8','pt','active'),
('b4000000-0000-4000-8000-000000000016','Vygotsky - Psicologia Histórico Cultural','VIDEO','[{"name":"Fundamentos da Educação II"}]'::jsonb,null,null,'https://www.youtube.com/watch?v=-yTgiZ9rSa4','pt','active'),
('b4000000-0000-4000-8000-000000000017','Vygotsky e linguagem','VIDEO','[{"name":"Fundamentos da Psicologia do Desenvolvimento e da Aprendizagem"}]'::jsonb,null,null,'https://www.youtube.com/watch?v=_BZtQf5NcvE','pt','active')
on conflict (id) do update set
  title=excluded.title, authors=excluded.authors, publisher=excluded.publisher,
  publication_date=excluded.publication_date, canonical_url=excluded.canonical_url,
  language=excluded.language, status=excluded.status;

insert into public.source_rights (
 id,source_id,license_id,rights_class,access_model,evidence_url,evidence_note,verified_at
)
select gen_random_uuid(),s.id,null,'METADATA_ONLY','OPEN',s.canonical_url,
'Vídeo publicamente acessível. O Ensina-me armazena somente metadados e incorpora o player; não copia o conteúdo do vídeo.',
now()
from public.sources s
where s.id between 'b4000000-0000-4000-8000-000000000006' and 'b4000000-0000-4000-8000-000000000017'
and not exists (select 1 from public.source_rights sr where sr.source_id=s.id);

insert into public.topic_videos (
 id,topic_id,source_id,title,description,video_url,embed_url,platform,channel_name,
 duration_label,position,published
) values
('d4000000-0000-4000-8000-000000000006','eaf2ef11-9ed1-4253-a8ce-0c1c7a5755b7','b4000000-0000-4000-8000-000000000006','Alfabetização e letramento na sala de aula','Discussão de Magda Soares sobre alfabetização, letramento e práticas de ensino.','https://www.youtube.com/watch?v=devkCGKPfO8','https://www.youtube-nocookie.com/embed/devkCGKPfO8','youtube','Ceale - FaE/UFMG',null,1,true),
('d4000000-0000-4000-8000-000000000007','2faefa1c-5ece-4741-839e-6c5e0d936db7','b4000000-0000-4000-8000-000000000007','O procedimento das casinhas','Demonstração de uma prática do Projeto Alfaletrar para trabalhar relações entre fonemas, sílabas e letras.','https://www.youtube.com/watch?v=YYmXG6Hcpa8','https://www.youtube-nocookie.com/embed/YYmXG6Hcpa8','youtube','Alfaletrar Cenpec',null,1,true),
('d4000000-0000-4000-8000-000000000008','f7446705-aa47-4426-9832-35a72753f161','b4000000-0000-4000-8000-000000000008','Consciência fonológica: a base da alfabetização','Vídeo introdutório sobre consciência fonológica e sua relação com a alfabetização.','https://www.youtube.com/watch?v=rkYzj5ZIEG4','https://www.youtube-nocookie.com/embed/rkYzj5ZIEG4','youtube','Carla Silva Psychopedagogue',null,1,true),
('d4000000-0000-4000-8000-000000000009','b8e922a1-c4a4-48fc-9691-e4361cc9118a','b4000000-0000-4000-8000-000000000009','Modos de ler: implicações para a formação de leitores no contexto escolar','Palestra sobre modos de ler, formação de leitores e práticas de leitura no contexto escolar.','https://www.youtube.com/watch?v=eYemdXtMiwE','https://www.youtube-nocookie.com/embed/eYemdXtMiwE','youtube','Universidade Estadual de Londrina',null,1,true),
('d4000000-0000-4000-8000-000000000010','e005f7ca-42ce-4dc7-b404-088b64af7272','b4000000-0000-4000-8000-000000000010','Processos didáticos de ensino e aprendizagem','Material audiovisual complementar sobre os processos didáticos e a relação entre professor, aluno e aprendizagem.','https://www.youtube.com/watch?v=nMcYA-VoaGA','https://www.youtube-nocookie.com/embed/nMcYA-VoaGA','youtube','Processos Didáticos de Ensino e Aprendizagem',null,1,true),
('d4000000-0000-4000-8000-000000000011','d88141bb-0724-4f63-b9d5-466c34dde2cf','b4000000-0000-4000-8000-000000000011','Currículo e planejamento do ensino - Aula 8','Aula da Faculdade de Educação da USP sobre planejamento do ensino e competência docente.','https://www.youtube.com/watch?v=spePDvTbSks','https://www.youtube-nocookie.com/embed/spePDvTbSks','youtube','Faculdade de Educação da USP',null,1,true),
('d4000000-0000-4000-8000-000000000012','aab5c0f7-fb5c-41f1-a0ae-96a0ae4f99c3','b4000000-0000-4000-8000-000000000012','Desafios futuros — José Carlos Libâneo','Entrevista com Libâneo para complementar a compreensão da didática, do ensino e do papel docente.','https://www.youtube.com/watch?v=bERxLjM7G0I','https://www.youtube-nocookie.com/embed/bERxLjM7G0I','youtube','José Carlos Libâneo',null,1,true),
('d4000000-0000-4000-8000-000000000013','33c08f0b-9c61-42d2-9bd1-9cbb343dcca0','b4000000-0000-4000-8000-000000000013','Avaliação da aprendizagem - Cipriano Luckesi','Discussão introdutória sobre avaliação da aprendizagem e seus sentidos no trabalho pedagógico.','https://www.youtube.com/watch?v=JqSRs9Hqgtc','https://www.youtube-nocookie.com/embed/JqSRs9Hqgtc','youtube','Cipriano Luckesi',null,1,true),
('d4000000-0000-4000-8000-000000000014','7b5e6723-9d87-46dd-9e2e-4e00d1ec05eb','b4000000-0000-4000-8000-000000000014','Fases do desenvolvimento','Vídeo complementar para contextualizar o desenvolvimento humano no estudo da relação entre desenvolvimento e aprendizagem.','https://www.youtube.com/watch?v=EnRlAQDN2go','https://www.youtube-nocookie.com/embed/EnRlAQDN2go','youtube','Fundamentos da Psicologia do Desenvolvimento e da Aprendizagem',null,1,true),
('d4000000-0000-4000-8000-000000000015','7b8f766f-dc23-44ce-8b44-7fc5c0135ddd','b4000000-0000-4000-8000-000000000015','Piaget: construtivismo na escola','Vídeo complementar sobre a construção do conhecimento na perspectiva construtivista de Piaget.','https://www.youtube.com/watch?v=z-FfrQLVyN8','https://www.youtube-nocookie.com/embed/z-FfrQLVyN8','youtube','Grandes Educadores',null,1,true),
('d4000000-0000-4000-8000-000000000016','60592ad9-932f-41cb-afba-1b022b8cdecb','b4000000-0000-4000-8000-000000000016','Vygotsky - Psicologia Histórico Cultural','Vídeo complementar sobre os fundamentos histórico-culturais da aprendizagem e do desenvolvimento.','https://www.youtube.com/watch?v=-yTgiZ9rSa4','https://www.youtube-nocookie.com/embed/-yTgiZ9rSa4','youtube','Fundamentos da Educação II',null,1,true),
('d4000000-0000-4000-8000-000000000017','b95907ea-b1bf-44f9-8a63-744dc9584248','b4000000-0000-4000-8000-000000000017','Vygotsky e linguagem','Vídeo complementar para discutir linguagem, interação e desenvolvimento na perspectiva histórico-cultural.','https://www.youtube.com/watch?v=_BZtQf5NcvE','https://www.youtube-nocookie.com/embed/_BZtQf5NcvE','youtube','Fundamentos da Psicologia do Desenvolvimento e da Aprendizagem',null,1,true)
on conflict (topic_id,video_url) do update set
 source_id=excluded.source_id, title=excluded.title, description=excluded.description,
 embed_url=excluded.embed_url, platform=excluded.platform, channel_name=excluded.channel_name,
 position=excluded.position, published=excluded.published, updated_at=now();

commit;
