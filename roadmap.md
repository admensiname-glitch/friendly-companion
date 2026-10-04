# Roadmap

- [x] Corrigir a compilação atual do shell autenticado.
- [x] Implementar cabeçalho, barra inferior e bottom sheet mobile-first.
- [ ] Reorganizar a Home para estudo imediato, progresso e continuidade.
- [ ] Aplicar linguagem app-like nas telas do aluno sem alterar lógica ou dados.
- [ ] Refinar estudo, prática e Modo Prova para uso móvel.
- [ ] Validar build, runtime, mobile, desktop e dark mode.

## Rodada de correção técnica

- [x] Zerar erros de TypeScript sem desativar flags de segurança (52 → 0).
- [x] Zerar erros de lint (prefer-const em previewAuthStorage).
- [x] Remover fluxo professor/turma do dashboard do aluno.
- [x] Alinhar tipos às RPCs reais (start_exam tipado localmente).
- [~] GRANTs das funções de prova: migration pronta, ferramenta de migration bloqueada — SQL entregue para execução manual.
- [x] rebuild-pedagogia-materials-v4: token administrativo agora via header x-rebuild-token.
- [~] Proteção de senha vazada: só via painel Supabase (Auth → Password Security) — documentado.
- [x] Capacitor: URL Vercel substituída pela URL estável do projeto Lovable.
- [x] CI/E2E padronizados com bun install --frozen-lockfile.
- [x] Regressões verificadas: sem imports quebrados, window.location só em reload legítimo, sem segredos no frontend.
