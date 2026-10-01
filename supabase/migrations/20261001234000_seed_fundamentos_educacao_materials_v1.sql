WITH dseed(name,core,intro) AS (VALUES
('Conceitos fundamentais de educação','Educação é um fenômeno amplo de formação humana, que ocorre em diferentes espaços sociais.','O que você vai aprender: Educação é um fenômeno amplo de formação humana, que ocorre em diferentes espaços sociais. Este tópico apresenta conceitos essenciais para interpretar o fenômeno educativo.'),
('Educação, sociedade e cultura','A educação acontece dentro de relações sociais e culturais e também pode produzir mudanças nessas relações.','O que você vai aprender: A educação acontece dentro de relações sociais e culturais e também pode produzir mudanças nessas relações. Este tópico apresenta conceitos essenciais para interpretar o fenômeno educativo.'),
('Concepções pedagógicas','Concepções pedagógicas são formas amplas de compreender finalidades, conhecimento, ensino, aprendizagem, professor e estudante.','O que você vai aprender: Concepções pedagógicas são formas amplas de compreender finalidades, conhecimento, ensino, aprendizagem, professor e estudante. Este tópico apresenta conceitos essenciais para interpretar o fenômeno educativo.'),
('Finalidades e funções da educação','As finalidades da educação ajudam a orientar currículo, ensino, avaliação e organização institucional.','O que você vai aprender: As finalidades da educação ajudam a orientar currículo, ensino, avaliação e organização institucional. Este tópico apresenta conceitos essenciais para interpretar o fenômeno educativo.'),
('Educação, escola e formação humana','A escola é uma instituição específica que organiza experiências de aprendizagem sistemáticas e intencionais.','O que você vai aprender: A escola é uma instituição específica que organiza experiências de aprendizagem sistemáticas e intencionais. Este tópico apresenta conceitos essenciais para interpretar o fenômeno educativo.')
),
mseed AS (
  SELECT d.id AS discipline_id,t.id AS topic_id,
         dseed.name,dseed.intro
  FROM dseed
  JOIN public.disciplines d ON d.course_id=(SELECT id FROM public.courses WHERE slug='pedagogia' LIMIT 1)
    AND lower(d.name)=lower('Fundamentos da Educação')
  JOIN public.topics t ON t.discipline_id=d.id AND lower(t.name)=lower(dseed.name)
),
ins AS (
  INSERT INTO public.materials(topic_id,title,introduction,status)
  SELECT topic_id,name,intro,'draft' FROM mseed
  ON CONFLICT DO NOTHING
  RETURNING id,topic_id
),
mm AS (
  SELECT m.id,m.topic_id FROM public.materials m
  JOIN mseed s ON s.topic_id=m.topic_id AND m.title=s.name
)
INSERT INTO public.material_sections(material_id,title,content,position,section_type)
SELECT mm.id,sv.title,sv.content,sv.position,sv.section_type
FROM mm
JOIN (VALUES
('Conceitos fundamentais de educação',1,'Conceito central','Educação é um fenômeno amplo de formação humana, que ocorre em diferentes espaços sociais.','concept'),
('Conceitos fundamentais de educação',2,'O que isso significa','A LDB trata a educação como conjunto de processos formativos e distingue a educação escolar, que se desenvolve predominantemente por meio do ensino.','explanation'),
('Conceitos fundamentais de educação',3,'Relação com a Pedagogia','Educação é um fenômeno amplo de formação humana, que ocorre em diferentes espaços sociais. Na formação do pedagogo, esse conceito ajuda a justificar decisões sobre currículo, ensino, avaliação e organização do trabalho educativo.','explanation'),
('Conceitos fundamentais de educação',4,'Exemplo para visualizar','Uma criança pode aprender modos de convivência em casa, participar de uma oficina comunitária e estudar Ciências na escola. São experiências educativas diferentes.','examples'),
('Conceitos fundamentais de educação',5,'Uma situação para analisar','Imagine uma turma com conhecimentos prévios e experiências diferentes. O conceito deste tópico ajuda a perguntar quais condições, finalidades e relações precisam ser consideradas antes de escolher uma ação pedagógica.','examples'),
('Conceitos fundamentais de educação',6,'Erro comum','Um erro frequente é transformar o conceito em uma receita universal ou isolá-lo de seu contexto. A compreensão acadêmica exige reconhecer relações e limites de aplicação.','common_mistakes'),
('Conceitos fundamentais de educação',7,'Aprofundamento','A LDB trata a educação como conjunto de processos formativos e distingue a educação escolar, que se desenvolve predominantemente por meio do ensino. Compare duas situações educativas e identifique o que muda quando mudam os sujeitos, o contexto, os objetivos ou a forma de mediação.','deepening'),
('Conceitos fundamentais de educação',8,'Aplicação pedagógica','Antes de tomar uma decisão, explicite a finalidade, observe o contexto e identifique quais conhecimentos e formas de participação estão sendo mobilizados. Esse procedimento torna a prática mais justificável e revisável.','deepening'),
('Conceitos fundamentais de educação',9,'Síntese','Educação é um fenômeno amplo de formação humana, que ocorre em diferentes espaços sociais. A LDB trata a educação como conjunto de processos formativos e distingue a educação escolar, que se desenvolve predominantemente por meio do ensino. O estudante deve conseguir explicar a ideia com palavras próprias e reconhecê-la em uma situação concreta.','review'),
('Conceitos fundamentais de educação',10,'Para revisar','Explique o conceito em uma frase, dê um exemplo, cite um erro comum e relacione o tema a outro campo da Pedagogia.','review'),
('Educação, sociedade e cultura',1,'Conceito central','A educação acontece dentro de relações sociais e culturais e também pode produzir mudanças nessas relações.','concept'),
('Educação, sociedade e cultura',2,'O que isso significa','Valores, linguagens, conhecimentos e formas de participação atravessam as práticas educativas; currículo e escola expressam escolhas sociais e culturais.','explanation'),
('Educação, sociedade e cultura',3,'Relação com a Pedagogia','A educação acontece dentro de relações sociais e culturais e também pode produzir mudanças nessas relações. Na formação do pedagogo, esse conceito ajuda a justificar decisões sobre currículo, ensino, avaliação e organização do trabalho educativo.','explanation'),
('Educação, sociedade e cultura',4,'Exemplo para visualizar','Uma escola que amplia as referências culturais presentes no currículo altera o repertório disponível aos estudantes e a forma de participação na aprendizagem.','examples'),
('Educação, sociedade e cultura',5,'Uma situação para analisar','Imagine uma turma com conhecimentos prévios e experiências diferentes. O conceito deste tópico ajuda a perguntar quais condições, finalidades e relações precisam ser consideradas antes de escolher uma ação pedagógica.','examples'),
('Educação, sociedade e cultura',6,'Erro comum','Um erro frequente é transformar o conceito em uma receita universal ou isolá-lo de seu contexto. A compreensão acadêmica exige reconhecer relações e limites de aplicação.','common_mistakes'),
('Educação, sociedade e cultura',7,'Aprofundamento','Valores, linguagens, conhecimentos e formas de participação atravessam as práticas educativas; currículo e escola expressam escolhas sociais e culturais. Compare duas situações educativas e identifique o que muda quando mudam os sujeitos, o contexto, os objetivos ou a forma de mediação.','deepening'),
('Educação, sociedade e cultura',8,'Aplicação pedagógica','Antes de tomar uma decisão, explicite a finalidade, observe o contexto e identifique quais conhecimentos e formas de participação estão sendo mobilizados. Esse procedimento torna a prática mais justificável e revisável.','deepening'),
('Educação, sociedade e cultura',9,'Síntese','A educação acontece dentro de relações sociais e culturais e também pode produzir mudanças nessas relações. Valores, linguagens, conhecimentos e formas de participação atravessam as práticas educativas; currículo e escola expressam escolhas sociais e culturais. O estudante deve conseguir explicar a ideia com palavras próprias e reconhecê-la em uma situação concreta.','review'),
('Educação, sociedade e cultura',10,'Para revisar','Explique o conceito em uma frase, dê um exemplo, cite um erro comum e relacione o tema a outro campo da Pedagogia.','review'),
('Concepções pedagógicas',1,'Conceito central','Concepções pedagógicas são formas amplas de compreender finalidades, conhecimento, ensino, aprendizagem, professor e estudante.','concept'),
('Concepções pedagógicas',2,'O que isso significa','Uma técnica isolada não define uma concepção. A análise depende da finalidade, da relação pedagógica, do lugar do conhecimento e da forma de organizar a aprendizagem.','explanation'),
('Concepções pedagógicas',3,'Relação com a Pedagogia','Concepções pedagógicas são formas amplas de compreender finalidades, conhecimento, ensino, aprendizagem, professor e estudante. Na formação do pedagogo, esse conceito ajuda a justificar decisões sobre currículo, ensino, avaliação e organização do trabalho educativo.','explanation'),
('Concepções pedagógicas',4,'Exemplo para visualizar','Duas aulas podem usar trabalho em grupo e ter concepções diferentes, conforme a finalidade e a maneira de mediar a atividade.','examples'),
('Concepções pedagógicas',5,'Uma situação para analisar','Imagine uma turma com conhecimentos prévios e experiências diferentes. O conceito deste tópico ajuda a perguntar quais condições, finalidades e relações precisam ser consideradas antes de escolher uma ação pedagógica.','examples'),
('Concepções pedagógicas',6,'Erro comum','Um erro frequente é transformar o conceito em uma receita universal ou isolá-lo de seu contexto. A compreensão acadêmica exige reconhecer relações e limites de aplicação.','common_mistakes'),
('Concepções pedagógicas',7,'Aprofundamento','Uma técnica isolada não define uma concepção. A análise depende da finalidade, da relação pedagógica, do lugar do conhecimento e da forma de organizar a aprendizagem. Compare duas situações educativas e identifique o que muda quando mudam os sujeitos, o contexto, os objetivos ou a forma de mediação.','deepening'),
('Concepções pedagógicas',8,'Aplicação pedagógica','Antes de tomar uma decisão, explicite a finalidade, observe o contexto e identifique quais conhecimentos e formas de participação estão sendo mobilizados. Esse procedimento torna a prática mais justificável e revisável.','deepening'),
('Concepções pedagógicas',9,'Síntese','Concepções pedagógicas são formas amplas de compreender finalidades, conhecimento, ensino, aprendizagem, professor e estudante. Uma técnica isolada não define uma concepção. A análise depende da finalidade, da relação pedagógica, do lugar do conhecimento e da forma de organizar a aprendizagem. O estudante deve conseguir explicar a ideia com palavras próprias e reconhecê-la em uma situação concreta.','review'),
('Concepções pedagógicas',10,'Para revisar','Explique o conceito em uma frase, dê um exemplo, cite um erro comum e relacione o tema a outro campo da Pedagogia.','review'),
('Finalidades e funções da educação',1,'Conceito central','As finalidades da educação ajudam a orientar currículo, ensino, avaliação e organização institucional.','concept'),
('Finalidades e funções da educação',2,'O que isso significa','A LDB estabelece pleno desenvolvimento do educando, preparo para a cidadania e qualificação para o trabalho, junto de princípios como liberdade, pluralismo e valorização profissional.','explanation'),
('Finalidades e funções da educação',3,'Relação com a Pedagogia','As finalidades da educação ajudam a orientar currículo, ensino, avaliação e organização institucional. Na formação do pedagogo, esse conceito ajuda a justificar decisões sobre currículo, ensino, avaliação e organização do trabalho educativo.','explanation'),
('Finalidades e funções da educação',4,'Exemplo para visualizar','Uma atividade de leitura crítica de informações pode articular conhecimento escolar e formação para participação social.','examples'),
('Finalidades e funções da educação',5,'Uma situação para analisar','Imagine uma turma com conhecimentos prévios e experiências diferentes. O conceito deste tópico ajuda a perguntar quais condições, finalidades e relações precisam ser consideradas antes de escolher uma ação pedagógica.','examples'),
('Finalidades e funções da educação',6,'Erro comum','Um erro frequente é transformar o conceito em uma receita universal ou isolá-lo de seu contexto. A compreensão acadêmica exige reconhecer relações e limites de aplicação.','common_mistakes'),
('Finalidades e funções da educação',7,'Aprofundamento','A LDB estabelece pleno desenvolvimento do educando, preparo para a cidadania e qualificação para o trabalho, junto de princípios como liberdade, pluralismo e valorização profissional. Compare duas situações educativas e identifique o que muda quando mudam os sujeitos, o contexto, os objetivos ou a forma de mediação.','deepening'),
('Finalidades e funções da educação',8,'Aplicação pedagógica','Antes de tomar uma decisão, explicite a finalidade, observe o contexto e identifique quais conhecimentos e formas de participação estão sendo mobilizados. Esse procedimento torna a prática mais justificável e revisável.','deepening'),
('Finalidades e funções da educação',9,'Síntese','As finalidades da educação ajudam a orientar currículo, ensino, avaliação e organização institucional. A LDB estabelece pleno desenvolvimento do educando, preparo para a cidadania e qualificação para o trabalho, junto de princípios como liberdade, pluralismo e valorização profissional. O estudante deve conseguir explicar a ideia com palavras próprias e reconhecê-la em uma situação concreta.','review'),
('Finalidades e funções da educação',10,'Para revisar','Explique o conceito em uma frase, dê um exemplo, cite um erro comum e relacione o tema a outro campo da Pedagogia.','review'),
('Educação, escola e formação humana',1,'Conceito central','A escola é uma instituição específica que organiza experiências de aprendizagem sistemáticas e intencionais.','concept'),
('Educação, escola e formação humana',2,'O que isso significa','Formação humana envolve dimensões intelectuais, sociais, culturais, éticas e práticas; a escola articula acesso ao conhecimento e experiências de convivência e participação.','explanation'),
('Educação, escola e formação humana',3,'Relação com a Pedagogia','A escola é uma instituição específica que organiza experiências de aprendizagem sistemáticas e intencionais. Na formação do pedagogo, esse conceito ajuda a justificar decisões sobre currículo, ensino, avaliação e organização do trabalho educativo.','explanation'),
('Educação, escola e formação humana',4,'Exemplo para visualizar','Uma proposta de História pode desenvolver conceitos, análise de fontes, argumentação e reflexão sobre a vida coletiva ao mesmo tempo.','examples'),
('Educação, escola e formação humana',5,'Uma situação para analisar','Imagine uma turma com conhecimentos prévios e experiências diferentes. O conceito deste tópico ajuda a perguntar quais condições, finalidades e relações precisam ser consideradas antes de escolher uma ação pedagógica.','examples'),
('Educação, escola e formação humana',6,'Erro comum','Um erro frequente é transformar o conceito em uma receita universal ou isolá-lo de seu contexto. A compreensão acadêmica exige reconhecer relações e limites de aplicação.','common_mistakes'),
('Educação, escola e formação humana',7,'Aprofundamento','Formação humana envolve dimensões intelectuais, sociais, culturais, éticas e práticas; a escola articula acesso ao conhecimento e experiências de convivência e participação. Compare duas situações educativas e identifique o que muda quando mudam os sujeitos, o contexto, os objetivos ou a forma de mediação.','deepening'),
('Educação, escola e formação humana',8,'Aplicação pedagógica','Antes de tomar uma decisão, explicite a finalidade, observe o contexto e identifique quais conhecimentos e formas de participação estão sendo mobilizados. Esse procedimento torna a prática mais justificável e revisável.','deepening'),
('Educação, escola e formação humana',9,'Síntese','A escola é uma instituição específica que organiza experiências de aprendizagem sistemáticas e intencionais. Formação humana envolve dimensões intelectuais, sociais, culturais, éticas e práticas; a escola articula acesso ao conhecimento e experiências de convivência e participação. O estudante deve conseguir explicar a ideia com palavras próprias e reconhecê-la em uma situação concreta.','review'),
('Educação, escola e formação humana',10,'Para revisar','Explique o conceito em uma frase, dê um exemplo, cite um erro comum e relacione o tema a outro campo da Pedagogia.','review')
) sv(topic_name,position,title,content,section_type)
ON lower(sv.topic_name)=lower((SELECT t.name FROM public.topics t WHERE t.id=mm.topic_id))
WHERE NOT EXISTS (
  SELECT 1 FROM public.material_sections ms
  WHERE ms.material_id=mm.id AND ms.position=sv.position
);

-- Sources: LDB (Planalto), Resolução CNE/CP 1/2006, BNCC, Resolução CNE/CP 4/2024.
