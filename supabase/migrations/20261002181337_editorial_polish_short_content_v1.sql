
begin;

update public.materials m
set introduction = case t.name
  when 'Planejamento e execução de projetos' then
    'Projetos de estágio articulam diagnóstico, objetivos, ações, acompanhamento e avaliação. O estudo relaciona experiência, conhecimento e responsabilidade profissional, levando o estudante a observar contexto, decisões, recursos e evidências do projeto.'
  when 'Aprofundamento da atuação profissional' then
    'Etapas avançadas ampliam autonomia, responsabilidade e capacidade de justificar decisões pedagógicas. O estudo aproxima experiência e conhecimento profissional, com atenção ao contexto, aos sujeitos, às decisões e às evidências da atuação.'
  when 'Relações étnico-raciais e escola' then
    'A educação quilombola se articula à educação das relações étnico-raciais e ao enfrentamento do racismo. O estudo parte desse contexto para relacionar conceitos, sujeitos, processos, evidências e práticas escolares.'
  when 'Problemas reais da prática pedagógica' then
    'Problemas concretos mobilizam conhecimentos de currículo, didática, avaliação, gestão e relações sociais. O estudo busca relacionar experiência, conhecimento e responsabilidade profissional a decisões tomadas em situações reais da prática.'
  when 'Integração entre fundamentos e prática' then
    'O futuro pedagogo deve relacionar fundamentos teóricos a decisões e problemas vividos no campo profissional. O estudo parte dessa articulação para observar contexto, sujeitos, decisões, recursos e evidências da prática.'
  when 'Papel do coordenador pedagógico' then
    'O papel do coordenador pedagógico envolve diferenciar apoio formativo de fiscalização do professor. O estudo considera como objetivos educacionais, responsabilidades, práticas profissionais e condições institucionais se relacionam no cotidiano escolar.'
  when 'Registro e análise da prática' then
    'Diários, relatórios e outros registros transformam experiências em material de análise e reflexão profissional. O estudo ajuda a relacionar experiência, conhecimento e responsabilidade profissional a registros, decisões e evidências da prática.'
  when 'Atuação em contextos educacionais diversos' then
    'Experiências em diferentes contextos ampliam o entendimento sobre possibilidades e limites da atuação do pedagogo. O estudo relaciona experiência, conhecimento e responsabilidade profissional, observando sujeitos, decisões, recursos e evidências.'
  when 'Projeto de intervenção' then
    'Um projeto de intervenção define problema, objetivo, estratégia, acompanhamento, recursos e critérios de avaliação. O estudo relaciona esses elementos à experiência e à responsabilidade profissional, com atenção ao contexto e às evidências do processo.'
  when 'Integração dos fundamentos da formação' then
    'A integração curricular relaciona fundamentos, conhecimentos específicos, prática, pesquisa e reflexão profissional. O estudo ajuda a conectar esses elementos à experiência e à responsabilidade profissional, observando decisões, contexto e evidências.'
  when 'Síntese e reflexão profissional' then
    'A síntese formativa identifica aprendizagens consolidadas, lacunas e próximos passos de desenvolvimento profissional. O estudo relaciona experiência, conhecimento e responsabilidade profissional a registros, decisões e evidências que sustentam essa reflexão.'
  when 'Transição para a atuação profissional' then
    'A conclusão do estágio deve favorecer autonomia para continuar aprendendo e refletindo sobre a prática profissional. O estudo articula experiência, conhecimento e responsabilidade, considerando decisões, contexto e evidências produzidas no percurso.'
  when 'Reflexão profissional baseada em evidências' then
    'A reflexão profissional ganha qualidade quando se apoia em registros, produções e observações, e não apenas em memória. O estudo ajuda a relacionar essas evidências às experiências, decisões e responsabilidades do trabalho pedagógico.'
  when 'Participação em atividades pedagógicas' then
    'Participar permite compreender decisões e relações do trabalho pedagógico, respeitando orientação e limites de atuação. O estudo relaciona experiência, conhecimento e responsabilidade profissional, observando sujeitos, contexto, decisões e evidências.'
  else m.introduction
end
from public.topics t
where t.id = m.topic_id
  and m.status = 'published'
  and t.name in (
    'Planejamento e execução de projetos',
    'Aprofundamento da atuação profissional',
    'Relações étnico-raciais e escola',
    'Problemas reais da prática pedagógica',
    'Integração entre fundamentos e prática',
    'Papel do coordenador pedagógico',
    'Registro e análise da prática',
    'Atuação em contextos educacionais diversos',
    'Projeto de intervenção',
    'Integração dos fundamentos da formação',
    'Síntese e reflexão profissional',
    'Transição para a atuação profissional',
    'Reflexão profissional baseada em evidências',
    'Participação em atividades pedagógicas'
  );

update public.material_sections s
set title = case s.title
  when 'Conceito central' then 'Ideia central'
  when 'Pergunta orientadora' then 'Questão de partida'
  when 'Erro comum' then 'Erro frequente'
  when 'Para revisar' then 'Revisão ativa'
  else s.title
end,
content = regexp_replace(
  trim(s.content),
  '^Comece pela pergunta:\s*',
  '',
  'i'
)
from public.materials m
where m.id = s.material_id
  and m.status = 'published';

update public.material_sections s
set content = trim(s.content)
from public.materials m
where m.id = s.material_id
  and m.status = 'published';

commit;
