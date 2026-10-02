-- Ensina-me: deepen final internship and integration layers.
-- Idempotent migration: adds explicit supervisory/formative context to every section.

update public.material_sections ms
set content = ms.content || v.addition,
    updated_at = now()
from (values
  ('Estágio Curricular Supervisionado V',' A experiência deve ser discutida com supervisão e relacionada às evidências produzidas no campo, para que autonomia, responsabilidade e adaptação sejam aprendidas de forma consciente.'),
  ('Estágio Curricular Supervisionado VI',' A etapa final deve transformar registros acumulados em análise profissional: o estudante identifica avanços, lacunas, decisões marcantes e prioridades para a continuidade da formação.'),
  ('Seminário Integrador e Práticas Pedagógicas',' O valor do seminário está na capacidade de articular conhecimentos e justificar decisões com evidências, conectando problemas concretos às aprendizagens desenvolvidas ao longo do curso.')
) v(discipline,addition)
join public.disciplines d on d.name=v.discipline
join public.topics t on t.discipline_id=d.id
join public.materials m on m.topic_id=t.id
where ms.material_id=m.id;