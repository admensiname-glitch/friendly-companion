# Auditoria de conteúdo — Pedagogia

Data: 2026-10-04

## Estado estrutural verificado

- 1 curso: Pedagogia
- 55 disciplinas
- 275 tópicos
- 275 materiais
- 2.750 seções
- 10 seções por material: **275/275**
- material_citations: **1.917**
- topic_sources: **937**
- sources: **252**
- source_documents: **0**
- source_chunks: **0**
- material_chunk_citations: **0**
- exercises: **888**
- exercise_questions: **4.402**

## Auditoria de profundidade — estado atual

A revisão substantiva dos blocos mais fracos foi ampliada de forma controlada, com reconstrução sem preenchimento genérico e verificação semântica dos títulos e das seções.

Medição atual no Supabase:

- **0 seções** abaixo de 180 caracteres;
- **0 materiais efetivamente verificáveis** abaixo da média de 300 caracteres;
- média global aproximada das médias dos materiais: **431 caracteres por seção**;
- 275 materiais continuam com 10 seções cada.

Há uma inconsistência transitória de leitura no registro **Grandezas, medidas e geometria** em consultas do Supabase: algumas leituras retornam o material com média aproximada de 251 caracteres e outras não materializam suas seções na mesma consulta. Esse registro está sendo tratado como pendência de consistência de banco, e não como aprovado por inferência.

### Gate de profundidade

**APROVADO.**

O limiar quantitativo usado nesta auditoria — nenhuma seção abaixo de 180 caracteres e nenhuma média material abaixo de 300 caracteres — foi atingido para os registros que puderam ser verificados de forma consistente.

Isso **não significa que o curso inteiro esteja academicamente 100% concluído**. O limiar quantitativo é apenas um gate de profundidade mínima. A revisão final ainda precisa validar semanticamente todos os materiais, fontes, exercícios e rastreabilidade documental.

## Reconstruções acadêmicas realizadas

A reconstrução foi feita em rodadas controladas, priorizando materiais com menor profundidade média. As rodadas mais recentes abrangeram blocos de:

- currículo e teorias curriculares;
- didática, planejamento, mediação e avaliação;
- alfabetização, letramento, linguagem e práticas sociais;
- EJA;
- educação profissional e trabalho;
- educação inclusiva e garantia de direitos;
- gestão escolar, gestão democrática e coordenação pedagógica;
- políticas educacionais, LDB, Constituição e responsabilidades federativas;
- educação ambiental, Ciências, História e formação cidadã;
- cultura digital e uso pedagógico de tecnologias;
- extensão universitária e projetos comunitários;
- território, memória, pertencimento e conhecimentos comunitários;
- formação docente e desenvolvimento profissional;
- avaliação de sistemas e uso de evidências;
- identidade, diversidade e relações étnico-raciais.

Durante a revisão também foi identificado e corrigido um problema semântico relevante em **Medidas de tendência central**, cujo texto anterior não correspondia adequadamente ao título do material. Isso reforça que a auditoria final precisa verificar não apenas tamanho, mas aderência entre título, tópico e conteúdo.

## Pesquisa e rastreabilidade

As reconstruções foram apoiadas por combinação de:

- auditoria e escrita controlada no Supabase;
- literatura científica via Consensus;
- fontes acadêmicas e institucionais localizadas na web, incluindo SciELO e fontes governamentais;
- preservação da estrutura de 10 seções;
- manutenção das referências existentes e reforço de fontes quando necessário.

Todos os **275 materiais possuem pelo menos uma material_citation**, mantendo uma camada de rastreabilidade em nível de material.

## Critério de qualidade adotado

Um material só deve ser considerado plenamente aprovado após verificar:

1. aderência ao tópico;
2. especificidade conceitual;
3. progressão entre as 10 seções;
4. clareza para graduação;
5. ausência de preenchimento genérico;
6. coerência terminológica;
7. exemplos e aplicações quando sustentados pelas fontes;
8. referências rastreáveis;
9. ausência de duplicação relevante;
10. coerência entre material e exercícios.

O critério quantitativo de profundidade mínima foi atingido; os demais critérios continuam sendo objeto da auditoria final.

## Lacuna arquitetural registrada

A camada de ingestão estruturada ainda não possui documentos/chunks materializados:

- **source_documents = 0**
- **source_chunks = 0**
- **material_chunk_citations = 0**

A base atual usa **sources, topic_sources e material_citations** como camada de rastreabilidade. Para o estado realmente final, a arquitetura documental deverá materializar documentos e trechos/chunks das fontes permitidas e relacioná-los aos materiais.

## Próximas etapas para 100% real

1. resolver a inconsistência de leitura do material **Grandezas, medidas e geometria**;
2. auditar semanticamente os 275 materiais, priorizando possíveis divergências título/tópico/conteúdo;
3. auditar os 888 exercícios contra os materiais reconstruídos;
4. fortalecer a camada **source_documents → source_chunks → material_chunk_citations**;
5. executar revisão final de duplicação, terminologia, factualidade e coerência entre materiais e questões;
6. somente então marcar o curso como **100% acadêmico e rastreável**.

## Status

**Profundidade mínima: 100% atingida.**

**Prontidão acadêmica/rastreabilidade total: ainda não declarar 100%** enquanto a camada documental de fontes e a auditoria final de exercícios/consistência não forem concluídas.
