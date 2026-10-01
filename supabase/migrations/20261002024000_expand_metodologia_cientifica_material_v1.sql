-- Complete first-pass editorial content for Metodologia Científica.
-- Source basis: CNPq 2026 integrity guidelines, DCN Pedagogia and BNCC references.
WITH seed(discipline_name,topic_name,position,title,content) AS (VALUES
('Metodologia Científica','Conhecimento científico e universidade',1,'Conceito central','Conhecimento científico é produzido por investigação sistemática, argumentação, análise de evidências e comunicação pública. Na universidade, estudar ciência também significa aprender a formular perguntas e avaliar a qualidade das respostas.'),
('Metodologia Científica','Conhecimento científico e universidade',2,'Conhecimento e evidência','Uma afirmação acadêmica precisa ser sustentada por evidências e argumentos adequados ao problema. A força de uma conclusão depende dos métodos e dos dados que a sustentam.'),
('Metodologia Científica','Conhecimento científico e universidade',3,'Pesquisa como processo','Pesquisa envolve etapas articuladas: problema, objetivos, revisão de literatura, método, produção/análise de dados e comunicação dos resultados.'),
('Metodologia Científica','Conhecimento científico e universidade',4,'Exemplo para visualizar','Uma estudante percebe que faltas aumentam em sua turma. “Os alunos não têm interesse” é uma hipótese inicial; pesquisa exige transformar a percepção em problema investigável e buscar evidências.'),
('Metodologia Científica','Conhecimento científico e universidade',5,'Situação para analisar','Um texto apresenta uma conclusão ampla a partir de um único exemplo. Examine se a evidência é suficiente, se o método foi descrito e se a conclusão ultrapassa os dados.'),
('Metodologia Científica','Conhecimento científico e universidade',6,'Erro comum','Confundir texto acadêmico com verdade automática. Um artigo também possui método, escolhas, limitações e necessidade de leitura crítica.'),
('Metodologia Científica','Conhecimento científico e universidade',7,'Aprofundamento','A formação científica envolve transparência, rastreabilidade e responsabilidade. O CNPq orienta que pesquisas sejam conduzidas com padrões éticos e que dados e materiais sejam geridos com integridade. citeturn753599search0'),
('Metodologia Científica','Conhecimento científico e universidade',8,'Aplicação na formação','Ao estudar qualquer texto científico, identifique problema, objetivo, método, principais evidências, conclusão e limitações.'),
('Metodologia Científica','Conhecimento científico e universidade',9,'Síntese','Conhecimento científico depende de procedimentos que permitam examinar e discutir como uma conclusão foi produzida.'),
('Metodologia Científica','Conhecimento científico e universidade',10,'Para revisar','Pegue uma afirmação sobre educação e escreva que tipo de evidência seria necessário para investigá-la cientificamente.'),
('Metodologia Científica','Leitura e estudo acadêmico',1,'Conceito central','Leitura acadêmica é uma atividade de análise. O estudante procura compreender problema, objetivo, conceitos, argumentos, evidências, método e conclusão do texto.'),
('Metodologia Científica','Leitura e estudo acadêmico',2,'Leitura em camadas','Uma leitura produtiva pode começar pela estrutura geral e depois avançar para trechos centrais, conceitos e evidências. A finalidade da leitura orienta a profundidade necessária.'),
('Metodologia Científica','Leitura e estudo acadêmico',3,'Argumento e evidência','É importante separar o que o autor afirma da evidência usada para apoiar a afirmação. Resumir corretamente exige preservar essa relação.'),
('Metodologia Científica','Leitura e estudo acadêmico',4,'Exemplo para visualizar','Ao ler um artigo sobre alfabetização, não basta destacar definições: identifique qual pergunta o estudo respondeu, como os dados foram obtidos e que conclusão foi realmente sustentada.'),
('Metodologia Científica','Leitura e estudo acadêmico',5,'Situação para analisar','Um estudante copia trechos destacados e considera o estudo concluído. Analise o que ainda falta: compreensão, síntese, comparação e produção de uma interpretação própria.'),
('Metodologia Científica','Leitura e estudo acadêmico',6,'Erro comum','Confundir quantidade de marcações com aprendizagem. Marcar páginas não garante compreensão nem capacidade de recuperar conceitos posteriormente.'),
('Metodologia Científica','Leitura e estudo acadêmico',7,'Aprofundamento','A leitura acadêmica deve ser conectada à escrita e ao estudo. Uma boa anotação registra ideias centrais, relações, dúvidas e evidências relevantes.'),
('Metodologia Científica','Leitura e estudo acadêmico',8,'Aplicação na formação','Use uma ficha de leitura com referência, pergunta do texto, tese, método, evidências, conclusão, limites e sua própria dúvida.'),
('Metodologia Científica','Leitura e estudo acadêmico',9,'Síntese','Ler academicamente é reconstruir o raciocínio de um texto e situá-lo diante do problema investigado.'),
('Metodologia Científica','Leitura e estudo acadêmico',10,'Para revisar','Escolha um artigo e escreva em cinco linhas: problema, objetivo, método, conclusão e uma limitação.'),
('Metodologia Científica','Problema, objetivos e hipóteses',1,'Conceito central','Problema de pesquisa é uma pergunta delimitada que pode ser investigada. Objetivos indicam o que a pesquisa pretende realizar; hipóteses podem apresentar respostas provisórias que serão examinadas.'),
('Metodologia Científica','Problema, objetivos e hipóteses',2,'Do tema ao problema','Tema é amplo; problema precisa ser específico. “Tecnologia na escola” pode se transformar em pergunta delimitada sobre um grupo, contexto, prática e período.'),
('Metodologia Científica','Problema, objetivos e hipóteses',3,'Objetivo geral e específicos','O objetivo geral expressa a finalidade central da pesquisa. Objetivos específicos dividem o percurso em ações ou dimensões necessárias para responder ao problema.'),
('Metodologia Científica','Problema, objetivos e hipóteses',4,'Exemplo para visualizar','Tema: leitura. Problema: como estudantes do 4º ano utilizam estratégias de compreensão ao ler textos informativos? Objetivos devem acompanhar essa pergunta, sem criar outra pesquisa.'),
('Metodologia Científica','Problema, objetivos e hipóteses',5,'Situação para analisar','Uma pesquisa possui objetivo de “avaliar” mas usa apenas descrição de percepções. Examine se método e objetivo estão realmente alinhados.'),
('Metodologia Científica','Problema, objetivos e hipóteses',6,'Erro comum','Escrever um problema amplo demais ou objetivos que não podem ser realizados com os recursos, tempo e dados disponíveis.'),
('Metodologia Científica','Problema, objetivos e hipóteses',7,'Aprofundamento','Coerência metodológica é uma relação entre problema, objetivos, métodos e evidências. Uma pesquisa forte reduz contradições entre essas partes.'),
('Metodologia Científica','Problema, objetivos e hipóteses',8,'Aplicação na formação','Depois de formular um problema, teste sua qualidade: está claro? delimitado? investigável? relevante? possível dentro do tempo e acesso disponíveis?'),
('Metodologia Científica','Problema, objetivos e hipóteses',9,'Síntese','Problema orienta a pesquisa; objetivos organizam o caminho; hipóteses, quando pertinentes, explicitam expectativas a serem examinadas.'),
('Metodologia Científica','Problema, objetivos e hipóteses',10,'Para revisar','Transforme um tema amplo de Pedagogia em um problema de pesquisa e formule um objetivo geral coerente.'),
('Metodologia Científica','Pesquisa, fontes e referências',1,'Conceito central','Pesquisar exige localizar, selecionar, avaliar e registrar fontes de modo que outras pessoas possam entender de onde vieram as informações e como foram usadas.'),
('Metodologia Científica','Pesquisa, fontes e referências',2,'Tipos de fontes','Fontes podem incluir legislação, artigos científicos, livros, teses, documentos institucionais, bases bibliográficas e conjuntos de dados. Cada tipo responde a necessidades diferentes.'),
('Metodologia Científica','Pesquisa, fontes e referências',3,'Avaliação da fonte','Relevância, autoria, instituição responsável, data, método, referências e relação com o problema ajudam a avaliar uma fonte.'),
('Metodologia Científica','Pesquisa, fontes e referências',4,'Exemplo para visualizar','Para estudar uma política educacional, um decreto oficial pode servir para identificar a norma; artigos científicos podem ajudar a discutir implementação e efeitos.'),
('Metodologia Científica','Pesquisa, fontes e referências',5,'Situação para analisar','Um estudante encontra uma postagem com dado estatístico, mas não identifica origem nem método. A fonte deve ser tratada como pista inicial, não como evidência suficiente.'),
('Metodologia Científica','Pesquisa, fontes e referências',6,'Erro comum','Usar a primeira página encontrada ou citar um texto que apenas repete uma fonte original sem verificar a fonte primária.'),
('Metodologia Científica','Pesquisa, fontes e referências',7,'Aprofundamento','A rastreabilidade é parte da integridade científica. O CNPq orienta gestão adequada de dados e atribuição correta de autoria e créditos científicos. citeturn753599search0turn753599search1'),
('Metodologia Científica','Pesquisa, fontes e referências',8,'Aplicação na formação','No Ensina-me, registre sempre a fonte original, metadados principais, função da fonte e vínculo com o tópico. Isso permite auditar e atualizar o conteúdo.'),
('Metodologia Científica','Pesquisa, fontes e referências',9,'Síntese','Referenciar é mais do que cumprir uma regra formal: permite verificar, reconhecer autoria e reconstruir o percurso da pesquisa.'),
('Metodologia Científica','Pesquisa, fontes e referências',10,'Para revisar','Escolha uma fonte acadêmica e registre autor, título, ano, instituição/periódico, DOI ou URL e a ideia que você utilizará.'),
('Metodologia Científica','Escrita acadêmica e integridade científica',1,'Conceito central','Escrita acadêmica organiza argumentos e evidencia como ideias e dados sustentam uma conclusão. Integridade exige honestidade na autoria, no uso de fontes, nos dados e na comunicação dos resultados.'),
('Metodologia Científica','Escrita acadêmica e integridade científica',2,'Paráfrase e citação','Parafrasear não significa trocar algumas palavras de um texto alheio. É reconstruir a ideia com linguagem própria sem perder o sentido e mantendo a referência à fonte.'),
('Metodologia Científica','Escrita acadêmica e integridade científica',3,'Autoria e responsabilidade','Autores respondem pelo conteúdo final de um trabalho. Créditos precisam refletir contribuições reais e fontes usadas precisam ser reconhecidas.'),
('Metodologia Científica','Escrita acadêmica e integridade científica',4,'Exemplo para visualizar','Uma estudante usa uma ferramenta de IA para resumir artigos. O texto final precisa ser conferido e, quando aplicável, o uso da ferramenta deve ser declarado segundo as regras da pesquisa e da instituição.'),
('Metodologia Científica','Escrita acadêmica e integridade científica',5,'Situação para analisar','Um relatório apresenta dados sem explicar origem e usa trechos copiados sem referência. Identifique problemas de rastreabilidade, autoria e possibilidade de plágio.'),
('Metodologia Científica','Escrita acadêmica e integridade científica',6,'Erro comum','Pensar que citar resolve qualquer problema. Uma referência incorreta, uso distorcido da fonte ou dado inventado continua comprometendo a integridade.'),
('Metodologia Científica','Escrita acadêmica e integridade científica',7,'Aprofundamento','Nas diretrizes atualizadas, o CNPq determina declarar o uso de IA generativa em qualquer fase da pesquisa e veda apresentar conteúdo gerado por IA como se fosse autoria humana; o autor continua responsável pelo conteúdo final. citeturn753599search0'),
('Metodologia Científica','Escrita acadêmica e integridade científica',8,'Aplicação na formação','Antes de entregar um texto, faça três verificações: cada afirmação importante tem suporte? cada ideia de terceiro está identificada? os dados podem ser rastreados?'),
('Metodologia Científica','Escrita acadêmica e integridade científica',9,'Síntese','Escrita acadêmica e integridade caminham juntas: clareza argumentativa, autoria verdadeira, fontes verificáveis e responsabilidade pelo resultado.'),
('Metodologia Científica','Escrita acadêmica e integridade científica',10,'Para revisar','Explique a diferença entre paráfrase legítima, citação direta e plágio. Depois descreva como registraria o uso de IA em uma atividade acadêmica.')
)
UPDATE public.material_sections ms
SET title=s.title,content=s.content,section_type=CASE s.position
 WHEN 1 THEN 'concept' WHEN 2 THEN 'explanation' WHEN 3 THEN 'explanation'
 WHEN 4 THEN 'examples' WHEN 5 THEN 'examples' WHEN 6 THEN 'common_mistakes'
 WHEN 7 THEN 'deepening' WHEN 8 THEN 'deepening' WHEN 9 THEN 'review' ELSE 'review' END
