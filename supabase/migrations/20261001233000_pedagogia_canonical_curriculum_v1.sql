-- ============================================================
-- Pedagogia: mapa curricular canônico do Ensina-me
-- Referência acadêmica ampla, independente de uma IES específica.
-- Os semestres abaixo são uma ordem de referência do produto,
-- não uma grade oficial nacional.
-- ============================================================

ALTER TABLE public.disciplines
  ADD COLUMN IF NOT EXISTS curriculum_order integer,
  ADD COLUMN IF NOT EXISTS reference_semester smallint,
  ADD COLUMN IF NOT EXISTS curriculum_area text,
  ADD COLUMN IF NOT EXISTS component_kind text NOT NULL DEFAULT 'discipline',
  ADD COLUMN IF NOT EXISTS curriculum_status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS is_core boolean NOT NULL DEFAULT true;

ALTER TABLE public.disciplines
  DROP CONSTRAINT IF EXISTS disciplines_component_kind_check,
  DROP CONSTRAINT IF EXISTS disciplines_curriculum_status_check;

ALTER TABLE public.disciplines
  ADD CONSTRAINT disciplines_component_kind_check
    CHECK (component_kind IN ('discipline','practice','internship','research','extension','capstone')),
  ADD CONSTRAINT disciplines_curriculum_status_check
    CHECK (curriculum_status IN ('planned','in_progress','ready'));

CREATE UNIQUE INDEX IF NOT EXISTS disciplines_course_name_unique_idx
  ON public.disciplines(course_id, lower(name));

COMMENT ON COLUMN public.disciplines.reference_semester IS
  'Semestre de referência do percurso canônico do Ensina-me; não representa a grade de uma IES específica.';
COMMENT ON COLUMN public.disciplines.curriculum_area IS
  'Área acadêmica ampla usada para organizar a cobertura canônica de Pedagogia.';
COMMENT ON COLUMN public.disciplines.component_kind IS
  'Natureza do componente: disciplina, prática, estágio, pesquisa, extensão ou trabalho de conclusão.';
COMMENT ON COLUMN public.disciplines.curriculum_status IS
  'Estado da cobertura de conteúdo no Ensina-me: planned, in_progress ou ready.';
COMMENT ON COLUMN public.disciplines.is_core IS
  'Indica componente tratado como núcleo recorrente da base canônica do curso.';

