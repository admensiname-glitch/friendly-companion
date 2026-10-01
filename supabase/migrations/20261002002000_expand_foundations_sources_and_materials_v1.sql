-- Correção de metadados das fontes acadêmicas e expansão dos blocos
-- iniciais de Filosofia, Sociologia, Antropologia e Metodologia Científica.
-- Conteúdo continua em draft; não publica material automaticamente.

UPDATE public.sources SET
  title='Pensar arriscado: a relação entre filosofia e educação',
  authors='[{"name":"Nadja Hermann"}]'::jsonb,
  publisher='Educação e Pesquisa',
  publication_date='2015-03-01',
  doi='10.1590/S1517-97022015011700',
  canonical_url='https://www.scielo.br/j/ep/a/4kjV7zLVCYjRwvZ4kqm7NkB/',
  status='active'
WHERE id='00000000-0000-0000-0000-000000000033';

UPDATE public.sources SET
  title='A busca do sentido da formação humana: tarefa da Filosofia da Educação',
  authors='[{"name":"Antônio Joaquim Severino"}]'::jsonb,
  publisher='Educação e Pesquisa',
  publication_date='2006-12-01',
  doi='10.1590/S1517-97022006000300013',
  canonical_url='https://www.scielo.br/j/ep/a/rhVxLn4XhLWjYJKXB7grswG/',
  status='active'
WHERE id='00000000-0000-0000-0000-000000000034';

UPDATE public.sources SET
  title='Socialização e cultura escolar no Brasil',
  authors='[{"name":"Francicleo Castro Ramos"}]'::jsonb,
  publisher='Revista Brasileira de Educação',
  publication_date='2018-01-01',
  doi='10.1590/S1413-24782018230006',
  canonical_url='https://www.scielo.br/j/rbedu/a/Jw98FvmBJC58vpTndgXjcky/',
  status='active'
WHERE id='00000000-0000-0000-0000-000000000035';

UPDATE public.sources SET
  title='As desigualdades e o trabalho das escolas: problematizando a relação entre desempenho e localização socioespacial',
  authors='[{"name":"Luana Costa Almeida"}]'::jsonb,
  publisher='Revista Brasileira de Educação',
  publication_date='2017-01-01',
  doi='10.1590/S1413-24782017226919',
  canonical_url='https://www.scielo.br/j/rbedu/a/p7Pvs4NGGJjLRbrNjwqdqrt/',
  status='active'
WHERE id='00000000-0000-0000-0000-000000000036';

UPDATE public.sources SET
  title='Antropologia, educação e condicionamentos culturais: pensando as mediações no processo de socialização escolar',
  authors='[{"name":"José Rogério Lopes"}]'::jsonb,
  publisher='Educar em Revista',
  publication_date='2009-01-01',
  doi='10.1590/S0104-40602009000100012',
  canonical_url='https://www.scielo.br/j/er/a/7kZQjyykdp4F5kLzVG864yd/',
  status='active'
WHERE id='00000000-0000-0000-0000-000000000037';

UPDATE public.sources SET
  title='DIÁLOGOS NAS FRONTEIRAS: UM ESTUDO SOBRE EDUCAÇÃO E ESCOLA NA ANTROPOLOGIA BRASILEIRA',
  authors='[{"name":"Sandra de Fátima Pereira Tosta"},{"name":"Carla Valéria Vieira Linhares Maia"},{"name":"Weslei Lopes da Silva"},{"name":"Douglas Cabral Dantas"}]'::jsonb,
  publisher='Educação em Revista',
  publication_date='2020-01-01',
  doi='10.1590/0102-4698222229',
  canonical_url='https://www.scielo.br/j/edur/a/BZVBbZtCBhFnf843kDst3n/',
  status='active'
WHERE id='00000000-0000-0000-0000-000000000038';