FROM seed s,public.materials m,public.topics t,public.disciplines d
WHERE ms.material_id=m.id AND m.topic_id=t.id AND t.discipline_id=d.id
AND d.name=s.discipline_name AND t.name=s.topic_name AND ms.position=s.position AND m.status='draft';

INSERT INTO public.material_citations(material_id,source_id,citation_label)
SELECT m.id,x.sid,'Fonte de estudo'
FROM public.materials m JOIN public.topics t ON t.id=m.topic_id JOIN public.disciplines d ON d.id=t.discipline_id
JOIN (VALUES
('Metodologia Científica','00000000-0000-0000-0000-000000000053'::uuid),
('Metodologia Científica','00000000-0000-0000-0000-000000000024'::uuid),
('Metodologia Científica','00000000-0000-0000-0000-000000000022'::uuid)
) x(discipline_name,sid) ON x.discipline_name=d.name
WHERE NOT EXISTS(select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=x.sid);

INSERT INTO public.topic_sources(topic_id,source_id,role,status)
SELECT t.id,x.sid,'COMPLEMENTAR','APPROVED'
FROM public.topics t JOIN public.disciplines d ON d.id=t.discipline_id
JOIN (VALUES
('Metodologia Científica','00000000-0000-0000-0000-000000000053'::uuid),
('Metodologia Científica','00000000-0000-0000-0000-000000000024'::uuid),
('Metodologia Científica','00000000-0000-0000-0000-000000000022'::uuid)
) x(discipline_name,sid) ON x.discipline_name=d.name
ON CONFLICT DO NOTHING;

UPDATE public.disciplines
SET curriculum_status='in_progress'
WHERE name='Metodologia Científica'
AND course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1);