# Auditoria técnica do Ensina-me (somente diagnóstico)

Nenhum arquivo do projeto foi alterado. Abaixo, os achados confirmados nas leituras e o que precisa ser corrigido se você aprovar uma etapa de correção.

## Crítico (corrigir)

1. **A verificação de tipos falha: 54 erros.** O `tsconfig.json` voltou a ter `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` e `noImplicitOverride`. O código não foi escrito para essas regras (o próprio AGENTS.md diz isso), então a correção anterior foi desfeita. Exemplos: `__root.tsx:108` (ErrorComponent), `app.disciplinas.$disciplineId.$topicId.tsx:144/150/158` (override), `:726` e `:1770` (string | undefined).
2. **O lint falha**: `previewAuthStorage.ts:38`, `let timer` deveria ser `const`. Isso trava o job `bun run lint` do CI.
3. **O Supabase conectado mudou** (ref `gcnbekkfulppfbsrgksd`, no lugar do `qkcmgrgrerwyywpudkte` anterior). `types.ts` não traz RPCs que o código chama. Preciso confirmar se as migrações (Modo Prova v1–v5, motor de recomendação v5, review_items) foram aplicadas nesse banco. Se não foram, Modo Prova, revisão e recomendações quebram quando o app roda.

## Alto (corrigir)

4. **O recurso de professor não tem backend.** `app.dashboard.tsx:138/260/265` chama as RPCs `get_student_teacher_assignments` e `join_teacher_class`, que não existem no schema tipado (erro TS2345). Não há rotas `professor`/`teacher` no app nem no `routeTree.gen.ts`, mas o painel mostra textos como "Seu professor indicou o Ensina-me" e um campo de código de turma. Do jeito que está, o recurso dá erro ou fica vazio. Decisão necessária: remover esse bloco ou criar o backend.
5. **Tutor IA**: a função `ai-tutor` precisa da chave do provedor de IA nos secrets do Supabase. Sem ela, responde 503.
6. **As Edge Functions usam a chave de serviço com CORS `*`** (`bootstrap-admin`, `rebuild-pedagogia-materials-v4`, `source-discovery`, `ai-tutor`). Falta conferir em cada uma se o JWT e o papel admin são validados antes de usar a chave de serviço. `bootstrap-admin` é a mais sensível.

## Médio

7. **CI e E2E**: `e2e.yml` usa `bun install` sem `--frozen-lockfile`, ao contrário do `ci.yml`. Já o `sync-route-tree.yml` faz commit automático no main, o que pode colidir com o check `git diff --exit-code` do CI.
8. **Capacitor/Android**: `capacitor.config.json` aponta para `ensina-me-sigma.vercel.app`, um endereço externo ao preview e à publicação da Lovable. O app nativo carrega um site que pode estar desatualizado.
9. **Sincronização de login no `__root.tsx`**: invalida o roteador em `TOKEN_REFRESHED` (desnecessário, causa recarregamentos) e ignora `USER_UPDATED`. O cache de consultas também não é limpo no logout.
10. **Cores fixas** (`#172334`, `#0242D7`, `bg-white`…) espalhadas pelo dashboard em vez dos tokens do tema. O modo escuro só funciona porque cada cor tem um `dark:` manual, o que torna a manutenção frágil.

## Baixo

11. `__root.tsx`: o botão de erro diz "Go home" (em inglês) em uma interface toda em português.
12. `supabase/config.toml` configura apenas `ai-tutor`. As outras três funções usam o padrão, então vale confirmar se o `verify_jwt` delas está correto.
13. Muitas migrações de conteúdo editorial em sequência (v1…v5) deixam o histórico difícil de auditar. Não é um erro, só ruído.

## Verificado e correto

- Todas as 26 páginas em `src/routes` aparecem no `routeTree.gen.ts`, sem órfãs nem duplicatas de `/`.
- Não há arquivos de rota professor/teacher indevidos. O único resquício é o bloco no dashboard (item 4).
- Nenhuma chave de serviço no código do navegador. Ela aparece só em `client.server.ts` e nas Edge Functions.
- Não há server functions protegidas sem o middleware de autenticação (nenhuma usa `requireSupabaseAuth`).

## O que precisa de correção, se aprovado

Itens 1, 2, 3 (verificar e aplicar), 4 (com sua decisão), 6 e 9. Os itens 5 e 8 dependem de você: a chave de IA e a URL do app nativo. Os itens 7, 10, 11 e 12 são opcionais.

## Detalhes técnicos

- Item 1: remover as 4 flags do `tsconfig.json` de novo, tipar `ErrorComponent` com `ErrorComponentProps` e adicionar `override` só se a flag continuar.
- Item 3: consultar `pg_proc` no novo banco para listar as RPCs que existem e comparar com as chamadas `supabase.rpc(...)` do código.