DELETE FROM public.source_rights
WHERE source_id IN (
  '00000000-0000-0000-0000-000000000033'::uuid,
  '00000000-0000-0000-0000-000000000034'::uuid,
  '00000000-0000-0000-0000-000000000035'::uuid,
  '00000000-0000-0000-0000-000000000036'::uuid,
  '00000000-0000-0000-0000-000000000037'::uuid,
  '00000000-0000-0000-0000-000000000038'::uuid
);

INSERT INTO public.source_rights
  (source_id,rights_class,access_model,evidence_url,evidence_note)
VALUES
('00000000-0000-0000-0000-000000000033','UNKNOWN','OPEN','https://www.scielo.br/j/ep/a/4kjV7zLVCYjRwvZ4kqm7NkB/','Artigo em acesso aberto; licença específica não representada no catálogo interno.'),
('00000000-0000-0000-0000-000000000034','UNKNOWN','OPEN','https://www.scielo.br/j/ep/a/rhVxLn4XhLWjYJKXB7grswG/','Artigo em acesso aberto; licença específica não representada no catálogo interno.'),
('00000000-0000-0000-0000-000000000035','UNKNOWN','OPEN','https://www.scielo.br/j/rbedu/a/Jw98FvmBJC58vpTndgXjcky/','Artigo em acesso aberto; licença específica não representada no catálogo interno.'),
('00000000-0000-0000-0000-000000000036','UNKNOWN','OPEN','https://www.scielo.br/j/rbedu/a/p7Pvs4NGGJjLRbrNjwqdqrt/','Artigo em acesso aberto; licença específica não representada no catálogo interno.'),
('00000000-0000-0000-0000-000000000037','UNKNOWN','OPEN','https://www.scielo.br/j/er/a/7kZQjyykdp4F5kLzVG864yd/','Artigo em acesso aberto; licença específica não representada no catálogo interno.'),
('00000000-0000-0000-0000-000000000038','OPEN','OPEN','https://periodicos.ufmg.br/index.php/edrevista/article/view/35628','O periódico informa licença Creative Commons Attribution 4.0 para o conteúdo.')
ON CONFLICT (source_id) DO UPDATE
SET rights_class=excluded.rights_class,
    access_model=excluded.access_model,
    evidence_url=excluded.evidence_url,
    evidence_note=excluded.evidence_note;

UPDATE public.disciplines
SET curriculum_status='in_progress'
WHERE name IN (
  'Fundamentos da Educação','História da Educação','Filosofia da Educação',
  'Sociologia da Educação','Antropologia e Educação','Metodologia Científica'
)
AND course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1);

