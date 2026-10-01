-- Complete first-pass editorial content for Antropologia e Educação.
-- Source basis: Lopes (2009) and Freitas (2021).
WITH seed(discipline_name,topic_name,position,title,content) AS (VALUES
('Antropologia e Educação','Antropologia, cultura e educação',1,'Conceito central','A Antropologia estuda modos de vida, relações, símbolos e processos culturais em contextos coletivos. Na educação, ajuda a compreender a escola e a aprendizagem como experiências inseridas em culturas concretas.'),
('Antropologia e Educação','Antropologia, cultura e educação',2,'Cultura não é natureza','Comportamentos e formas de aprender não devem ser explicados apenas por características naturais. A Antropologia destaca a importância da aprendizagem em contextos coletivos e culturais.'),
('Antropologia e Educação','Antropologia, cultura e educação',3,'Antropologia e escola','A escola é um dos espaços institucionais que participam da formação dos sujeitos e também produz e reproduz representações sobre grupos, diferenças e pertencimentos.'),
('Antropologia e Educação','Antropologia, cultura e educação',4,'Exemplo para visualizar','Uma mesma prática escolar pode ser interpretada de modos diferentes por estudantes de contextos culturais distintos. O olhar antropológico pergunta como os significados são construídos.'),
('Antropologia e Educação','Antropologia, cultura e educação',5,'Situação para analisar','Uma escola define uma prática como “normal” e considera outras formas de participação inadequadas. Analise quais pressupostos culturais orientam essa definição de normalidade.'),
('Antropologia e Educação','Antropologia, cultura e educação',6,'Erro comum','Tratar cultura como conjunto fixo de tradições que determina completamente o comportamento. Culturas são dinâmicas, disputadas e transformadas nas relações.'),
('Antropologia e Educação','Antropologia, cultura e educação',7,'Aprofundamento','Lopes mostra que a interlocução entre Antropologia e Educação envolve diversidade cultural, mediações e mudanças nos processos de socialização escolar. citeturn569857search0turn569857search1'),
('Antropologia e Educação','Antropologia, cultura e educação',8,'Aplicação pedagógica','Ao planejar uma prática, investigue quais repertórios culturais dos estudantes aparecem, quais ficam invisíveis e como todos poderão participar sem estereótipos.'),
('Antropologia e Educação','Antropologia, cultura e educação',9,'Síntese','A contribuição antropológica amplia a compreensão da educação ao relacioná-la a cultura, diferença, relações e contextos de vida.'),
('Antropologia e Educação','Antropologia, cultura e educação',10,'Para revisar','Explique por que a cultura deve ser considerada na análise de uma situação escolar.'),
('Antropologia e Educação','Cultura e aprendizagem',1,'Conceito central','Aprendizagem ocorre em ambientes culturalmente organizados. A maneira como uma pessoa participa, comunica-se e atribui sentido às atividades está relacionada às experiências sociais que traz para a escola.'),
('Antropologia e Educação','Cultura e aprendizagem',2,'Aprender em contextos coletivos','A Antropologia chama atenção para processos de aprendizagem que acontecem nas relações com outros sujeitos, práticas e instituições.'),
('Antropologia e Educação','Cultura e aprendizagem',3,'Escola como mediação','A escola seleciona linguagens, regras e práticas que mediam o encontro entre diferentes experiências culturais e conhecimentos escolares.'),
('Antropologia e Educação','Cultura e aprendizagem',4,'Exemplo para visualizar','Uma atividade de leitura pode mobilizar repertórios familiares diferentes. A mediação do professor ajuda a conectar o conhecimento que o aluno já possui ao novo conteúdo.'),
('Antropologia e Educação','Cultura e aprendizagem',5,'Situação para analisar','Estudantes demonstram maneiras distintas de participar de uma mesma atividade. Em vez de classificar rapidamente essas formas como “boas” ou “ruins”, investigue o que cada uma significa no contexto.'),
('Antropologia e Educação','Cultura e aprendizagem',6,'Erro comum','Supor que ensinar é simplesmente retirar conhecimentos prévios e substituí-los pelo conhecimento escolar.'),
('Antropologia e Educação','Cultura e aprendizagem',7,'Aprofundamento','Lopes analisa mudanças nas mediações culturais e como a escola participa de processos contemporâneos de socialização e institucionalização. citeturn569857search1'),
('Antropologia e Educação','Cultura e aprendizagem',8,'Aplicação pedagógica','Antes de planejar uma intervenção, pense em quais experiências os estudantes podem mobilizar e como a atividade pode criar pontes entre repertórios.'),
('Antropologia e Educação','Cultura e aprendizagem',9,'Síntese','Cultura e aprendizagem se relacionam porque toda aprendizagem acontece em práticas e relações socialmente organizadas.'),
('Antropologia e Educação','Cultura e aprendizagem',10,'Para revisar','Dê um exemplo de como um conhecimento cultural prévio pode ajudar uma criança a aprender um conteúdo escolar.'),
('Antropologia e Educação','Identidade, diferença e alteridade',1,'Conceito central','Identidade é construída nas relações sociais e envolve pertencimentos, reconhecimento e diferenciação. Alteridade significa considerar o outro como outro, não como versão incompleta de um padrão.'),
('Antropologia e Educação','Identidade, diferença e alteridade',2,'Diferença não é déficit','Diferenças culturais, linguísticas e sociais não são, por si, problemas pedagógicos. O desafio é evitar que diferenças sejam convertidas em inferiorização ou exclusão.'),
('Antropologia e Educação','Identidade, diferença e alteridade',3,'Reconhecimento na escola','Currículo e práticas escolares produzem formas de reconhecimento. O que é representado, valorizado ou silenciado contribui para a experiência de pertencimento dos estudantes.'),
('Antropologia e Educação','Identidade, diferença e alteridade',4,'Exemplo para visualizar','Um material didático apresenta somente um tipo de família, de sotaque ou de experiência cultural como normal. A representação limitada produz uma visão estreita sobre quem pertence à escola.'),
('Antropologia e Educação','Identidade, diferença e alteridade',5,'Situação para analisar','Um professor interpreta um comportamento culturalmente diferente como falta de educação. Analise como alteridade e conhecimento do contexto poderiam mudar a leitura da situação.'),
('Antropologia e Educação','Identidade, diferença e alteridade',6,'Erro comum','Celebrar “diversidade” apenas com atividades pontuais, sem revisar práticas institucionais que continuam produzindo exclusão.'),
('Antropologia e Educação','Identidade, diferença e alteridade',7,'Aprofundamento','Freitas discute, na interface entre Antropologia e Educação, desafios relacionados à educação indígena, discriminação contra mulheres e pessoas LGBTT e preconceito contra práticas culturais e religiosas afro-brasileiras. citeturn569857search2turn569857search3'),
('Antropologia e Educação','Identidade, diferença e alteridade',8,'Aplicação pedagógica','Ao analisar materiais, linguagem e práticas, pergunte quem aparece, quem fala, quem é representado e que diferenças são tratadas como problema.'),
('Antropologia e Educação','Identidade, diferença e alteridade',9,'Síntese','Alteridade exige deslocar o olhar do “normal” como medida universal e aprender a interpretar diferenças em seus contextos sociais e culturais.'),
('Antropologia e Educação','Identidade, diferença e alteridade',10,'Para revisar','Explique a diferença entre reconhecer uma diferença e transformar essa diferença em desigualdade.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',1,'Conceito central','Diversidade cultural significa convivência de diferentes modos de vida, linguagens, memórias, valores e pertencimentos. Na escola, essa diversidade aparece em relações cotidianas e não somente em eventos temáticos.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',2,'Diversidade como realidade institucional','A escola contemporânea reúne sujeitos com experiências culturais variadas. Isso produz trocas, negociações, conflitos e novas mediações.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',3,'Estereótipos e preconceitos','Estereótipos simplificam grupos e podem sustentar preconceitos. A análise antropológica procura compreender como essas representações são produzidas e circulam.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',4,'Exemplo para visualizar','Uma representação única de comunidades indígenas, religiões afro-brasileiras ou famílias pode apagar diversidade interna e reforçar generalizações.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',5,'Situação para analisar','Um conteúdo escolar apresenta um grupo cultural apenas por traços folclóricos. Analise o que foi simplificado e quais conhecimentos poderiam ampliar a representação.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',6,'Erro comum','Confundir valorização da diversidade com coleção de informações folclóricas sobre grupos. O desafio é compreender pessoas, histórias e relações sem reduzir identidades.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',7,'Aprofundamento','Os estudos antropológicos sobre educação analisam racialização, questões indígenas, gênero, cultura afro-brasileira, cotidiano escolar e produção das diferenças identitárias. citeturn569857search0turn569857search2'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',8,'Aplicação pedagógica','Diversifique autores, fontes, exemplos e perspectivas curriculares. Observe também como regras e interações distribuem oportunidades de participação.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',9,'Síntese','Diversidade cultural exige mais que presença de diferenças: requer condições de reconhecimento, participação e aprendizagem sem estereotipação.'),
('Antropologia e Educação','Diversidade cultural nos espaços educativos',10,'Para revisar','Escolha um exemplo de diversidade cultural na escola e descreva como uma prática pedagógica pode acolhê-lo de modo não estereotipado.'),
('Antropologia e Educação','Educação e contextos socioculturais',1,'Conceito central','Contexto sociocultural reúne condições históricas, econômicas, territoriais, institucionais e culturais que influenciam como as experiências educativas acontecem.'),
('Antropologia e Educação','Educação e contextos socioculturais',2,'Por que contexto importa','Uma mesma prática pode produzir resultados diferentes em contextos diferentes. Analisar contexto não significa dizer que ele determina automaticamente o que cada pessoa fará.'),
('Antropologia e Educação','Educação e contextos socioculturais',3,'Olhar etnográfico','A etnografia privilegia observação cuidadosa das práticas e dos significados atribuídos pelos próprios participantes, buscando compreender o cotidiano a partir do contexto.'),
('Antropologia e Educação','Educação e contextos socioculturais',4,'Exemplo para visualizar','Uma rotina de reunião escolar pode parecer participativa em um documento, mas apresentar baixa participação real. Observar interações permite identificar como a participação ocorre de fato.'),
('Antropologia e Educação','Educação e contextos socioculturais',5,'Situação para analisar','Uma intervenção planejada em outra escola não funciona no novo contexto. Investigue diferenças de público, cultura institucional, recursos, relações e expectativas antes de concluir que a estratégia “não funciona”.'),
('Antropologia e Educação','Educação e contextos socioculturais',6,'Erro comum','Importar uma prática pedagógica pronta sem investigar o contexto onde ela será utilizada.'),
('Antropologia e Educação','Educação e contextos socioculturais',7,'Aprofundamento','Lopes usa a categoria mediação para interpretar mudanças estruturais e seus desdobramentos no processo de socialização escolar. citeturn569857search1'),
('Antropologia e Educação','Educação e contextos socioculturais',8,'Aplicação pedagógica','Antes de intervir, faça diagnóstico contextual: quem são os participantes, que relações existem, quais práticas já funcionam, quais barreiras aparecem e quais recursos estão disponíveis.'),
('Antropologia e Educação','Educação e contextos socioculturais',9,'Síntese','Compreender educação exige conectar práticas locais a contextos socioculturais mais amplos. O contexto ajuda a explicar como significados e relações se produzem.'),
('Antropologia e Educação','Educação e contextos socioculturais',10,'Para revisar','Escolha uma situação escolar e escreva três elementos do contexto sociocultural que precisam ser conhecidos antes de propor uma intervenção.')
)
UPDATE public.material_sections ms
SET title=s.title, content=s.content, section_type=CASE s.position WHEN 1 THEN 'concept' WHEN 2 THEN 'explanation' WHEN 3 THEN 'explanation' WHEN 4 THEN 'examples' WHEN 5 THEN 'examples' WHEN 6 THEN 'common_mistakes' WHEN 7 THEN 'deepening' WHEN 8 THEN 'deepening' WHEN 9 THEN 'review' ELSE 'review' END
FROM seed s,public.materials m,public.topics t,public.disciplines d
WHERE ms.material_id=m.id AND m.topic_id=t.id AND t.discipline_id=d.id
AND d.name=s.discipline_name AND t.name=s.topic_name AND ms.position=s.position AND m.status='draft';

insert into public.material_citations(material_id,source_id,citation_label)
select m.id,x.sid,'Fonte de estudo'
from public.materials m join public.topics t on t.id=m.topic_id join public.disciplines d on d.id=t.discipline_id
join (values
('Antropologia e Educação','00000000-0000-0000-0000-000000000037'::uuid),
('Antropologia e Educação','00000000-0000-0000-0000-000000000038'::uuid)
) x(discipline_name,sid) on x.discipline_name=d.name
where not exists(select 1 from public.material_citations mc where mc.material_id=m.id and mc.source_id=x.sid);

insert into public.topic_sources(topic_id,source_id,role,status)
select t.id,x.sid,'COMPLEMENTAR','APPROVED'
from public.topics t join public.disciplines d on d.id=t.discipline_id
join (values
('Antropologia e Educação','00000000-0000-0000-0000-000000000037'::uuid),
('Antropologia e Educação','00000000-0000-0000-0000-000000000038'::uuid)
) x(discipline_name,sid) on x.discipline_name=d.name
on conflict do nothing;