WITH curriculum(name, code, description, reference_semester, curriculum_area, component_kind, curriculum_status, is_core, curriculum_order) AS (
  VALUES
  ('Fundamentos da Educação','PED-01','Bases conceituais, históricas e sociais que sustentam o pensamento pedagógico.',1,'Fundamentos','discipline','planned',true,1),
  ('História da Educação','PED-02','Formação histórica das ideias, instituições, práticas e sistemas educacionais.',1,'Fundamentos','discipline','planned',true,2),
  ('Filosofia da Educação','PED-03','Problemas filosóficos, ética, conhecimento e finalidades da educação.',1,'Fundamentos','discipline','planned',true,3),
  ('Sociologia da Educação','PED-04','Relações entre educação, sociedade, cultura, desigualdades e instituições.',1,'Fundamentos','discipline','planned',true,4),
  ('Antropologia e Educação','PED-05','Cultura, diversidade, identidade e relações sociais em contextos educativos.',1,'Fundamentos','discipline','planned',true,5),
  ('Psicologia da Educação','PED-06','Desenvolvimento, aprendizagem, mediação, motivação e processos psicológicos na educação.',1,'Fundamentos','discipline','ready',true,6),
  ('Metodologia Científica','PED-07','Leitura acadêmica, produção científica, pesquisa, referências e escrita universitária.',1,'Pesquisa','discipline','planned',true,7),
  ('Didática','PED-08','Processos de ensino e aprendizagem, planejamento, mediação e avaliação.',2,'Formação docente','discipline','ready',true,8),
  ('Currículo e Organização do Trabalho Pedagógico','PED-09','Concepções de currículo, organização pedagógica, seleção de conhecimentos e práticas escolares.',2,'Formação docente','discipline','planned',true,9),
  ('Planejamento Educacional','PED-10','Planejamento da ação educativa em diferentes níveis, contextos e escalas.',2,'Formação docente','discipline','planned',true,10),
  ('Avaliação da Aprendizagem','PED-11','Concepções, instrumentos, critérios, feedback e uso pedagógico da avaliação.',2,'Formação docente','discipline','planned',true,11),
  ('Formação e Profissionalização Docente','PED-12','Identidade profissional, saberes docentes, trabalho e desenvolvimento profissional.',2,'Formação docente','discipline','planned',true,12),
  ('Alfabetização I','PED-13','Alfabetização, letramento, sistema de escrita, consciência fonológica e psicogênese.',2,'Alfabetização','discipline','ready',true,13),
  ('Alfabetização II','PED-14','Aprofundamento das práticas de alfabetização, acompanhamento e intervenção pedagógica.',3,'Alfabetização','discipline','planned',true,14),
  ('Leitura, Escrita e Letramento','PED-15','Práticas sociais de leitura e escrita, gêneros, compreensão e produção textual.',3,'Alfabetização','discipline','planned',true,15),
  ('Educação Infantil','PED-16','Concepções de infância, desenvolvimento, cuidado, educação, brincadeira e currículo.',3,'Educação Infantil','discipline','planned',true,16),
  ('Metodologias da Educação Infantil','PED-17','Organização de experiências, espaços, tempos, interações e documentação pedagógica.',3,'Educação Infantil','discipline','planned',true,17),
  ('Literatura Infantil','PED-18','Formação do leitor, literatura para crianças, mediação e experiências estéticas.',3,'Educação Infantil','discipline','planned',true,18),
  ('Ensino de Língua Portuguesa nos Anos Iniciais','PED-19','Conhecimentos linguísticos e práticas de linguagem no ensino dos anos iniciais.',4,'Anos iniciais','discipline','planned',true,19),
  ('Ensino de Matemática nos Anos Iniciais','PED-20','Números, álgebra, geometria, grandezas, estatística e resolução de problemas na infância.',4,'Anos iniciais','discipline','planned',true,20),
  ('Ensino de Ciências nos Anos Iniciais','PED-21','Investigação, alfabetização científica e conceitos fundamentais das ciências na escola.',4,'Anos iniciais','discipline','planned',true,21),
  ('Ensino de História nos Anos Iniciais','PED-22','Tempo, memória, identidades, fontes históricas e pensamento histórico escolar.',4,'Anos iniciais','discipline','planned',true,22),
  ('Ensino de Geografia nos Anos Iniciais','PED-23','Espaço, território, lugar, paisagem e leitura do mundo nos anos iniciais.',4,'Anos iniciais','discipline','planned',true,23),
  ('Arte e Educação','PED-24','Artes visuais, música, dança e teatro como campos de criação, expressão e aprendizagem.',4,'Anos iniciais','discipline','planned',true,24),
  ('Corpo, Movimento e Educação Física','PED-25','Corpo, movimento, jogos, brincadeiras e práticas corporais na educação básica.',4,'Anos iniciais','discipline','planned',true,25),
  ('Educação Inclusiva','PED-26','Princípios, práticas e políticas para garantir participação e aprendizagem de todos.',5,'Inclusão e diversidade','discipline','planned',true,26),
  ('Educação Especial','PED-27','Atendimento educacional especializado, público da educação especial e práticas pedagógicas inclusivas.',5,'Inclusão e diversidade','discipline','planned',true,27),
  ('Libras e Educação de Surdos','PED-28','Libras, cultura surda, educação bilíngue e acessibilidade comunicacional.',5,'Inclusão e diversidade','discipline','planned',true,28),
  ('Educação das Relações Étnico-Raciais','PED-29','História e cultura afro-brasileira e africana, relações raciais e educação antirracista.',5,'Inclusão e diversidade','discipline','planned',true,29),
  ('Educação, Diversidade e Direitos Humanos','PED-30','Direitos humanos, diferenças, equidade, convivência democrática e práticas educativas.',5,'Inclusão e diversidade','discipline','planned',true,30),
  ('Educação Ambiental','PED-31','Educação ambiental, sustentabilidade, território e formação para responsabilidade socioambiental.',5,'Inclusão e diversidade','discipline','planned',true,31),
  ('Educação, Infâncias e Direitos','PED-32','Direitos da criança, proteção integral, participação e práticas educativas com crianças.',5,'Infâncias','discipline','planned',true,32),
  ('Educação de Jovens e Adultos','PED-33','Concepções, sujeitos, políticas e práticas pedagógicas na EJA.',5,'Modalidades','discipline','planned',true,33),
  ('Educação do Campo','PED-34','Educação em territórios rurais, contextualização curricular e especificidades dos sujeitos do campo.',5,'Modalidades','discipline','planned',true,34),
  ('Educação Indígena e Intercultural','PED-35','Educação escolar indígena, interculturalidade, línguas, territórios e conhecimentos tradicionais.',5,'Modalidades','discipline','planned',true,35),
  ('Educação Quilombola e Contextos Comunitários','PED-36','Educação quilombola, território, identidade, memória e práticas comunitárias.',5,'Modalidades','discipline','planned',true,36),
  ('Tecnologias Digitais e Educação','PED-37','Tecnologias digitais, cultura digital, recursos pedagógicos e aprendizagem mediada por tecnologia.',5,'Tecnologia educacional','discipline','planned',true,37),
  ('Políticas Públicas Educacionais','PED-38','Políticas, programas, financiamento, participação social e implementação educacional.',6,'Gestão e políticas','discipline','planned',true,38),
  ('Legislação e Organização da Educação Brasileira','PED-39','LDB, sistemas de ensino, organização da educação básica e marcos regulatórios essenciais.',6,'Gestão e políticas','discipline','planned',true,39),
  ('Gestão Escolar','PED-40','Gestão democrática, planejamento institucional, participação e organização escolar.',6,'Gestão e políticas','discipline','planned',true,40),
  ('Coordenação Pedagógica','PED-41','Acompanhamento pedagógico, formação continuada, currículo e trabalho coletivo.',6,'Gestão e políticas','discipline','planned',true,41),
  ('Pedagogia em Espaços Não Escolares','PED-42','Atuação pedagógica em organizações, projetos sociais, empresas, saúde, cultura e outros contextos.',6,'Atuação profissional','discipline','planned',true,42),
  ('Educação Profissional e Formação ao Longo da Vida','PED-43','Educação profissional, aprendizagem ao longo da vida e relações entre educação e trabalho.',6,'Atuação profissional','discipline','planned',true,43),
  ('Pesquisa em Educação','PED-44','Problemas de pesquisa, métodos, ética, análise e produção de conhecimento educacional.',7,'Pesquisa','research','planned',true,44),
  ('Avaliação Educacional e Indicadores','PED-45','Avaliações externas, indicadores, interpretação de dados e uso responsável de evidências.',7,'Pesquisa','discipline','planned',true,45),
  ('Estatística Aplicada à Educação','PED-46','Fundamentos quantitativos para leitura, análise e comunicação de dados educacionais.',7,'Pesquisa','discipline','planned',true,46),
  ('Estágio Curricular Supervisionado I','PED-47','Observação, inserção e reflexão orientada sobre espaços e práticas da educação básica.',7,'Prática profissional','internship','planned',true,47),
  ('Estágio Curricular Supervisionado II','PED-48','Aprofundamento da observação, planejamento e participação em práticas educativas.',7,'Prática profissional','internship','planned',true,48),
  ('Estágio Curricular Supervisionado III','PED-49','Planejamento e atuação pedagógica supervisionada em contexto educacional.',7,'Prática profissional','internship','planned',true,49),
  ('Estágio Curricular Supervisionado IV','PED-50','Atuação supervisionada, análise da prática e integração entre teoria e experiência.',8,'Prática profissional','internship','planned',true,50),
  ('Estágio Curricular Supervisionado V','PED-51','Ampliação da experiência profissional e reflexão crítica sobre a prática pedagógica.',8,'Prática profissional','internship','planned',true,51),
  ('Estágio Curricular Supervisionado VI','PED-52','Síntese da experiência de estágio e consolidação de competências profissionais.',8,'Prática profissional','internship','planned',true,52),
  ('Extensão Universitária em Educação','PED-53','Integração entre universidade e sociedade por meio de ações extensionistas na área educacional.',8,'Extensão','extension','planned',true,53),
  ('Trabalho de Conclusão de Curso','PED-54','Desenvolvimento, orientação e apresentação de trabalho acadêmico de conclusão.',8,'Pesquisa','capstone','planned',true,54),
  ('Seminário Integrador e Práticas Pedagógicas','PED-55','Integração interdisciplinar entre fundamentos, conhecimentos específicos, prática e reflexão profissional.',8,'Integração curricular','practice','planned',true,55)
)
INSERT INTO public.disciplines
  (course_id,name,code,description,published,reference_semester,curriculum_area,component_kind,curriculum_status,is_core,curriculum_order)
