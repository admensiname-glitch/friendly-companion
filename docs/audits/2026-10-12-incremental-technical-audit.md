# Ensina-me — auditoria técnica incremental (12/10/2026)

## Mudanças verificadas nesta rodada

- Aplicados diretamente no banco ativo 10 índices para chaves estrangeiras apontadas pelo advisor de performance. A migration correspondente também consta na PR #49; confirmar/reconciliar o histórico de migrations antes de promover a branch para evitar divergência de histórico (os índices usam `IF NOT EXISTS`).
- A PR #49 segue aberta e não mesclada. O preview do Vercel estava Ready na última verificação.
- A revisão de questões publicada encontrou 522 questões; os checks estruturais anteriores não encontraram contagem incorreta de alternativas, quantidade diferente de uma resposta correta, opções duplicadas ou enunciados duplicados segundo as normalizações usadas. Isso não prova correção semântica.
- Os padrões genéricos de feedback verificados nas consultas anteriores estavam zerados. Isso não substitui revisão pedagógica com leitura da fonte.
- Foram revisadas 10 questões de Filosofia da Educação identificadas como `avaliacao_rascunho`; uma chave de resposta invertida foi corrigida e os feedbacks incorretos contextualizados. A checagem foi baseada nos enunciados/opções e pistas disponíveis; não houve validação individual completa contra o texto integral da fonte.

## Alertas atuais do Supabase

### Segurança
- Advisor reportou 12 tabelas com RLS habilitado e sem políticas: oito tabelas públicas de infraestrutura/auditoria de agentes e quatro tabelas do schema privado. A ausência de políticas normalmente mantém acesso via RLS fechado; não criar políticas amplas sem mapear consumidores e necessidade.
- Advisor reportou 11 funções `SECURITY DEFINER` executáveis por usuários autenticados, incluindo funções do Modo Prova, foco de disciplinas e progresso. Não revogar permissões em lote: verificar função, ownership, validação do usuário e chamadas reais antes de alterar.
- Proteção contra senhas comprometidas está desabilitada. Precisa ser habilitada nas configurações de Auth do Supabase e depois revalidada.

### Performance
- Advisor reportou 18 políticas de RLS em que chamadas de funções de autenticação podem ser reavaliadas por linha. Corrigir policy a policy preservando a lógica e testar os fluxos de leitura/escrita.
- Os 10 índices sinalizados foram criados nesta rodada. Consultar novamente o advisor depois de uso representativo; índices recém-criados podem aparecer como não utilizados.

## Modo Prova — pendência crítica
A PR #49 ajusta a composição para 5 = 4 objetivas + 1 discursiva; 10 = 8 + 2; 15 = 12 + 3; 20 = 17 + 3. Também endurece validações da correção discursiva e impede correção de tentativa encerrada. A PR continua não mesclada e falta teste ponta a ponta autenticado, incluindo quantidade real de questões, mínimo de linhas discursivas, salvar respostas, finalizar, notas parcial/zero/total e reentrada após encerramento. Não declarar pronto antes disso.

## Rastreabilidade de conteúdo
Consultas anteriores apontaram 268 fontes sem registro correspondente em `source_documents`, 151 documentos com status diferente de `retrieved` e 30 seções sem citação direta na lógica de junção usada. São contagens dependentes da definição da consulta; precisam ser reconciliadas, não interpretadas automaticamente como 268 fontes inválidas ou 30 seções sem qualquer origem. Não inventar fontes ou citações.

## Próximas ações seguras
1. Testar o Modo Prova com uma conta autenticada antes de mesclar a PR #49.
2. Inspecionar as 11 funções `SECURITY DEFINER` individualmente e testar autorização por usuário.
3. Revisar as 18 políticas de RLS individualmente; preservar as condições atuais.
4. Habilitar proteção contra senhas comprometidas em Auth.
5. Reconciliar o histórico da migration dos índices aplicada diretamente ao banco.
6. Auditar a correspondência entre fontes, documentos, citações e seções com consultas reproduzíveis.
7. Repetir os advisors após as alterações e guardar os resultados.

## Limites desta auditoria
Não houve teste autenticado ponta a ponta, leitura integral de todas as fontes acadêmicas, nem prova de que todos os conteúdos estejam semanticamente corretos. Não afirmar conclusão global enquanto essas etapas estiverem pendentes.
