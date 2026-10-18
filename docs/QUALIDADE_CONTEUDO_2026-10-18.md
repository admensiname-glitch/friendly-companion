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
- **Feedback nos rascunhos:** 15.560 alternativas pertencem a exercícios não publicados. Entre elas, 3.890 alternativas corretas foram verificadas: 3.612 não passaram no critério de feedback específico (feedback ausente/curto ou frase-padrão genérica). Entre as 11.670 alternativas incorretas, 10.503 não passaram no critério equivalente para feedback incorreto. São candidatos a correção e não devem ser publicados automaticamente.
- **Enunciados genéricos nos rascunhos:** 3.903 questões pertencem a exercícios não publicados; 3.027 começam com um dos padrões genéricos já reconhecidos pela regra de publicação.
- **Fontes rastreáveis:** 275/275 materiais publicados têm ao menos uma citação; existem 252 documentos de fonte, 791 chunks e 2.148 vínculos em `material_chunk_citations`.
- **Auditoria semântica pendente:** 502 registros de auditoria de questão estão com status `pending`; 275 registros de auditoria de tópico também estão com status `pending`. Vinte das 522 questões publicadas não tinham registro na tabela `private.professor_question_audits` no momento da consulta.

## Conclusão

Os checks estruturais básicos para questões publicadas passaram na consulta: quatro alternativas e exatamente uma correta, com feedback pertinente presente em cada tipo de alternativa. A distribuição dos textos observados nos exemplos consultados também não mostrou repetição literal entre feedbacks específicos publicados.

**Isto não equivale a aprovação semântica completa.** Ainda é necessário revisar alinhamento enunciado–alternativas–gabarito–feedback, fontes e adequação pedagógica, sobretudo porque as filas de auditoria de questões e tópicos permanecem pendentes. Na consulta de 18/10, nenhum dos exercícios publicados foi identificado pelos padrões de feedback genérico/curto escolhidos para a nova trava. Já os exercícios não publicados apresentam numerosos candidatos a feedback genérico; a correção deve ser feita por questão, mantendo o gabarito, o enunciado e o contexto como fonte. Foi preparada a migration `supabase/migrations/20261018190000_harden_exercise_feedback_publication_gate_v1.sql` para bloquear feedback ausente, curto e frases-padrão específicas no momento da publicação. A consulta de segurança para os padrões escolhidos retornou zero opções publicadas afetadas. A migration ainda precisa ser aplicada ao projeto Supabase após CI e revisão; ela não reescreve conteúdos em rascunho.

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



### Candidatos a feedback genérico em exercícios ainda não publicados

Consulta usada: contar feedbacks curtos ou frases-padrão, apenas no campo correspondente ao gabarito de cada alternativa. Resultados: 3.612 alternativas corretas e 10.503 incorretas foram sinalizadas para revisão.

```sql
select
  count(*) filter (where eo.is_correct and (coalesce(length(trim(eo.feedback_correct)), 0) < 25 or lower(trim(coalesce(eo.feedback_correct, ''))) in ('essa alternativa não demonstra compreensão suficiente do tópico.', 'essa alternativa não demonstra compreensão suficiente do conceito.', 'correto. essa alternativa demonstra compreensão relacional do conteúdo.', 'correto. a resposta relaciona compreensão e análise.', 'correto. a alternativa privilegia compreensão e análise.', 'correto.', 'a alternativa não corresponde ao conceito estudado.'))) as correct_options_to_review,
  count(*) filter (where not eo.is_correct and (coalesce(length(trim(eo.feedback_incorrect)), 0) < 25 or lower(trim(coalesce(eo.feedback_incorrect, ''))) in ('revise o material e tente novamente.', 'continue.', 'revise a explicação e tente novamente.', 'revise o material e procure a relação entre conceito, contexto e evidências.'))) as incorrect_options_to_review
from public.exercise_options eo
join public.exercise_questions eq on eq.id = eo.question_id
join public.exercises e on e.id = eq.exercise_id
where e.published = false;
```

## Próximas ações recomendadas

1. Processar as 502 questões pendentes de auditoria e completar os 20 registros ausentes.
2. Auditar os 275 tópicos em ordem e só marcar a auditoria como aprovada após revisão semântica.
3. Priorizar as 48 introduções curtas de exercícios publicados e melhorar a orientação ao aluno conforme o conteúdo real da atividade.
4. Após CI, aplicar a migration de trava de publicação e confirmar que exercícios com feedback genérico não podem ser publicados.
5. Rodar checagens estruturais e semânticas antes de cada nova publicação.
