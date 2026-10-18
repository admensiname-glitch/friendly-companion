# Auditoria de qualidade do conteúdo — Ensina-me

**Data da consulta:** 18/10/2026  
**Ambiente consultado:** projeto Supabase `Ensina 2` (`gcnbekkfulppfbsrgksd`)  
**Método:** consultas SQL somente de leitura; nenhuma resposta acadêmica foi alterada nesta auditoria.

## Resultados observados

- **Disciplinas:** 55 no total, 55 publicadas.
- **Tópicos:** 275 no total, 275 publicados.
- **Materiais:** 275 no total, 275 publicados.
- **Seções de material:** 2.750; nenhuma abaixo de 180 caracteres nesta medição; 2.750 conteúdos distintos por hash do texto normalizado. Isso mede tamanho e duplicação exata, não comprova por si só correção ou profundidade acadêmica.
- **Exercícios:** 895 no total; 369 publicados. Entre os publicados, 48 têm campo `content` com menos de 60 caracteres; alguns são introduções curtas como “Verificação de domínio do tópico.” ou “Pratique a ideia central do tópico.”. Recomenda-se revisar se esse campo deve orientar melhor o aluno, sem confundir descrições curtas com questões inválidas.
- **Questões vinculadas a exercícios publicados:** 522.
- **Estrutura das questões publicadas:** nenhuma questão consultada tinha quantidade de alternativas diferente de quatro ou quantidade de respostas corretas diferente de uma.
- **Feedback das questões publicadas:** 522 alternativas corretas e 1.566 incorretas. Nas alternativas corretas, não foi detectado feedback próprio ausente/curto; nas alternativas incorretas, não foi detectado feedback incorreto próprio ausente/curto. A checagem considera apenas o campo que corresponde ao tipo da alternativa, evitando contar como falha o campo não aplicável a cada alternativa.
- **Auditoria semântica pendente:** 502 registros de auditoria de questão estão com status `pending`; 275 registros de auditoria de tópico também estão com status `pending`. Vinte das 522 questões publicadas não tinham registro na tabela `private.professor_question_audits` no momento da consulta.

## Conclusão

Os checks estruturais básicos para questões publicadas passaram na consulta: quatro alternativas e exatamente uma correta, com feedback pertinente presente em cada tipo de alternativa. A distribuição dos textos observados nos exemplos consultados também não mostrou repetição literal entre feedbacks específicos publicados.

**Isto não equivale a aprovação semântica completa.** Ainda é necessário revisar alinhamento enunciado–alternativas–gabarito–feedback, fontes e adequação pedagógica, sobretudo porque as filas de auditoria de questões e tópicos permanecem pendentes. Não se deve republicar automaticamente os exercícios em rascunho com feedbacks genéricos.

## Consultas de reprodução

### Estrutura das questões publicadas

```sql
select
  count(*) as published_questions,
  count(*) filter (where option_count <> 4) as questions_not_with_four_options,
  count(*) filter (where correct_count <> 1) as questions_not_with_one_correct_answer
from (
  select eq.id,
         count(eo.id) as option_count,
         count(eo.id) filter (where eo.is_correct) as correct_count
  from public.exercise_questions eq
  join public.exercises e on e.id = eq.exercise_id
  left join public.exercise_options eo on eo.question_id = eq.id
  where e.published = true
  group by eq.id
) q;
```

### Feedback próprio por alternativa publicada

```sql
select
  count(*) filter (
    where eo.is_correct
      and coalesce(length(trim(eo.feedback_correct)), 0) < 25
  ) as correct_options_missing_own_feedback,
  count(*) filter (
    where not eo.is_correct
      and coalesce(length(trim(eo.feedback_incorrect)), 0) < 25
  ) as incorrect_options_missing_own_feedback
from public.exercise_options eo
join public.exercise_questions eq on eq.id = eo.question_id
join public.exercises e on e.id = eq.exercise_id
where e.published = true;
```

## Próximas ações recomendadas

1. Processar as 502 questões pendentes de auditoria e completar os 20 registros ausentes.
2. Auditar os 275 tópicos em ordem e só marcar a auditoria como aprovada após revisão semântica.
3. Priorizar as 48 introduções curtas de exercícios publicados e melhorar a orientação ao aluno conforme o conteúdo real da atividade.
4. Rodar checagens estruturais e semânticas antes de cada nova publicação.
