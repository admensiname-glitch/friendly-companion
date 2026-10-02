-- Deepen Alfabetização I / Psicogênese da língua escrita.
-- Adds six application exercises while preserving existing published content.
do $$
declare
  v_topic_id uuid := 'c1000000-0000-4000-8000-000000000001';
  v_source_id uuid := 'b1000000-0000-4000-8000-000000000001';
begin
  if not exists (select 1 from public.topics where id=v_topic_id) then
    raise exception 'Tópico de Psicogênese não encontrado';
  end if;

  if not exists (select 1 from public.sources where id=v_source_id) then
    raise exception 'Fonte-base da Psicogênese não encontrada';
  end if;

  insert into public.exercises
    (id, topic_id, title, exercise_type, content, difficulty, source_id, position, published)
  select
    x.id, v_topic_id, x.title, 'application', x.content, x.difficulty, v_source_id, x.position, true
  from (
    values
      ('c1000000-0000-4000-8000-000000000041'::uuid,
       'Produção em movimento',
       'Analise uma produção infantil e identifique a decisão pedagógica mais informativa.',
       'medium', 3),
      ('c1000000-0000-4000-8000-000000000042'::uuid,
       'Diagnóstico longitudinal',
       'Use diferentes produções e situações para interpretar mudanças no conhecimento sobre a escrita.',
       'medium', 4),
      ('c1000000-0000-4000-8000-000000000043'::uuid,
       'Hipótese não é rótulo',
       'Diferencie uma hipótese de escrita de uma classificação fixa do estudante.',
       'easy', 5),
      ('c1000000-0000-4000-8000-000000000044'::uuid,
       'Intervenção intencional',
       'Transforme evidências da produção do aluno em uma próxima intervenção de ensino.',
       'medium', 6),
      ('c1000000-0000-4000-8000-000000000045'::uuid,
       'Conflito produtivo',
       'Reconheça situações em que comparar e explicar produções favorece a reconstrução do conhecimento.',
       'medium', 7),
      ('c1000000-0000-4000-8000-000000000046'::uuid,
       'Leitura crítica da psicogênese',
       'Identifique uma interpretação responsável das contribuições e dos limites da perspectiva psicogenética.',
       'hard', 8)
  ) as x(id,title,content,difficulty,position)
  where not exists (
    select 1 from public.exercises e
    where e.id=x.id or (e.topic_id=v_topic_id and e.title=x.title)
  );

  insert into public.exercise_questions
    (id, exercise_id, question_text, question_type, position, feedback_hint, difficulty_tag)
  select
    q.question_id,
    e.id,
    q.question_text,
    'multiple_choice',
    1,
    q.feedback_hint,
    q.difficulty_tag
  from (
    values
      ('c1000000-1000-4000-8000-000000000041'::uuid,
       'c1000000-0000-4000-8000-000000000041'::uuid,
       'Uma criança escreve duas palavras diferentes usando uma quantidade semelhante de letras. O professor quer compreender melhor o que ela está pensando. Qual ação é mais adequada?',
       'A análise de uma produção ganha força quando o professor investiga critérios usados pelo estudante e observa outras situações.',
       array['aplicacao','diagnostico']::text[]),
      ('c1000000-1000-4000-8000-000000000042'::uuid,
       'c1000000-0000-4000-8000-000000000042'::uuid,
       'Por que acompanhar várias produções de um mesmo estudante pode ser mais informativo do que observar apenas uma?',
       'Registros sucessivos ajudam a observar regularidades, mudanças e condições em que determinado raciocínio aparece.',
       array['diagnostico','analise']::text[]),
      ('c1000000-1000-4000-8000-000000000043'::uuid,
       'c1000000-0000-4000-8000-000000000043'::uuid,
       'Qual afirmação trata corretamente uma hipótese de escrita?',
       'Hipóteses servem como evidências provisórias para compreender o conhecimento em construção, não como rótulos permanentes.',
       array['conceito']::text[]),
      ('c1000000-1000-4000-8000-000000000044'::uuid,
       'c1000000-0000-4000-8000-000000000044'::uuid,
       'Depois de analisar produções de uma turma, a professora identifica dificuldade recorrente em relações entre fala e escrita. Qual resposta é mais coerente com o tópico?',
       'Diagnóstico e ensino podem trabalhar juntos: a evidência orienta uma intervenção sistemática e intencional.',
       array['aplicacao','intervencao']::text[]),
      ('c1000000-1000-4000-8000-000000000045'::uuid,
       'c1000000-0000-4000-8000-000000000045'::uuid,
       'Qual situação cria um problema produtivo sem abandonar a mediação docente?',
       'Comparar produções e pedir justificativas torna o objeto de conhecimento discutível sem retirar do professor a responsabilidade pelo planejamento.',
       array['analise','intervencao']::text[]),
      ('c1000000-1000-4000-8000-000000000046'::uuid,
       'c1000000-0000-4000-8000-000000000046'::uuid,
       'Qual leitura apresenta de forma mais responsável a contribuição da psicogênese da língua escrita para a formação docente?',
       'A perspectiva ajuda a interpretar como os estudantes pensam sobre a escrita, mas não deve ser reduzida a uma sequência rígida nem substituir o ensino sistemático.',
       array['analise','critica']::text[])
  ) as q(question_id,exercise_id,question_text,feedback_hint,difficulty_tag)
  join public.exercises e on e.id=q.exercise_id
  where not exists (
    select 1 from public.exercise_questions eq
    where eq.id=q.question_id
      or (eq.exercise_id=e.id and eq.position=1)
  );

  insert into public.exercise_options
    (id, question_id, content, is_correct, feedback_correct, feedback_incorrect, position)
  select o.id, o.question_id, o.content, o.is_correct, o.feedback_correct, o.feedback_incorrect, o.position
  from (
    values
      ('c1000000-2000-4000-8000-000000000041'::uuid,'c1000000-1000-4000-8000-000000000041'::uuid,'Tratar a escrita somente como erro e corrigi-la imediatamente.',false,null,'A análise precisa investigar o que a produção revela sobre o conhecimento do estudante.',1),
      ('c1000000-2000-4000-8000-000000000042'::uuid,'c1000000-1000-4000-8000-000000000041'::uuid,'Perguntar como a criança decidiu usar as letras e comparar a produção com outras palavras ou situações.',true,'Correto. A explicação do aluno e a comparação tornam visível o raciocínio em construção.',null,2),
      ('c1000000-2000-4000-8000-000000000043'::uuid,'c1000000-1000-4000-8000-000000000041'::uuid,'Classificar definitivamente a criança por essa única escrita.',false,null,'Uma produção isolada não deve virar classificação permanente.',3),
      ('c1000000-2000-4000-8000-000000000044'::uuid,'c1000000-1000-4000-8000-000000000041'::uuid,'Deixar a criança descobrir sozinha o funcionamento da escrita.',false,null,'A perspectiva não elimina a intervenção e o planejamento docente.',4),

      ('c1000000-2000-4000-8000-000000000045'::uuid,'c1000000-1000-4000-8000-000000000042'::uuid,'Porque a primeira produção sempre está errada.',false,null,'O ponto é observar conhecimento em construção, estabilidade e mudança.',1),
      ('c1000000-2000-4000-8000-000000000046'::uuid,'c1000000-1000-4000-8000-000000000042'::uuid,'Porque várias produções permitem perceber regularidades, mudanças e o contexto em que um raciocínio aparece.',true,'Correto. O acompanhamento de diferentes situações produz evidências mais úteis para o ensino.',null,2),
      ('c1000000-2000-4000-8000-000000000047'::uuid,'c1000000-1000-4000-8000-000000000042'::uuid,'Porque apenas provas formais podem mostrar aprendizagem.',false,null,'A análise pode usar diferentes evidências de aprendizagem.',3),
      ('c1000000-2000-4000-8000-000000000048'::uuid,'c1000000-1000-4000-8000-000000000042'::uuid,'Porque o estudante deve repetir sempre a mesma resposta.',false,null,'A aprendizagem envolve transformação e reconstrução de conhecimentos.',4),

      ('c1000000-2000-4000-8000-000000000049'::uuid,'c1000000-1000-4000-8000-000000000043'::uuid,'É um rótulo fixo que determina como a criança aprenderá daqui para frente.',false,null,'Hipóteses não devem ser tratadas como etiquetas permanentes.',1),
      ('c1000000-2000-4000-8000-000000000050'::uuid,'c1000000-1000-4000-8000-000000000043'::uuid,'É uma evidência provisória e contextual sobre como o estudante está pensando sobre a escrita.',true,'Correto. A hipótese orienta investigação e planejamento, sem congelar o estudante em uma categoria.',null,2),
      ('c1000000-2000-4000-8000-000000000051'::uuid,'c1000000-1000-4000-8000-000000000043'::uuid,'Substitui qualquer outra evidência de aprendizagem.',false,null,'Uma hipótese é uma evidência entre outras e precisa ser interpretada no contexto.',3),
      ('c1000000-2000-4000-8000-000000000052'::uuid,'c1000000-1000-4000-8000-000000000043'::uuid,'Dispensa planejamento e intervenção do professor.',false,null,'Interpretar hipóteses serve justamente para orientar a próxima intervenção.',4),

      ('c1000000-2000-4000-8000-000000000053'::uuid,'c1000000-1000-4000-8000-000000000044'::uuid,'Esperar que a dificuldade desapareça espontaneamente.',false,null,'O tópico enfatiza intencionalidade e mediação docente.',1),
      ('c1000000-2000-4000-8000-000000000054'::uuid,'c1000000-1000-4000-8000-000000000044'::uuid,'Planejar atividades explícitas sobre o conhecimento identificado, acompanhando novas evidências de aprendizagem.',true,'Correto. O diagnóstico orienta uma intervenção planejada e o acompanhamento posterior.',null,2),
      ('c1000000-2000-4000-8000-000000000055'::uuid,'c1000000-1000-4000-8000-000000000044'::uuid,'Abandonar o ensino sistemático para preservar a descoberta espontânea.',false,null,'O material trata diagnóstico e ensino sistemático como articuláveis.',3),
      ('c1000000-2000-4000-8000-000000000056'::uuid,'c1000000-1000-4000-8000-000000000044'::uuid,'Usar somente a mesma atividade para toda a turma, sem observar respostas.',false,null,'A intervenção precisa considerar as evidências produzidas pelos estudantes.',4),

      ('c1000000-2000-4000-8000-000000000057'::uuid,'c1000000-1000-4000-8000-000000000045'::uuid,'Criar deliberadamente uma confusão e evitar qualquer explicação.',false,null,'Problema produtivo não significa ausência de mediação.',1),
      ('c1000000-2000-4000-8000-000000000058'::uuid,'c1000000-1000-4000-8000-000000000045'::uuid,'Comparar duas escritas, pedir justificativas e orientar a discussão para o conhecimento que está sendo construído.',true,'Correto. A comparação e a explicação tornam o raciocínio observável e podem provocar revisão de ideias.',null,2),
      ('c1000000-2000-4000-8000-000000000059'::uuid,'c1000000-2000-4000-8000-000000000045'::uuid,'Entregar a resposta pronta e encerrar a discussão.',false,null,'O objetivo é tornar a reflexão possível, não eliminar a participação do aluno.',3),
      ('c1000000-2000-4000-8000-000000000060'::uuid,'c1000000-1000-4000-8000-000000000045'::uuid,'Classificar os alunos antes de ouvi-los.',false,null,'A análise deve partir das produções e das justificativas observadas.',4),

      ('c1000000-2000-4000-8000-000000000061'::uuid,'c1000000-1000-4000-8000-000000000046'::uuid,'A psicogênese oferece uma receita rígida de etapas que determina a atividade certa para cada criança.',false,null,'O material alerta contra transformar hipóteses em uma escada rígida ou receita automática.',1),
      ('c1000000-2000-4000-8000-000000000062'::uuid,'c1000000-1000-4000-8000-000000000046'::uuid,'A perspectiva contribui para interpretar produções e hipóteses do aprendiz, enquanto o ensino continua intencional e sistemático.',true,'Correto. Essa leitura preserva a contribuição diagnóstica sem transformar a teoria em receita ou substituir o ensino.',null,2),
      ('c1000000-2000-4000-8000-000000000063'::uuid,'c1000000-1000-4000-8000-000000000046'::uuid,'A identificação de uma hipótese torna desnecessária qualquer outra informação sobre aprendizagem.',false,null,'O material defende múltiplas evidências e interpretação contextual.',3),
      ('c1000000-2000-4000-8000-000000000064'::uuid,'c1000000-1000-4000-8000-000000000046'::uuid,'A intervenção do professor deve ser eliminada para preservar a autonomia do estudante.',false,null,'A mediação docente permanece central na organização do ensino.',4)
  ) as o(id,question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
  where not exists (
    select 1 from public.exercise_options eo
    where eo.id=o.id or (eo.question_id=o.question_id and eo.position=o.position)
  );
end $$;