-- Os materiais correspondentes aos blocos iniciais recebem conteúdo específico
-- em suas primeiras seções e ficam vinculados às fontes conferidas.
WITH seed(discipline_name,topic_name,content) AS (VALUES
('Filosofia da Educação','O que é filosofia da educação','A Filosofia da Educação investiga criticamente os sentidos, fundamentos e problemas da experiência educativa. Ela pergunta o que significa educar, conhecer, formar e viver coletivamente.'),
('Filosofia da Educação','Educação e conhecimento','O estudo filosófico da educação examina relações entre conhecimento, verdade, experiência, linguagem e formação.'),
('Filosofia da Educação','Ética e formação humana','Educação envolve decisões sobre valores, relações, responsabilidades e modos de convivência.'),
('Filosofia da Educação','Principais correntes filosóficas da educação','Diferentes tradições filosóficas oferecem interpretações distintas sobre conhecimento, liberdade, autoridade, experiência e formação.'),
('Filosofia da Educação','Problemas contemporâneos da educação','Questões atuais como tecnologia, pluralidade cultural, desigualdade, autonomia e sentido da escola podem ser analisadas filosoficamente.'),
('Sociologia da Educação','Educação e sociedade','A Sociologia da Educação estuda a educação como fenômeno social, considerando instituições, grupos, desigualdades, cultura e relações de poder.'),
('Sociologia da Educação','Socialização e instituições educativas','Socialização e cultura escolar ajudam a compreender como a escola participa da formação dos sujeitos e como diferentes culturas se encontram na instituição escolar.'),
('Sociologia da Educação','Desigualdades educacionais','Desigualdades educacionais precisam ser analisadas em relação às condições sociais, econômicas, culturais e territoriais.'),
('Sociologia da Educação','Escola, cultura e reprodução social','A escola transmite conhecimentos e normas, mas também pode reproduzir diferenças sociais quando certos capitais culturais são valorizados de forma desigual.'),
('Sociologia da Educação','Educação e transformação social','A educação pode participar de processos de transformação social, mas seus efeitos dependem de condições institucionais, políticas, culturais e históricas.'),
('Antropologia e Educação','Antropologia, cultura e educação','A Antropologia contribui para compreender educação como experiência cultural, observando modos de viver, aprender, significar e conviver.'),
('Antropologia e Educação','Cultura e aprendizagem','Aprender acontece em contextos coletivos e culturalmente organizados. A escola é espaço de mediação em que diferentes referências culturais se encontram.'),
('Antropologia e Educação','Identidade, diferença e alteridade','Identidade e diferença são produzidas em relações sociais. A educação pode reconhecer essas diferenças ou reforçar estigmas, dependendo de suas práticas.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos','Diversidade cultural envolve diferentes pertencimentos e marcadores sociais. A análise antropológica procura evitar generalizações e compreender experiências situadas.'),
('Antropologia e Educação','Educação e contextos socioculturais','Etnografia e outros procedimentos antropológicos ajudam a observar práticas, relações e sentidos no cotidiano.'),
('Metodologia Científica','Conhecimento científico e universidade','Conhecimento científico é produzido por procedimentos sistemáticos de investigação, argumentação e comunicação.'),
('Metodologia Científica','Leitura e estudo acadêmico','A leitura acadêmica exige identificar problema, objetivo, tese, argumentos, evidências e limites de um texto.'),
('Metodologia Científica','Problema, objetivos e hipóteses','Uma pesquisa precisa delimitar o problema que pretende investigar e explicitar objetivos coerentes.'),
('Metodologia Científica','Pesquisa, fontes e referências','Fontes precisam ser selecionadas, avaliadas e registradas de modo rastreável. Referenciar corretamente permite reconhecer autoria e verificar informações.'),
('Metodologia Científica','Escrita acadêmica e integridade científica','Escrever academicamente envolve organizar argumentos, dialogar com fontes e assumir responsabilidade pela autoria.')
)
UPDATE public.material_sections ms
SET content=seed.content
FROM public.materials m,public.topics t,public.disciplines d
JOIN seed ON seed.discipline_name=d.name AND seed.topic_name=t.name
WHERE ms.material_id=m.id AND m.topic_id=t.id AND t.discipline_id=d.id
  AND ms.position=1;

-- Vínculos de fonte para os blocos.
INSERT INTO public.topic_sources(topic_id,source_id,role,status)
SELECT t.id,x.source_id,'COMPLEMENTAR','APPROVED'
FROM public.topics t
JOIN public.disciplines d ON d.id=t.discipline_id
JOIN (VALUES
('Filosofia da Educação','00000000-0000-0000-0000-000000000033'::uuid),
('Filosofia da Educação','00000000-0000-0000-0000-000000000034'::uuid),
('Sociologia da Educação','00000000-0000-0000-0000-000000000035'::uuid),
('Sociologia da Educação','00000000-0000-0000-0000-000000000036'::uuid),
('Antropologia e Educação','00000000-0000-0000-0000-000000000037'::uuid),
('Antropologia e Educação','00000000-0000-0000-0000-000000000038'::uuid),
('Metodologia Científica','00000000-0000-0000-0000-000000000024'::uuid),
('Metodologia Científica','00000000-0000-0000-0000-000000000022'::uuid)
) x(discipline_name,source_id) ON x.discipline_name=d.name
ON CONFLICT DO NOTHING;