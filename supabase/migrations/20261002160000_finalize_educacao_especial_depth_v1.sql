-- Ensina-me: final depth polish for the remaining Educação Especial topics.
-- Idempotent migration.

update public.material_sections ms
set content=ms.content || v.addition,
    updated_at=now()
from (values
  ('Recursos de acessibilidade pedagógica',' A acessibilidade deve remover barreiras à participação e à aprendizagem, combinando recursos, estratégias, comunicação e organização pedagógica conforme as necessidades de cada estudante.'),
  ('Deficiência e participação escolar',' A análise deve olhar para barreiras presentes no ambiente, nas práticas e na comunicação, evitando explicar a participação apenas pelas características individuais do estudante.'),
  ('Articulação entre ensino comum e Educação Especial',' A colaboração entre profissionais precisa preservar o currículo e a participação no ensino comum, planejando apoios complementares em vez de separar automaticamente o estudante das experiências da turma.')
) v(topic,addition)
join public.topics t on t.name=v.topic
join public.materials m on m.topic_id=t.id
join public.disciplines d on d.id=t.discipline_id
where d.name='Educação Especial'
  and ms.material_id=m.id;