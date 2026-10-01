WITH seed(topic_name,position,title,content,section_type) AS (VALUES
('Conceitos fundamentais de educação',1,'Conceito central','Educação é um fenômeno amplo de formação humana.','concept'),
('Conceitos fundamentais de educação',2,'O que isso significa','A educação ocorre em diferentes relações e espaços; a educação escolar é uma forma institucional específica.','explanation'),
('Conceitos fundamentais de educação',3,'Relação com a Pedagogia','O conceito ajuda o pedagogo a distinguir educação, ensino e escolarização e a analisar suas relações.','explanation'),
('Conceitos fundamentais de educação',4,'Exemplo para visualizar','Aprender convivência em casa e estudar Ciências na escola são experiências formativas diferentes.','examples'),
('Conceitos fundamentais de educação',5,'Uma situação para analisar','Antes de escolher uma ação educativa, identifique sujeitos, contexto, finalidade e conhecimento envolvidos.','examples'),
('Conceitos fundamentais de educação',6,'Erro comum','Tratar educação, ensino e escolarização como sinônimos ou imaginar que só se aprende na escola.','common_mistakes'),
('Conceitos fundamentais de educação',7,'Aprofundamento','A LDB reconhece processos formativos na vida familiar, no trabalho, nas instituições e na cultura.','deepening'),
('Conceitos fundamentais de educação',8,'Aplicação pedagógica','Use a distinção entre educação e ensino para justificar por que uma atividade escolar exige intencionalidade.','deepening'),
('Conceitos fundamentais de educação',9,'Síntese','Educação é ampla; ensino é intencional; escolarização é organizada institucionalmente.','review'),
('Conceitos fundamentais de educação',10,'Para revisar','Explique os três termos com palavras próprias e dê um exemplo de cada.','review'),
('Educação, sociedade e cultura',1,'Conceito central','Educação acontece em relações sociais e culturais.','concept'),
('Educação, sociedade e cultura',2,'O que isso significa','Valores, linguagens e conhecimentos atravessam as práticas educativas.','explanation'),
('Educação, sociedade e cultura',3,'Relação com a Pedagogia','Currículo, escola e ensino expressam escolhas e relações sociais.','explanation'),
('Educação, sociedade e cultura',4,'Exemplo para visualizar','Trazer histórias e referências culturais da comunidade para a escola amplia repertórios.','examples'),
('Educação, sociedade e cultura',5,'Uma situação para analisar','Observe quem aparece no currículo e quais formas de participação são estimuladas.','examples'),
('Educação, sociedade e cultura',6,'Erro comum','Pensar que a escola apenas reproduz a sociedade ou que consegue transformá-la sozinha.','common_mistakes'),
('Educação, sociedade e cultura',7,'Aprofundamento','Compare duas práticas e identifique diferenças culturais, sociais e formativas.','deepening'),
('Educação, sociedade e cultura',8,'Aplicação pedagógica','Pergunte quais conhecimentos culturais estão presentes e quem é reconhecido como participante.','deepening'),
('Educação, sociedade e cultura',9,'Síntese','Sociedade e cultura atravessam a educação, e práticas educativas também podem produzir mudanças.','review'),
('Educação, sociedade e cultura',10,'Para revisar','Dê um exemplo de como uma prática escolar pode reproduzir e transformar aspectos sociais.','review'),
('Concepções pedagógicas',1,'Conceito central','Concepções pedagógicas são formas amplas de compreender educação e ensino.','concept'),
('Concepções pedagógicas',2,'O que isso significa','Elas articulam finalidades, conhecimento, sujeito, professor e organização da aprendizagem.','explanation'),
('Concepções pedagógicas',3,'Relação com a Pedagogia','Conhecer concepções ajuda a analisar práticas sem transformá-las em receitas.','explanation'),
('Concepções pedagógicas',4,'Exemplo para visualizar','O mesmo trabalho em grupo pode ter finalidades e mediações diferentes.','examples'),
('Concepções pedagógicas',5,'Uma situação para analisar','Observe finalidade, participação dos estudantes, papel do professor e uso do conhecimento.','examples'),
('Concepções pedagógicas',6,'Erro comum','Identificar uma concepção apenas pelo nome da atividade ou da técnica usada.','common_mistakes'),
('Concepções pedagógicas',7,'Aprofundamento','Compare duas aulas e procure diferenças na finalidade e na relação pedagógica.','deepening'),
('Concepções pedagógicas',8,'Aplicação pedagógica','Registre evidências de como uma aula entende ensinar e aprender antes de classificá-la.','deepening'),
('Concepções pedagógicas',9,'Síntese','Técnicas não bastam para identificar concepções; é preciso analisar fundamentos e contexto.','review'),
('Concepções pedagógicas',10,'Para revisar','Explique por que uma atividade isolada não revela toda uma concepção pedagógica.','review'),
('Finalidades e funções da educação',1,'Conceito central','Finalidades indicam por que educar e orientam decisões pedagógicas.','concept'),
('Finalidades e funções da educação',2,'O que isso significa','A educação envolve formação, cidadania, conhecimentos e relação com o trabalho.','explanation'),
('Finalidades e funções da educação',3,'Relação com a Pedagogia','Currículo e ensino ganham sentido quando conectados a finalidades formativas.','explanation'),
('Finalidades e funções da educação',4,'Exemplo para visualizar','Ler criticamente informações pode desenvolver conhecimento e participação social.','examples'),
('Finalidades e funções da educação',5,'Uma situação para analisar','Pergunte qual contribuição uma atividade oferece ao desenvolvimento e à cidadania.','examples'),
('Finalidades e funções da educação',6,'Erro comum','Confundir finalidade da educação com uma simples lista de conteúdos.','common_mistakes'),
('Finalidades e funções da educação',7,'Aprofundamento','A LDB articula pleno desenvolvimento, cidadania e qualificação para o trabalho.','deepening'),
('Finalidades e funções da educação',8,'Aplicação pedagógica','Relacione uma atividade concreta a uma finalidade educativa mais ampla.','deepening'),
('Finalidades e funções da educação',9,'Síntese','Finalidades ajudam a orientar currículo, ensino, avaliação e organização escolar.','review'),
('Finalidades e funções da educação',10,'Para revisar','Explique como uma mesma atividade pode contribuir para mais de uma finalidade educativa.','review'),
('Educação, escola e formação humana',1,'Conceito central','A escola é instituição específica dentro do fenômeno educativo.','concept'),
('Educação, escola e formação humana',2,'O que isso significa','Ela organiza experiências de aprendizagem sistemáticas e intencionais.','explanation'),
('Educação, escola e formação humana',3,'Relação com a Pedagogia','A atuação do pedagogo articula conhecimento, ensino, convivência, gestão e reflexão sobre a prática.','explanation'),
('Educação, escola e formação humana',4,'Exemplo para visualizar','Uma aula de História pode unir conteúdo, análise de fontes e argumentação.','examples'),
('Educação, escola e formação humana',5,'Uma situação para analisar','Identifique quais aprendizagens e experiências de participação uma proposta escolar cria.','examples'),
('Educação, escola e formação humana',6,'Erro comum','Pensar que formação humana significa abandonar conhecimentos sistemáticos.','common_mistakes'),
('Educação, escola e formação humana',7,'Aprofundamento','As diretrizes de Pedagogia contemplam docência, gestão e produção de conhecimento.','deepening'),
('Educação, escola e formação humana',8,'Aplicação pedagógica','Analise uma proposta escolar considerando conhecimento, participação e contexto institucional.','deepening'),
('Educação, escola e formação humana',9,'Síntese','Escola, conhecimento, ensino e formação humana podem ser trabalhados de forma articulada.','review'),
('Educação, escola e formação humana',10,'Para revisar','Explique por que a escola é específica sem ser o único espaço educativo.','review')
)
INSERT INTO public.material_sections(material_id,title,content,position,section_type)
SELECT m.id,seed.title,seed.content,seed.position,seed.section_type
FROM seed
JOIN public.topics t ON lower(t.name)=lower(seed.topic_name)
JOIN public.materials m ON m.topic_id=t.id AND lower(m.title)=lower(seed.topic_name)
JOIN public.disciplines d ON d.id=t.discipline_id
WHERE d.name='Fundamentos da Educação'
  AND NOT EXISTS (
    SELECT 1 FROM public.material_sections ms
    WHERE ms.material_id=m.id AND ms.position=seed.position
  );