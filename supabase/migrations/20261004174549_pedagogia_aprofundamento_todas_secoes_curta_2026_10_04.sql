
with base as (
 select ms.id,ms.position,ms.title,ms.content,d.name discipline,m.title material_title
 from public.material_sections ms
 join public.materials m on m.id=ms.material_id
 join public.topics t on t.id=m.topic_id
 join public.disciplines d on d.id=t.discipline_id
 where length(coalesce(ms.content,''))<300
   and coalesce(ms.content,'') not like '%[APROFUNDAMENTO-PEDAGOGIA-2026]%'
),
lens as (
 select *,
 case
 when discipline ilike any(array['%Educação Indígena%','%Educação Quilombola%','%Educação do Campo%','%Relações Étnico-Raciais%'])
 then case position
  when 1 then 'Nesse campo, o conceito precisa ser lido a partir da especificidade histórica, territorial e sociocultural dos sujeitos, evitando transformar diversidade em mero exemplo ilustrativo.'
  when 2 then 'É importante distinguir reconhecimento da diferença de folclorização: uma abordagem pedagógica consistente considera conhecimentos, línguas, memórias, formas de organização e participação comunitária.'
  when 3 then 'As escolhas curriculares não são neutras. Elas definem quais conhecimentos ganham legitimidade e como os estudantes podem se reconhecer como sujeitos de direito e produtores de conhecimento.'
  when 4 then 'Na prática, planejamento e materiais precisam dialogar com o contexto e com os sujeitos envolvidos. A participação da comunidade é parte da qualidade pedagógica, não um elemento decorativo.'
  when 5 then 'A análise deve considerar território, identidade, relações de poder e condições concretas de escolarização. Isso evita aplicar modelos homogêneos a realidades educacionais distintas.'
  when 6 then 'A avaliação deve respeitar processos próprios de aprendizagem e produzir evidências úteis para reorientar a prática, sem reduzir o estudante a uma medida descontextualizada.'
  when 7 then 'Equidade implica remover barreiras e reconhecer direitos sem apagar especificidades. A pergunta pedagógica central é como garantir participação e aprendizagem preservando identidade e autonomia.'
  when 8 then 'O tema se articula a currículo, formação docente, gestão e políticas públicas. Essa articulação ajuda a perceber que práticas interculturais dependem também de condições institucionais.'
  when 9 then 'Uma leitura crítica deve evitar generalizações sobre povos e comunidades. Afirmações precisam ser contextualizadas e, quando possível, sustentadas por documentos normativos, pesquisas e conhecimentos produzidos pelos próprios sujeitos.'
  else 'Dominar o tema significa explicar seus fundamentos, reconhecer sua especificidade no contexto brasileiro e justificar escolhas pedagógicas que combinem direito à educação, participação, identidade e produção de conhecimento.'
 end
 when discipline ilike any(array['%Educação Especial%','%Educação Inclusiva%','%Libras%'])
 then case position
  when 1 then 'O ponto de partida é o direito à participação e à aprendizagem. A análise deve distinguir impedimentos pessoais das barreiras produzidas por ambientes, práticas, comunicação e materiais.'
  when 2 then 'É necessário diferenciar acessibilidade, apoio pedagógico, tecnologia assistiva, adaptação e atendimento especializado. São respostas relacionadas, mas não equivalentes.'
  when 3 then 'A inclusão acontece no cotidiano do ensino comum e depende de planejamento, recursos, comunicação acessível e articulação entre profissionais. O apoio especializado não substitui a escolarização.'
  when 4 then 'Uma decisão pedagógica inclusiva começa identificando a barreira, não presumindo incapacidade. Em seguida, define-se o apoio necessário e verifica-se se ele ampliou acesso, participação e aprendizagem.'
  when 5 then 'Critérios de avaliação precisam permitir diferentes formas de demonstração da aprendizagem quando isso for necessário para eliminar barreiras, sem abandonar os objetivos educacionais.'
  when 6 then 'O acompanhamento deve registrar avanços, barreiras e respostas aos apoios. Evidência de inclusão não é apenas presença física, mas possibilidade real de participar e aprender.'
  when 7 then 'Uma perspectiva anticapacitista evita expectativas reduzidas baseadas em diagnósticos. O foco pedagógico deve permanecer nas possibilidades de aprendizagem e nas condições oferecidas.'
  when 8 then 'Currículo, acessibilidade e avaliação formam um sistema: alterar somente um elemento pode não resolver a barreira. O planejamento precisa considerar essa coerência.'
  when 9 then 'A análise crítica deve questionar práticas segregadoras e soluções padronizadas. Apoios devem ser individualizados quando necessário, mas inseridos em uma proposta educacional comum e inclusiva.'
  else 'Dominar o tema significa reconhecer direitos, identificar barreiras, escolher apoios justificáveis e acompanhar seus efeitos, articulando inclusão, acessibilidade, currículo, ensino e avaliação.'
 end
 when discipline ilike any(array['%Estágio Curricular%','%Seminário Integrador%'])
 then case position
  when 1 then 'O estágio deve ser compreendido como espaço formativo de investigação e reflexão sobre a prática, e não apenas como cumprimento de carga horária.'
  when 2 then 'Observar exige foco e registro: descrever o que ocorreu é diferente de interpretar por que ocorreu. Essa distinção fortalece a qualidade da reflexão profissional.'
  when 3 then 'A relação teoria-prática é construída quando conceitos ajudam a formular perguntas sobre situações reais e, depois, quando a experiência permite revisar compreensões teóricas.'
  when 4 then 'Planejar uma intervenção exige diagnóstico, objetivos claros, estratégias, recursos e critérios de acompanhamento. A proposta deve ser ajustável diante das respostas observadas.'
  when 5 then 'Registros profissionais ganham valor quando preservam contexto, evidências e autoria, evitando julgamentos precipitados sobre estudantes, professores ou instituições.'
  when 6 then 'A avaliação da experiência deve considerar processos e evidências, não apenas impressão pessoal. Perguntas sobre resultados, participação e limites tornam a reflexão mais rigorosa.'
  when 7 then 'A dimensão ética envolve sigilo, respeito aos sujeitos, responsabilidade no uso de registros e reconhecimento dos limites de atuação do estagiário.'
  when 8 then 'O trabalho articula conhecimentos de didática, currículo, avaliação, desenvolvimento, políticas e contexto institucional. Essa integração é parte central da formação pedagógica.'
  when 9 then 'Uma leitura crítica da prática deve reconhecer contradições sem transformar um episódio em diagnóstico definitivo. A experiência é evidência situada, que precisa ser analisada com outras referências.'
  else 'Dominar o tema significa transformar experiência em conhecimento profissional: observar, registrar, interpretar, intervir, avaliar e revisar decisões com fundamentação pedagógica.'
 end
 when discipline ilike any(array['%Metodologia Científica%','%Pesquisa em Educação%','%Trabalho de Conclusão%'])
 then case position
  when 1 then 'Um problema de pesquisa precisa ser delimitado de modo que possa ser investigado. Tema amplo, problema, pergunta e objetivo são elementos relacionados, mas cumprem funções diferentes.'
  when 2 then 'A revisão de literatura não serve apenas para reunir citações: ela identifica conceitos, debates, lacunas e diferentes interpretações relevantes para o problema.'
  when 3 then 'A escolha metodológica deve decorrer da pergunta e do tipo de evidência necessário. Método não é preferência pessoal nem sinônimo de uma única técnica de coleta.'
  when 4 then 'Em pesquisa qualitativa, contexto, interpretação e transparência analítica são centrais; em pesquisa quantitativa, medidas, variáveis, amostragem e análise precisam ser coerentes com a pergunta.'
  when 5 then 'Pesquisas de métodos mistos exigem integração real entre os componentes qualitativo e quantitativo. Somar dois conjuntos de dados sem articulá-los não produz automaticamente uma abordagem mista rigorosa.'
  when 6 then 'A ética atravessa desenho, coleta, armazenamento, análise e divulgação. Consentimento, confidencialidade, proteção de participantes e uso responsável de dados são partes do método.'
  when 7 then 'Qualidade envolve coerência entre problema, referencial, método, análise e conclusão. Uma pesquisa pode ter dados abundantes e ainda assim apresentar inferências frágeis se esses elementos não estiverem alinhados.'
  when 8 then 'A escrita acadêmica deve separar descrição de interpretação e resultado de conclusão. Afirmações precisam corresponder ao que os dados permitem sustentar.'
  when 9 then 'A leitura crítica de estudos exige atenção a desenho, limitações, contexto e qualidade da evidência. Um resultado isolado não deve ser tratado como verdade universal.'
  else 'Dominar o tema significa conseguir formular uma pergunta investigável, justificar escolhas metodológicas, produzir evidências com ética e comunicar conclusões proporcionais aos dados.'
 end
 when discipline ilike any(array['%Avaliação%','%Estatística%'])
 then case position
  when 1 then 'Avaliar é produzir informação para tomar decisões pedagógicas. Por isso, conceito, finalidade, instrumento, critério e uso do resultado precisam ser distinguidos.'
  when 2 then 'Uma medida só ganha significado quando há uma variável definida e uma regra de interpretação. Número, indicador e julgamento pedagógico não são sinônimos.'
  when 3 then 'Validade e coerência importam: um instrumento deve produzir evidências relacionadas ao que se pretende conhecer. Formato ou facilidade de aplicação não garantem qualidade.'
  when 4 then 'A interpretação precisa considerar contexto, distribuição dos dados e possíveis fontes de erro. Médias e percentuais podem esconder diferenças importantes entre grupos ou situações.'
  when 5 then 'Avaliação formativa depende do uso da evidência durante o processo. Coletar informação sem devolutiva ou reorientação do ensino reduz sua função pedagógica.'
  when 6 then 'Critérios explícitos tornam o julgamento mais consistente e permitem que estudantes compreendam o que está sendo valorizado. Critérios vagos favorecem decisões instáveis.'
  when 7 then 'Dados educacionais exigem leitura ética. Indicadores não devem ser usados para rotular estudantes ou escolas sem considerar contexto, desigualdades e finalidade da medida.'
  when 8 then 'A análise combina evidência e interpretação. O profissional precisa explicar o que os dados mostram, o que não mostram e quais decisões são justificáveis a partir deles.'
  when 9 then 'Uma leitura crítica evita confundir correlação com causa ou resultado de avaliação com explicação completa da aprendizagem. Limitações e incertezas fazem parte da interpretação responsável.'
  else 'Dominar o tema significa produzir, interpretar e utilizar evidências com critérios claros, reconhecendo limites das medidas e conectando avaliação a decisões pedagógicas.'
 end
 when discipline ilike any(array['%Educação Infantil%','%Metodologias da Educação Infantil%','%Infâncias%','%Literatura Infantil%'])
 then case position
  when 1 then 'Na educação das infâncias, a criança deve ser considerada sujeito de direitos, com formas próprias de expressão, participação e produção de sentidos.'
  when 2 then 'Brincadeira, interação, linguagem, corpo e exploração não são apenas recursos para preencher tempo: constituem experiências por meio das quais as crianças aprendem e se desenvolvem.'
  when 3 then 'Planejar implica organizar tempos, espaços, materiais e relações, preservando possibilidades de escolha e investigação. Uma rotina educativa precisa combinar previsibilidade e abertura.'
  when 4 then 'A observação pedagógica deve registrar ações, falas, interações e estratégias das crianças, evitando interpretações precipitadas baseadas em um único episódio.'
  when 5 then 'A intervenção do adulto precisa ampliar possibilidades sem substituir a iniciativa infantil. Perguntas, materiais e organização do ambiente podem favorecer exploração e linguagem.'
  when 6 then 'Avaliar na infância não significa antecipar classificações escolares. O acompanhamento deve produzir conhecimento sobre processos e orientar novas experiências.'
  when 7 then 'Equidade exige reconhecer diferentes repertórios culturais, linguísticos, corporais e familiares sem transformar diferenças em déficits.'
  when 8 then 'Literatura, arte, movimento e brincadeira podem integrar experiências, mas cada linguagem possui especificidades que merecem ser preservadas no planejamento.'
  when 9 then 'Uma leitura crítica deve evitar práticas escolarizantes precoces que reduzam a infância a treino de conteúdos, assim como evitar uma concepção de espontaneidade que abandone a intencionalidade pedagógica.'
  else 'Dominar o tema significa compreender direitos e processos infantis e transformar esse conhecimento em ambientes, interações e experiências planejadas, observadas e continuamente reorientadas.'
 end
 when discipline ilike any(array['%Filosofia da Educação%','%Fundamentos da Educação%','%Sociologia da Educação%','%Antropologia e Educação%'])
 then case position
  when 1 then 'O conceito precisa ser situado como problema educacional e não apenas como definição. Perguntar por suas premissas ajuda a revelar diferentes concepções de ser humano, sociedade, conhecimento e formação.'
  when 2 then 'Conceitos próximos podem esconder divergências importantes. A análise filosófica e social ganha rigor quando explicita argumentos, pressupostos e consequências de cada posição.'
  when 3 then 'A educação é prática histórica e social: instituições, relações, cultura e desigualdades interferem no que é ensinado e em quem tem acesso a diferentes formas de conhecimento.'
  when 4 then 'Uma situação educativa pode ser interpretada por mais de uma lente teórica. O estudante precisa aprender a justificar a lente escolhida, em vez de tratá-la como explicação automática.'
  when 5 then 'Teoria e prática não são blocos separados. Conceitos orientam perguntas sobre a realidade e a experiência concreta também pode revelar limites de determinadas explicações.'
  when 6 then 'A análise crítica deve considerar relações de poder e processos de socialização, sem reduzir toda prática educativa a uma única causa social.'
  when 7 then 'Diferenças sociais não devem ser confundidas com déficits individuais. Uma leitura pedagógica responsável pergunta como instituições e contextos produzem oportunidades desiguais.'
  when 8 then 'As teorias estudadas se conectam a currículo, escola, formação e políticas. Essas conexões ajudam a compreender por que escolhas pedagógicas carregam valores e finalidades.'
  when 9 then 'O pensamento crítico exige reconstruir argumentos antes de concordar ou discordar. Identificar evidências, pressupostos e implicações é mais rigoroso do que apenas classificar uma ideia como certa ou errada.'
  else 'Dominar o tema significa argumentar sobre educação com conceitos precisos, reconhecer diferentes perspectivas e avaliar suas consequências para formação humana e prática pedagógica.'
 end
 else case position
  when 1 then 'O conceito central deve ser definido com precisão e relacionado ao problema pedagógico que procura explicar. Isso evita transformar o estudo em uma sequência de definições isoladas.'
  when 2 then 'Uma compreensão robusta diferencia conceitos próximos e explicita relações entre eles. Essa precisão é necessária para justificar escolhas pedagógicas.'
  when 3 then 'O tema precisa ser situado em seu contexto histórico, social e institucional, pois práticas educativas não funcionam de maneira idêntica em todos os territórios e grupos.'
  when 4 then 'Na prática, o conhecimento deve orientar decisões observáveis: objetivos, estratégias, recursos, formas de participação e evidências que permitam acompanhar o processo.'
  when 5 then 'A análise pedagógica ganha rigor quando utiliza critérios explícitos para examinar práticas, em vez de depender apenas de impressão pessoal ou de receitas prontas.'
  when 6 then 'Evidências de aprendizagem ou participação devem ser interpretadas e usadas para reorientar o ensino. Coletar dados sem decidir como eles serão utilizados reduz seu valor formativo.'
  when 7 then 'A perspectiva da equidade exige perguntar quais barreiras existem, quem é afetado por elas e quais condições podem ampliar acesso, participação e aprendizagem.'
  when 8 then 'O tema se articula a currículo, ensino, avaliação, desenvolvimento e contexto. Explicitar essas relações ajuda a construir uma visão sistêmica da prática pedagógica.'
  when 9 then 'Uma leitura crítica reconhece limites, contradições e condições de validade. Soluções pedagógicas precisam ser justificáveis e revisáveis diante de novas evidências.'
  else 'Dominar o tema significa explicar, diferenciar, aplicar e avaliar o conhecimento em situações novas, articulando fundamentos teóricos, contexto e decisões pedagógicas.'
 end
 end || ' [APROFUNDAMENTO-PEDAGOGIA-2026]' extra
 from base
)
update public.material_sections ms
set content=trim(ms.content)||E'\n\n'||lens.extra,
    updated_at=now()
from lens
where ms.id=lens.id;
