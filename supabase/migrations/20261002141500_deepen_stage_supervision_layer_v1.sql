-- Ensina-me: deepen the supervised internship layer with explicit supervision,
-- documentation, feedback and progression cues.

update public.material_sections ms
set content = ms.content || v.addition,
    updated_at = now()
from (values
  ('Estágio Curricular Supervisionado I',' Esse registro deve alimentar a conversa com a supervisão e orientar novas perguntas sobre a escola, em vez de servir apenas como comprovação de presença.'),
  ('Estágio Curricular Supervisionado II',' A participação precisa ser acompanhada e registrada para que o estudante consiga relacionar suas escolhas às características do campo e ao percurso formativo definido pelo curso.'),
  ('Estágio Curricular Supervisionado III',' Depois da atuação, a análise deve reunir evidências da aprendizagem dos estudantes, devolutivas da escola e reflexão do estagiário sobre suas decisões pedagógicas.'),
  ('Estágio Curricular Supervisionado IV',' A autonomia esperada é progressiva e acompanhada: o estagiário assume mais responsabilidade, mas continua submetendo suas decisões à análise e à supervisão formativa.')
) v(discipline,addition)
join public.disciplines d on d.name=v.discipline
join public.topics t on t.discipline_id=d.id
join public.materials m on m.topic_id=t.id
where ms.material_id=m.id;
