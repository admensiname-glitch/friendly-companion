-- Expansão do núcleo de inclusão, diversidade e modalidades de Pedagogia.
-- Mantém os materiais em draft e não publica automaticamente.
-- Referências normativas principais: PNEEI, ERER, Direitos Humanos, Libras,
-- Educação Ambiental, EJA, Campo, Indígena e Quilombola.

WITH seed(discipline_name,topic_name,content) AS (VALUES
('Educação Inclusiva','Princípios da educação inclusiva','A educação inclusiva organiza o sistema educacional para garantir acesso, permanência, participação e aprendizagem, reconhecendo a diversidade humana e removendo barreiras.'),
('Educação Inclusiva','Barreiras à participação e aprendizagem','Barreiras podem estar em atitudes, comunicação, materiais, espaços, currículo e organização escolar. Identificá-las ajuda a deslocar o foco da suposta incapacidade individual para as condições de participação.'),
('Educação Inclusiva','Acessibilidade e desenho universal','Acessibilidade envolve condições para que diferentes pessoas participem e aprendam. O planejamento pode prever múltiplos meios de apresentação, participação e expressão.'),
('Educação Inclusiva','Práticas pedagógicas inclusivas','Práticas inclusivas podem adaptar estratégias, recursos, comunicação, tempo e formas de participação sem retirar do estudante o direito de aprender com os demais.'),
('Educação Inclusiva','Família, escola e rede de apoio','A inclusão exige articulação entre escola, família, serviços e políticas públicas. A responsabilidade pedagógica permanece coletiva.'),

('Educação Especial','Conceitos e público da Educação Especial','A Educação Especial é modalidade transversal que oferta recursos e serviços para apoiar, complementar ou suplementar a escolarização de estudantes com deficiência, transtorno do espectro autista e altas habilidades ou superdotação.'),
('Educação Especial','Deficiência e participação escolar','O foco pedagógico deve considerar barreiras e apoios necessários para participação, permanência e aprendizagem, evitando reduzir o estudante à condição diagnosticada.'),
('Educação Especial','Atendimento Educacional Especializado','O AEE oferece apoio especializado de forma complementar ou suplementar à escolarização, articulado ao trabalho da sala comum e às necessidades educacionais do estudante.'),
('Educação Especial','Recursos de acessibilidade pedagógica','Recursos de tecnologia assistiva, comunicação acessível, materiais adaptados e organização de ambientes podem ampliar participação e aprendizagem.'),
('Educação Especial','Articulação entre ensino comum e Educação Especial','Inclusão exige planejamento compartilhado e articulação entre professores, AEE, gestão, família e demais profissionais envolvidos.'),

('Libras e Educação de Surdos','Língua, linguagem e Libras','Libras é uma língua visual-espacial reconhecida pela legislação brasileira. Estudar Libras na Pedagogia implica compreender língua, comunicação, acessibilidade e direitos linguísticos.'),
('Libras e Educação de Surdos','Cultura e identidade surda','Experiências surdas envolvem dimensões linguísticas e culturais. A escola precisa considerar formas visuais de comunicação e participação.'),
('Libras e Educação de Surdos','Educação bilíngue de surdos','A educação bilíngue considera Libras e Língua Portuguesa escrita em diferentes funções, respeitando as especificidades linguísticas das pessoas surdas.'),
('Libras e Educação de Surdos','Práticas pedagógicas e acessibilidade comunicacional','Recursos visuais, Libras, profissionais de apoio e organização acessível da comunicação podem favorecer participação e aprendizagem.'),
('Libras e Educação de Surdos','Escola e direitos linguísticos','O trabalho pedagógico deve reconhecer o direito à comunicação e à educação acessíveis, considerando as normas que orientam a formação de professores.'),

('Educação das Relações Étnico-Raciais','Racismo, relações raciais e educação','Educação das relações étnico-raciais envolve compreender racismo, relações sociais, identidade e direitos, articulando ensino e valorização de histórias e culturas afro-brasileiras e africanas.'),
('Educação das Relações Étnico-Raciais','História e cultura africana','O estudo da África deve superar visões estereotipadas, considerando diversidade histórica, cultural, política e social dos diferentes povos e sociedades africanas.'),
('Educação das Relações Étnico-Raciais','História e cultura afro-brasileira','A história afro-brasileira precisa aparecer como parte constitutiva da história do Brasil, valorizando contribuições, trajetórias, resistências e produções culturais.'),
('Educação das Relações Étnico-Raciais','Currículo e educação antirracista','As diretrizes nacionais estabelecem abordagem curricular da educação das relações étnico-raciais e do ensino de história e cultura afro-brasileira e africana.'),
('Educação das Relações Étnico-Raciais','Práticas pedagógicas e equidade racial','Práticas pedagógicas antirracistas exigem seleção crítica de materiais, enfrentamento de estereótipos e criação de ambientes de aprendizagem que valorizem diversidade e dignidade.'),

('Educação, Diversidade e Direitos Humanos','Direitos humanos e educação','A Educação em Direitos Humanos envolve práticas educativas fundadas na dignidade, igualdade de direitos, valorização das diferenças, democracia e participação.'),
('Educação, Diversidade e Direitos Humanos','Diversidade e diferenças','Reconhecer diferenças não significa naturalizar desigualdades. A escola precisa criar condições de participação e aprendizagem sem discriminação.'),
('Educação, Diversidade e Direitos Humanos','Gênero, respeito e convivência','A formação para convivência democrática exige respeito às diferenças e análise crítica de práticas discriminatórias, com atenção a direitos e responsabilidades coletivas.'),
('Educação, Diversidade e Direitos Humanos','Democracia e participação','Educação em direitos humanos inclui experiências de participação, diálogo, responsabilidade e construção coletiva de decisões.'),
('Educação, Diversidade e Direitos Humanos','Práticas educativas para a equidade','Equidade envolve identificar barreiras e desigualdades e construir respostas pedagógicas que ampliem condições concretas de participação e aprendizagem.'),

('Educação Ambiental','Fundamentos da educação ambiental','Educação ambiental articula conhecimentos sobre relações sociedade-natureza, responsabilidade coletiva e formação para participação em questões socioambientais.'),
('Educação Ambiental','Relações sociedade-natureza','Problemas ambientais envolvem dimensões ecológicas, econômicas, culturais, políticas e territoriais. A educação deve evitar explicações exclusivamente individuais.'),
('Educação Ambiental','Sustentabilidade e território','Sustentabilidade pode ser analisada considerando recursos, modos de vida, território, justiça e decisões coletivas.'),
('Educação Ambiental','Educação ambiental na escola','A educação ambiental pode atravessar currículo e práticas escolares, conectando conhecimentos científicos a problemas locais e globais.'),
('Educação Ambiental','Projetos e práticas socioambientais','Projetos podem envolver diagnóstico, investigação, planejamento, ação e avaliação, criando oportunidades para aprendizagem e participação responsável.'),

('Educação, Infâncias e Direitos','Criança como sujeito de direitos','A criança deve ser compreendida como sujeito de direitos, participação e proteção, e não apenas como destinatária passiva de ações adultas.'),
('Educação, Infâncias e Direitos','Proteção integral','Proteção integral envolve garantir direitos e condições para desenvolvimento, convivência, educação e participação, articulando diferentes políticas e instituições.'),
('Educação, Infâncias e Direitos','Direitos da criança e políticas públicas','Políticas para a infância articulam educação, saúde, assistência, proteção e outros direitos. O pedagogo precisa compreender essa rede.'),
('Educação, Infâncias e Direitos','Participação e voz das crianças','Dar espaço à participação infantil significa criar formas adequadas de escuta e considerar perspectivas das crianças nas experiências educativas.'),
('Educação, Infâncias e Direitos','Práticas pedagógicas e garantia de direitos','Planejamento pedagógico deve considerar segurança, respeito, participação, desenvolvimento e aprendizagem como dimensões articuladas.'),

('Educação de Jovens e Adultos','Conceitos e história da EJA','A EJA atende sujeitos com trajetórias escolares diversas e precisa ser compreendida como direito à educação ao longo da vida.'),
('Educação de Jovens e Adultos','Sujeitos e trajetórias da EJA','Estudantes da EJA trazem experiências de trabalho, família, território e escolarização. Essas experiências constituem recursos para a aprendizagem.'),
('Educação de Jovens e Adultos','Alfabetização e letramento na EJA','Alfabetização na EJA deve articular apropriação da escrita, leitura, produção de sentidos e práticas sociais relevantes para os estudantes.'),
('Educação de Jovens e Adultos','Currículo e práticas pedagógicas','Currículo precisa considerar especificidades dos sujeitos, tempos de vida e trabalho e conhecimentos construídos fora da escola.'),
('Educação de Jovens e Adultos','Políticas e direito à educação','A EJA integra o direito à educação e possui diretrizes próprias. O pedagogo precisa acompanhar mudanças normativas para compreender sua organização.'),

('Educação do Campo','Conceitos e sujeitos do campo','Educação do Campo reconhece modos próprios de vida social, territórios e especificidades dos sujeitos do campo.'),
('Educação do Campo','História e políticas da Educação do Campo','As diretrizes nacionais orientam os sistemas de ensino a considerar a diversidade do campo e as formas próprias de organização das comunidades.'),
('Educação do Campo','Currículo contextualizado','Currículo pode articular conhecimentos escolares e experiências do território, sem reduzir a educação do campo a conteúdos locais isolados.'),
('Educação do Campo','Pedagogias e práticas educativas','Práticas devem considerar tempos, espaços, trabalho, cultura e modos de vida das comunidades, respeitando suas especificidades.'),
('Educação do Campo','Território, comunidade e escola','A escola do campo se relaciona ao território e à comunidade. Participação e contextualização ajudam a construir práticas mais significativas.'),

('Educação Indígena e Intercultural','Povos indígenas e educação','A educação escolar indígena deve considerar diversidade de povos, línguas, territórios, histórias e projetos próprios.'),
('Educação Indígena e Intercultural','Educação escolar indígena','As diretrizes nacionais reconhecem especificidade, diferença, igualdade social, bilinguismo e interculturalidade como fundamentos.'),
('Educação Indígena e Intercultural','Interculturalidade e currículo','Interculturalidade implica diálogo entre conhecimentos e modos de vida, sem apagar autonomia e conhecimentos dos povos indígenas.'),
('Educação Indígena e Intercultural','Línguas e conhecimentos tradicionais','Línguas indígenas e conhecimentos tradicionais são componentes importantes das experiências educativas e devem ser tratados com respeito e contextualização.'),
('Educação Indígena e Intercultural','Autonomia, território e práticas escolares','A organização escolar indígena deve dialogar com território, comunidade, língua, cultura e formas próprias de ensino e aprendizagem.'),

('Educação Quilombola e Contextos Comunitários','Educação quilombola e identidade','Educação escolar quilombola reconhece especificidades étnico-raciais e culturais das comunidades e seus processos próprios de ensino e aprendizagem.'),
('Educação Quilombola e Contextos Comunitários','Território, memória e pertencimento','Território, memória, ancestralidade e patrimônio cultural são dimensões importantes da formação em contextos quilombolas.'),
('Educação Quilombola e Contextos Comunitários','Currículo e conhecimentos comunitários','As diretrizes orientam práticas curriculares que considerem saberes, tradições e contextos históricos e culturais das comunidades.'),
('Educação Quilombola e Contextos Comunitários','Relações étnico-raciais e escola','A educação quilombola se articula à educação das relações étnico-raciais e ao enfrentamento do racismo.'),
('Educação Quilombola e Contextos Comunitários','Práticas educativas em contextos comunitários','Organização escolar, gestão, materiais e formação docente precisam respeitar especificidades e participação das comunidades.')
);
