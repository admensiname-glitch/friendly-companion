do $$
begin
  update public.material_sections ms
  set content =
    case ms.position
      when 3 then 'No tópico "' || t.name || '", relacione os conceitos desta seção ao foco específico do tema. ' || coalesce(trim(t.description), 'Observe como os elementos centrais do tópico se articulam.')
      when 4 then 'Para visualizar "' || t.name || '", pense em uma situação concreta da área de "' || d.name || '" e identifique onde o conceito estudado aparece.'
      when 5 then 'Ao analisar "' || t.name || '", reúna evidências que permitam observar o conceito em situação e relacione essas evidências ao objetivo do estudo.'
      when 6 then 'Ao estudar "' || t.name || '", use o erro descrito nesta seção para distinguir uma simplificação inadequada de uma decisão pedagógica fundamentada.'
      when 7 then 'Para aprofundar "' || t.name || '", compare situações e explicite quais elementos do tópico sustentam cada interpretação.'
      when 8 then 'Na aplicação de "' || t.name || '", transforme o conceito em uma decisão observável de ensino, análise ou prática profissional.'
      when 9 then 'Para verificar seu domínio de "' || t.name || '", use os critérios desta seção e confira se consegue explicá-los com um exemplo específico do tópico.'
      when 10 then 'Para revisar "' || t.name || '", retome as ideias desta seção e conecte-as ao problema central apresentado no material.'
      else 'No tópico "' || t.name || '", relacione esta seção ao foco específico da disciplina "' || d.name || '".'
    end
    || E'\n\n' || ms.content
  from public.materials m
  join public.topics t on t.id=m.topic_id
  join public.disciplines d on d.id=t.discipline_id
  join public.courses c on c.id=d.course_id
  where ms.material_id=m.id
    and m.status='published'
    and t.published
    and d.published
    and c.published
    and left(ms.content, 11) <> 'No tópico "'
    and exists (
      select 1
      from public.material_sections dup
      join public.materials dm on dm.id=dup.material_id and dm.status='published'
      where dup.position=ms.position
        and dup.content=ms.content
        and dup.id<>ms.id
    );
end $$;
