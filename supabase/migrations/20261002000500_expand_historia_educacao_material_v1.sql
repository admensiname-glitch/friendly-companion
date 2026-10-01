-- Expansão editorial de História da Educação.
-- O conteúdo permanece em draft até revisão final.

UPDATE public.material_sections ms
SET content = CASE ms.position
  WHEN 1 THEN 'Nas sociedades antigas, a educação estava ligada à transmissão de saberes, valores, práticas religiosas, funções sociais e formas de organização política. Ela variava conforme o grupo social e a cultura de cada sociedade.'
  WHEN 2 THEN 'O desenvolvimento da escrita ampliou formas de registrar conhecimentos, administrar instituições e formar pessoas para funções específicas. Em sociedades letradas, o acesso a esses saberes não era necessariamente distribuído de modo igual.'
  WHEN 3 THEN 'Na Grécia antiga, diferentes cidades desenvolveram ideais educativos distintos. Atenas valorizava dimensões ligadas à participação cívica e à cultura, enquanto Esparta organizava a formação em torno de disciplina e preparação para a vida militar.'
  WHEN 4 THEN 'A educação romana esteve relacionada à família, à retórica, à vida pública e à formação para funções sociais. Ao longo do tempo, incorporou elementos da cultura grega.'
  WHEN 5 THEN 'Compare uma formação voltada à administração e escrita com uma formação voltada à disciplina militar. A comparação mostra que toda educação está ligada a finalidades e estruturas sociais.'
  WHEN 6 THEN 'Não existe uma única educação antiga. Mudam conteúdos, instituições, públicos e finalidades conforme a organização social e cultural.'
  WHEN 7 THEN 'Um erro é tratar educação antiga como uma instituição escolar igual à escola contemporânea. As formas de ensinar e aprender eram historicamente diferentes.'
  WHEN 8 THEN 'A história mostra que ideias sobre criança, conhecimento, autoridade e finalidade educativa são construções históricas e podem mudar.'
  WHEN 9 THEN 'Estudar a educação antiga ajuda a perceber que práticas educativas não são naturais nem universais; elas respondem a contextos e projetos sociais específicos.'
  ELSE 'Compare duas sociedades antigas e explique uma diferença de finalidade ou organização educacional entre elas.'
END
WHERE ms.material_id IN (
 SELECT m.id FROM public.materials m JOIN public.topics t ON t.id=m.topic_id
 WHERE t.name='Educação nas sociedades antigas'
);

UPDATE public.material_sections ms
SET content = CASE ms.position
  WHEN 1 THEN 'Na Europa medieval, diferentes instituições religiosas e civis participaram da formação e da preservação de conhecimentos. Entre elas estavam escolas monásticas, catedrais e universidades que surgiriam posteriormente.'
  WHEN 2 THEN 'A Igreja teve papel importante na organização de parte das práticas educacionais medievais, especialmente na preservação, produção e transmissão de conhecimentos em determinados contextos.'
  WHEN 3 THEN 'A escolástica desenvolveu modos sistemáticos de argumentação e estudo, articulando questões filosóficas e teológicas. Seu método mostra uma tradição de ensino fundada em leitura, debate e argumentação.'
  WHEN 4 THEN 'Na passagem para a modernidade, o humanismo renascentista ampliou o interesse por línguas, textos clássicos e formação intelectual, produzindo mudanças nas concepções de educação.'
  WHEN 5 THEN 'A expansão da imprensa modificou as possibilidades de circulação de textos e conhecimento, contribuindo para novas formas de estudo e difusão cultural.'
  WHEN 6 THEN 'Compare uma escola monástica com um ambiente universitário em formação. O tipo de conhecimento, público e finalidade pode variar bastante.'
  WHEN 7 THEN 'Não é adequado imaginar a Idade Média como um período sem produção intelectual. Havia instituições, autores, disputas e formas próprias de produção de conhecimento.'
  WHEN 8 THEN 'A transição medieval-moderna ajuda a compreender a longa formação histórica das instituições escolares e universitárias.'
  WHEN 9 THEN 'A educação medieval não foi estática: instituições e ideias mudaram, e processos como humanismo e expansão da circulação de textos contribuíram para transformações posteriores.'
  ELSE 'Explique duas transformações que ajudam a conectar a educação medieval ao surgimento de formas modernas de escolarização.'
END
WHERE ms.material_id IN (
 SELECT m.id FROM public.materials m JOIN public.topics t ON t.id=m.topic_id
 WHERE t.name='Educação medieval e formação moderna'
);

UPDATE public.material_sections ms
SET content = CASE ms.position
  WHEN 1 THEN 'A modernidade alterou formas de pensar conhecimento, infância, Estado, sociedade e escolarização. A educação passou a ser progressivamente integrada a projetos de formação social mais amplos.'
  WHEN 2 THEN 'Comenius é frequentemente associado à defesa de uma organização sistemática do ensino e à ideia de ampliar o acesso ao conhecimento. Seu pensamento faz parte da história das ideias pedagógicas modernas.'
  WHEN 3 THEN 'O Iluminismo colocou em circulação debates sobre razão, autonomia, cidadania e formação. Esses debates influenciaram concepções posteriores sobre escola e educação.'
  WHEN 4 THEN 'A expansão dos sistemas públicos de ensino associou escola, Estado e formação da população. A escolarização em massa foi resultado de processos políticos e sociais de longa duração.'
  WHEN 5 THEN 'A industrialização produziu novas demandas sociais e econômicas e também alterou debates sobre formação, trabalho, disciplina e acesso à escola.'
  WHEN 6 THEN 'Uma escola organizada por séries, horários, currículo e regras institucionais apresenta características diferentes de formas educativas medievais mais diversificadas.'
  WHEN 7 THEN 'Modernidade não significa apenas avanço. Ela envolve mudanças, disputas e novos problemas relacionados a igualdade, disciplina, conhecimento e poder.'
  WHEN 8 THEN 'Estudar a modernidade ajuda a entender por que a escola contemporânea possui currículos, séries, horários, certificação e funções sociais específicas.'
  WHEN 9 THEN 'A escolarização moderna se formou por meio da interação entre ideias pedagógicas, mudanças políticas, econômicas e culturais e expansão institucional.'
  ELSE 'Relacione modernidade, Estado e escolarização em um parágrafo próprio, usando ao menos dois conceitos do tópico.'