SELECT
  (SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1),
  c.name,c.code,c.description,false,c.reference_semester,c.curriculum_area,c.component_kind,c.curriculum_status,c.is_core,c.curriculum_order
FROM curriculum c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.disciplines d
  WHERE d.course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
    AND lower(d.name)=lower(c.name)
);

UPDATE public.disciplines d
SET code = v.code,
    reference_semester = v.reference_semester,
    curriculum_area = v.curriculum_area,
    component_kind = v.component_kind,
    curriculum_status = v.curriculum_status,
    is_core = v.is_core,
    curriculum_order = v.curriculum_order,
    description = v.description
FROM (VALUES
  ('Psicologia da Educação','PED-06',1,'Fundamentos','discipline','ready',true,6,'Desenvolvimento, aprendizagem, mediação, motivação e processos psicológicos na educação.'),
  ('Didática','PED-08',2,'Formação docente','discipline','ready',true,8,'Processos de ensino e aprendizagem, planejamento, mediação e avaliação.'),
  ('Alfabetização I','PED-13',2,'Alfabetização','discipline','ready',true,13,'Alfabetização, letramento, sistema de escrita, consciência fonológica e psicogênese.')
) v(name,code,reference_semester,curriculum_area,component_kind,curriculum_status,is_core,curriculum_order,description)
WHERE d.course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
  AND lower(d.name)=lower(v.name);
