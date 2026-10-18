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

**Isto não equivale a aprovação semântica completa.** Ainda é necessário revisar alinhamento enunciado–alternativas–gabarito–feedback, fontes e adequação pedagógica, sobretudo porque as filas de auditoria de questões e tópicos permanecem pendentes. Na consulta de 18/10, nenhum dos exercícios publicados foi identificado pelos padrões de feedback genérico/curto escolhidos para a nova trava. Já os exercícios não publicados apresentam numerosos candidatos a feedback genérico; a correção deve ser feita por questão, mantendo o gabarito, o enunciado e o contexto como fonte. A migration `supabase/migrations/20261018190000_harden_exercise_feedback_publication_gate_v1.sql` foi aplicada ao projeto Supabase em 18/10/2026. A consulta de segurança para os padrões escolhidos retornou zero opções publicadas afetadas. Um teste controlado de publicação de exercício em rascunho foi bloqueado pela regra `PUBLICATION_BLOCKED_GENERIC_FEEDBACK`; uma consulta posterior confirmou que o exercício continuou não publicado. A migration impede futuras publicações com padrões de feedback reconhecidamente genéricos; ela não reescreve os milhares de feedbacks genéricos que já existem em rascunhos.

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
4. Continuar a revisão semântica dos exercícios em rascunho em lotes pequenos, com backup e preservando o gabarito.
5. Rodar checagens estruturais e semânticas antes de cada nova publicação; a trava SQL já está ativa.


## Atualização após a aplicação no Supabase

- **Trava de publicação:** aplicada e verificada em 18/10/2026. Um exercício de rascunho com feedback genérico foi usado em teste controlado; o gatilho rejeitou a publicação com `PUBLICATION_BLOCKED_GENERIC_FEEDBACK`, e o registro permaneceu sem publicação.
- **Tutor adaptativo:** a Edge Function `ai-tutor` foi publicada como versão 108, permanece `ACTIVE` e continua exigindo JWT (`verify_jwt=true`). A nova versão rejeita microavaliações malformadas em vez de expor questões com alternativas repetidas ou explicações insuficientes.
- **Limite da intervenção:** os conteúdos já publicados não foram reescritos em massa. Os milhares de candidatos de feedback genérico em exercícios não publicados continuam exigindo correção contextual por questão antes de serem promovidos para publicação.


## Lote 01 — aplicado e verificado no Supabase

**Escopo:** exercício em rascunho `Prática — Acompanhamento da aprendizagem` (UUID `9f6538a7-4825-4ee4-9520-af9290468770`).

- A migration `20261018193000_contextualize_learning_monitoring_draft_batch01.sql` foi aplicada em 18/10/2026.
- Foram personalizadas as quatro explicações ativas da questão 1 e reescritos os enunciados/alternativas das questões 2, 4 e 5. A questão 3 foi preservada porque seus feedbacks ativos já eram suficientemente contextuais.
- A tabela privada `private.exercise_quality_feedback_backups_20261018` contém **16 registros de backup**, cobrindo as alternativas das quatro questões editadas.
- Verificação pós-aplicação: o exercício continua com `published=false`, conserva 5 questões e 20 alternativas; as quatro questões editadas têm quatro opções distintas, exatamente uma correta e feedback ativo com pelo menos 40 caracteres.
- Nenhum material publicado foi modificado e o lote não foi publicado.



## Lote 02 — avaliação do tópico (aguardando PR e aplicação)

**Escopo:** exercício `Avaliação do tópico — Acompanhamento da aprendizagem` (UUID `ee8cf24b-8087-4b2c-9764-a41153af3b25`), que permanece em rascunho.

- A migration `20261018195000_contextualize_learning_monitoring_evaluation_batch02.sql` reescreve as 10 perguntas de avaliação e as 40 alternativas para remover alternativas modelo como “uma definição isolada”, “uma opinião pessoal” e “uma regra fixa”.
- Cada alternativa recebe feedback específico para seu cenário e seu papel (correto/incorreto). A posição da resposta correta é distribuída entre as quatro posições, preservando exatamente uma correta por pergunta.
- O script faz backup dos 40 registros antes da alteração e aborta caso o exercício não esteja em rascunho, os IDs/gabaritos não correspondam ao snapshot auditado, sobrem enunciados genéricos ou falhem as validações finais.
- **Estado neste relatório:** migration criada na branch de trabalho e aguardando CI/revisão. Ainda não foi aplicada ao Supabase.