END
WHERE ms.material_id IN (
 SELECT m.id FROM public.materials m JOIN public.topics t ON t.id=m.topic_id
 WHERE t.name='Educação e modernidade'
);

UPDATE public.material_sections ms
SET content = CASE ms.position
  WHEN 1 THEN 'A história da educação brasileira é marcada por diferentes projetos políticos, sociais e culturais. O campo histórico relaciona instituições educativas, legislação, práticas e disputas sobre escolarização.'
  WHEN 2 THEN 'A educação colonial esteve fortemente relacionada à ação missionária e à estrutura social do período. A organização educacional não atendia de forma igual aos diferentes grupos da sociedade.'
  WHEN 3 THEN 'As reformas do período pombalino alteraram a organização da educação na colônia e reduziram o papel dos jesuítas, contribuindo para uma nova relação entre Estado e ensino.'
  WHEN 4 THEN 'No Império, a organização do ensino foi relacionada à construção do Estado nacional, com iniciativas de instrução pública e diferentes limites de acesso.'
  WHEN 5 THEN 'A República trouxe reformas educacionais e novos debates sobre escola, cidadania, formação de professores e organização dos sistemas de ensino.'
  WHEN 6 THEN 'A história da educação pode ser estudada por leis, relatórios, livros escolares, prédios, arquivos, práticas e outras fontes. A historiografia contemporânea amplia o olhar para a cultura material da escola.'
  WHEN 7 THEN 'Uma lei pode indicar uma intenção do Estado, enquanto um arquivo escolar pode revelar como uma regra foi vivida na prática. As fontes não dizem exatamente a mesma coisa.'
  WHEN 8 THEN 'Confundir a história prescrita em leis com a história efetivamente vivida nas escolas. É importante comparar diferentes tipos de evidência.'
  WHEN 9 THEN 'A história da educação brasileira envolve mudanças institucionais e também permanências, desigualdades e disputas sobre acesso e finalidade da escola.'
  ELSE 'Escolha duas fontes históricas e explique o que cada uma pode revelar sobre a educação brasileira.'
END
WHERE ms.material_id IN (
 SELECT m.id FROM public.materials m JOIN public.topics t ON t.id=m.topic_id
 WHERE t.name='História da educação brasileira'
);

UPDATE public.material_sections ms
SET content = CASE ms.position
  WHEN 1 THEN 'O século XX brasileiro foi marcado por reformas, expansão da escolarização, debates pedagógicos, períodos autoritários e novas políticas educacionais.'
  WHEN 2 THEN 'O movimento da Escola Nova reuniu propostas de renovação educacional que criticavam formas tradicionais de ensino e defendiam mudanças na organização escolar e na experiência dos estudantes.'
  WHEN 3 THEN 'No Brasil, projetos educacionais estiveram ligados a diferentes projetos de sociedade. Reformas e políticas precisam ser analisadas considerando seus contextos políticos e institucionais.'
  WHEN 4 THEN 'O período da ditadura militar produziu mudanças importantes na organização educacional, com políticas e reformas que devem ser estudadas em relação ao contexto autoritário da época.'
  WHEN 5 THEN 'A Constituição de 1988 e a LDB de 1996 consolidaram marcos fundamentais para o direito à educação e a organização da educação nacional.'
  WHEN 6 THEN 'A expansão do acesso escolar não eliminou automaticamente desigualdades. Pesquisas sobre escolarização mostram que fatores sociais e raciais continuam relevantes para compreender diferenças educacionais.'
  WHEN 7 THEN 'Compare o aumento do acesso à escola com as condições de aprendizagem e permanência. Quantidade de matrículas e equidade educacional são dimensões relacionadas, mas não idênticas.'
  WHEN 8 THEN 'Não é correto tratar a história recente como uma sequência linear de progresso. Há avanços, conflitos, retrocessos, permanências e disputas em diferentes períodos.'
  WHEN 9 THEN 'Compreender a educação brasileira contemporânea exige conectar história, legislação, políticas públicas, práticas escolares e desigualdades sociais.'
  ELSE 'Explique como Constituição, LDB e expansão da escolarização ajudam a compreender a educação brasileira contemporânea.'
END
WHERE ms.material_id IN (
 SELECT m.id FROM public.materials m JOIN public.topics t ON t.id=m.topic_id
 WHERE t.name='Educação brasileira no século XX e contemporânea'
);

insert into public.material_citations(material_id,source_id,citation_label)
select m.id,x.sid,'Fonte de estudo'
from public.materials m
join public.topics t on t.id=m.topic_id
cross join (values
('00000000-0000-0000-0000-000000000031'::uuid),
('00000000-0000-0000-0000-000000000032'::uuid),
('00000000-0000-0000-0000-000000000021'::uuid),
('00000000-0000-0000-0000-000000000022'::uuid)
) x(sid)
where t.name in ('Educação nas sociedades antigas','Educação medieval e formação moderna','Educação e modernidade','História da educação brasileira','Educação brasileira no século XX e contemporânea')
and not exists(select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=x.sid);