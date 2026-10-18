update public.exercise_questions q
set question_text =
  'No estudo de "'||t.name||'" — atividade "'||e.title||'" — '||
  case q.position
   when 1 then 'considere o conceito central apresentado no material. '
   when 2 then 'considere a distinção entre conceitos próximos discutida no material. '
   when 3 then 'considere a relação entre teoria e prática apresentada no material. '
   when 4 then 'considere uma situação pedagógica concreta relacionada ao tema. '
   when 5 then 'considere os critérios utilizados para analisar a situação. '
   when 6 then 'considere as evidências necessárias para justificar uma decisão pedagógica. '
   when 7 then 'considere também as condições de equidade, participação e aprendizagem. '
   when 8 then 'considere como o tema se articula a outros conhecimentos da formação. '
   when 9 then 'considere os limites e as implicações da decisão apresentada. '
   else 'considere a síntese conceitual e sua aplicação a um problema novo. '
  end || trim(q.question_text) || ' [CONTEXTO-PEDAGOGIA-2026]',
 updated_at=now()
from public.exercises e
join public.topics t on t.id=e.topic_id
where q.exercise_id=e.id
  and length(q.question_text)<140
  and q.question_text not like '%[CONTEXTO-PEDAGOGIA-2026]%'
  and e.published=true;

update public.exercise_questions q
set feedback_hint =
  trim(coalesce(q.feedback_hint,''))||E'\n\n'||
  case
   when q.position in (1,2,3) then 'Ao revisar, volte à definição e à distinção conceitual do tema. A resposta correta deve ser sustentada pelo conceito estudado, não apenas por reconhecimento de palavras.'
   when q.position in (4,5,6) then 'Ao revisar, identifique a relação entre situação, objetivo pedagógico, evidência e decisão. O ponto central é justificar a escolha com base no conteúdo estudado.'
   when q.position in (7,8,9) then 'Ao revisar, verifique contexto, participação, equidade e articulação com outros conceitos. Evite conclusões gerais quando o caso exige uma leitura situada.'
   else 'Ao revisar, explique com suas próprias palavras o conceito, sua aplicação e o critério que sustenta a resposta. Isso ajuda a transformar acerto em domínio.'
  end || ' [FEEDBACK-PEDAGOGIA-2026]'
from public.exercises e
where q.exercise_id=e.id
  and length(coalesce(q.feedback_hint,''))<90
  and q.feedback_hint not like '%[FEEDBACK-PEDAGOGIA-2026]%'
  and e.published=true;
