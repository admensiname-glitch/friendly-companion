DO $$ DECLARE v_ex_id uuid; v_q_id uuid; v_topic_id uuid; BEGIN SELECT t.id INTO v_topic_id FROM public.topics t WHERE t.name='Conceitos fundamentais de educação' LIMIT 1;
INSERT INTO public.exercises(topic_id,title,exercise_type,content,difficulty,position,published)
SELECT v_topic_id,'Prática — Conceitos fundamentais de educação','application','Pratique os conceitos centrais deste tópico em situações de educação e escola.','medium',1,false
WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Conceitos fundamentais de educação');
SELECT e.id INTO v_ex_id FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Conceitos fundamentais de educação' LIMIT 1;
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Educação e ensino são:','multiple_choice',1,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'sinônimos',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'conceitos distintos; educação é mais ampla e ensino é intencional',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'a mesma coisa na escola',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'opostos',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Escolarização é:','multiple_choice',2,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'qualquer aprendizagem',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'uma forma institucional de organizar processos educativos',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'somente educação familiar',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'uma avaliação',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Uma boa decisão educativa considera:','multiple_choice',3,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'somente a técnica',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'contexto, sujeitos e finalidade',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'somente tecnologia',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'apenas tempo',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Qual situação mostra educação além da escola?','multiple_choice',4,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'aula de matemática',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'aprendizagem de convivência em contexto familiar',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'prova escolar',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'boletim',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Compreender o tópico exige:','multiple_choice',5,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'decorar uma frase',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'explicar os conceitos e aplicá-los a um caso',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'ignorar exemplos',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'escolher uma técnica',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
SELECT t.id INTO v_topic_id FROM public.topics t WHERE t.name='Educação, sociedade e cultura' LIMIT 1;
INSERT INTO public.exercises(topic_id,title,exercise_type,content,difficulty,position,published)
SELECT v_topic_id,'Prática — Educação, sociedade e cultura','application','Pratique os conceitos centrais deste tópico em situações de educação e escola.','medium',1,false
WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Educação, sociedade e cultura');
SELECT e.id INTO v_ex_id FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Educação, sociedade e cultura' LIMIT 1;
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Cultura importa porque:','multiple_choice',1,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'não influencia o currículo',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'linguagens, valores e conhecimentos atravessam a educação',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'é só arte',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'deve ser ignorada',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Educação e sociedade:','multiple_choice',2,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'não se relacionam',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'influenciam-se mutuamente',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'são opostas',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só se relacionam em provas',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Uma escola que amplia referências culturais pode:','multiple_choice',3,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'ampliar repertórios',true,'Correto.','Continue.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'eliminar diferenças',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'dispensar currículo',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'eliminar planejamento',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Uma boa análise curricular pergunta:','multiple_choice',4,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'qual técnica está na moda',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'quem é representado e quais conhecimentos são valorizados',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'como evitar contexto',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'como impedir participação',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Uma visão não simplista reconhece que a escola:','multiple_choice',5,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só reproduz',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só transforma',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'pode reproduzir e produzir mudanças',true,'Correto.','Continue.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'não sofre influência social',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
SELECT t.id INTO v_topic_id FROM public.topics t WHERE t.name='Concepções pedagógicas' LIMIT 1;
INSERT INTO public.exercises(topic_id,title,exercise_type,content,difficulty,position,published)
SELECT v_topic_id,'Prática — Concepções pedagógicas','application','Pratique os conceitos centrais deste tópico em situações de educação e escola.','medium',1,false
WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Concepções pedagógicas');
SELECT e.id INTO v_ex_id FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Concepções pedagógicas' LIMIT 1;
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Concepção pedagógica é:','multiple_choice',1,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'técnica',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'visão articulada sobre educação, ensino e aprendizagem',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'aplicativo',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'prova',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Uma técnica isolada:','multiple_choice',2,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'define toda concepção',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'não revela toda a concepção pedagógica',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'substitui currículo',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'elimina planejamento',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Ao observar uma aula, é importante analisar:','multiple_choice',3,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'somente recurso',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'finalidade, papel docente e participação',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'apenas duração',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'decoração',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Um erro é:','multiple_choice',4,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'comparar práticas',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'usar uma técnica como receita universal',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'considerar contexto',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'analisar finalidade',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Estudar concepções serve para:','multiple_choice',5,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'decorar rótulos',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'comparar fundamentos e práticas',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'ignorar objetivos',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'substituir experiência',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
SELECT t.id INTO v_topic_id FROM public.topics t WHERE t.name='Finalidades e funções da educação' LIMIT 1;
INSERT INTO public.exercises(topic_id,title,exercise_type,content,difficulty,position,published)
SELECT v_topic_id,'Prática — Finalidades e funções da educação','application','Pratique os conceitos centrais deste tópico em situações de educação e escola.','medium',1,false
WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Finalidades e funções da educação');
SELECT e.id INTO v_ex_id FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Finalidades e funções da educação' LIMIT 1;
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Entre as finalidades da educação está:','multiple_choice',1,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'apenas prova',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'desenvolvimento, cidadania e qualificação para o trabalho',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'apenas profissão',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'apenas socialização',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Finalidades orientam:','multiple_choice',2,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só conteúdo',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'currículo, ensino, avaliação e organização',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só frequência',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só tecnologia',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Leitura crítica pode contribuir para:','multiple_choice',3,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'participação social',true,'Correto.','Continue.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só lazer',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'nenhuma finalidade',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só memorização',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Finalidade é diferente de conteúdo porque:','multiple_choice',4,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'são iguais',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'finalidade explica o sentido e conteúdo é meio de aprendizagem',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'finalidade é técnica',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'conteúdo não importa',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Ao planejar, pergunte:','multiple_choice',5,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'apenas se termina rápido',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'qual contribuição formativa a atividade oferece',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'somente qual recurso usar',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'quem corrige',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
SELECT t.id INTO v_topic_id FROM public.topics t WHERE t.name='Educação, escola e formação humana' LIMIT 1;
INSERT INTO public.exercises(topic_id,title,exercise_type,content,difficulty,position,published)
SELECT v_topic_id,'Prática — Educação, escola e formação humana','application','Pratique os conceitos centrais deste tópico em situações de educação e escola.','medium',1,false
WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Educação, escola e formação humana');
SELECT e.id INTO v_ex_id FROM public.exercises e WHERE e.topic_id=v_topic_id AND e.title='Prática — Educação, escola e formação humana' LIMIT 1;
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'A escola é:','multiple_choice',1,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=1 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'único espaço educativo',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'instituição que organiza aprendizagens sistemáticas e intencionais',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'espaço sem currículo',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'instituição sem relação social',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Formação humana envolve:','multiple_choice',2,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=2 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só rendimento',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'dimensões intelectuais, sociais, culturais, éticas e práticas',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só profissão',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só comportamento',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Uma aula de História com fontes e argumentação mostra que:','multiple_choice',3,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=3 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'conteúdo e formação podem se articular',true,'Correto.','Continue.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'conteúdo impede formação',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'argumentação não ensina',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'escola não forma',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Acesso ao conhecimento:','multiple_choice',4,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=4 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'impede formação',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'pode integrar a formação humana',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'é irrelevante',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'deve ser evitado',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
INSERT INTO public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
SELECT v_ex_id,'Analisar proposta escolar exige observar:','multiple_choice',5,'Volte ao material e compare a alternativa escolhida com o conceito central.',ARRAY['fundamentos_educacao']::text[]
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5);
SELECT eq.id INTO v_q_id FROM public.exercise_questions eq WHERE eq.exercise_id=v_ex_id AND eq.position=5 LIMIT 1;
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só conteúdo',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',1
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=1);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'conhecimento, participação, relações e contexto',true,'Correto.','Continue.',2
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=2);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só prova',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',3
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=3);
INSERT INTO public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
SELECT v_q_id,'só espaço físico',false,'A alternativa não corresponde ao conceito estudado.','Revise a explicação e tente novamente.',4
WHERE NOT EXISTS(SELECT 1 FROM public.exercise_options eo WHERE eo.question_id=v_q_id AND eo.position=4);
END $$;