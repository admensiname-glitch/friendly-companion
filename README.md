# Ensina-me

Plataforma universitária de aprendizagem com IA para estudo orientado por conteúdo acadêmico confiável.

## Arquitetura

- TanStack Start + React + TypeScript
- TanStack Router com rotas file-based
- Supabase para Auth, PostgreSQL, RLS, RPCs e Edge Functions
- Tutor acadêmico com OpenAI Responses API
- Catálogo global de disciplinas e tópicos, independente da matriz curricular individual
- Fluxo pedagógico: conteúdo → prática → feedback → revisão → avaliação → domínio

## Estado atual

O MVP já possui autenticação e onboarding, dashboard personalizado, catálogo global, materiais didáticos rastreáveis, exercícios de aplicação, avaliações formais, mapa de dificuldades, sessões de estudo, revisão, desempenho, área administrativa e tutor de IA por tópico.

O tutor exige autenticação por JWT no gateway, limita o uso individual a 60 mensagens nas últimas 24 horas, mantém histórico por tópico, usa o material publicado como contexto prioritário e possui timeout para evitar requisições presas.

## Desenvolvimento local

Requisitos: Node.js ou Bun.

```sh
git clone <url-do-repositorio>
cd friendly-companion
bun install
bun run dev
```
