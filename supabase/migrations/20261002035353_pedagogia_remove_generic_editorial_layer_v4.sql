update public.material_sections
set content = regexp_replace(
  content,
  E'\\n\\n(?:Delimitação conceitual|Estrutura do conceito|Distinções essenciais|Exemplo trabalhado|Caso para análise|Erro conceitual a evitar|Leitura acadêmica e fontes|Aplicação profissional|Síntese de domínio|Revisão ativa):[\\s\\S]*$',
  ''
),
updated_at = now()
where content ~ E'\\n\\n(?:Delimitação conceitual|Estrutura do conceito|Distinções essenciais|Exemplo trabalhado|Caso para análise|Erro conceitual a evitar|Leitura acadêmica e fontes|Aplicação profissional|Síntese de domínio|Revisão ativa):';

update public.materials m
set introduction = left(split_part(ms.content, E'\\n\\n', 1), 1200),
    updated_at = now()
from public.material_sections ms
where ms.material_id = m.id
  and ms.position = 1
  and m.status = 'published'
  and ms.content is not null
  and length(trim(ms.content)) > 0;
