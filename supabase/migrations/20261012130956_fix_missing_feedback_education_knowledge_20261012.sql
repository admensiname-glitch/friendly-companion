UPDATE public.exercise_options
SET feedback_incorrect = 'A alternativa descreve uma abordagem que valoriza a relação entre sujeitos, linguagem, experiência e critérios de validade. Isso não identifica o problema apresentado no enunciado: memorizar definições sem discutir como o conhecimento é construído ou justificado. O ponto crítico é a ausência de análise e fundamentação do que se afirma.'
WHERE question_id = '5e4da1df-7cc9-482c-87fc-404ce51dc79e'::uuid
  AND content = 'Relacionar conhecimento a sujeitos, linguagem, experiência, critérios de validade e finalidades.'
  AND is_correct IS FALSE
  AND coalesce(btrim(feedback_incorrect), '') = '';
