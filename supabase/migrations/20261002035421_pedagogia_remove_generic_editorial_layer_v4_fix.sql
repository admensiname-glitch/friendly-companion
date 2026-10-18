update public.material_sections
set content = regexp_replace(
  content,
  E'\\n\\n(?:Delimitação conceitual|Estrutura do conceito|Distinções essenciais|Exemplo trabalhado|Caso para análise|Erro conceitual a evitar|Leitura acadêmica e fontes|Aplicação profissional|Síntese de domínio|Revisão ativa):.*$',
  ''
),
updated_at = now()
where content ~ E'\\n\\n(?:Delimitação conceitual|Estrutura do conceito|Distinções essenciais|Exemplo trabalhado|Caso para análise|Erro conceitual a evitar|Leitura acadêmica e fontes|Aplicação profissional|Síntese de domínio|Revisão ativa):';
