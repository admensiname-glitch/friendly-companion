
update public.material_sections
set content =
  split_part(
    split_part(
      split_part(
        split_part(
          split_part(
            split_part(
              split_part(
                split_part(
                  split_part(
                    split_part(
                      content,
                      'Delimitação conceitual:', 1
                    ),
                    'Estrutura do conceito:', 1
                  ),
                  'Distinções essenciais:', 1
                ),
                'Exemplo trabalhado:', 1
              ),
              'Caso para análise:', 1
            ),
            'Erro conceitual a evitar:', 1
          ),
          'Leitura acadêmica e fontes:', 1
        ),
        'Aplicação profissional:', 1
      ),
      'Síntese de domínio:', 1
    ),
    'Revisão ativa:', 1
  ),
  updated_at = now()
where content like '%Delimitação conceitual:%'
   or content like '%Estrutura do conceito:%'
   or content like '%Distinções essenciais:%'
   or content like '%Exemplo trabalhado:%'
   or content like '%Caso para análise:%'
   or content like '%Erro conceitual a evitar:%'
   or content like '%Leitura acadêmica e fontes:%'
   or content like '%Aplicação profissional:%'
   or content like '%Síntese de domínio:%'
   or content like '%Revisão ativa:%';
