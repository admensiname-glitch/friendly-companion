# Plano de correção — auditoria jurídica do Ensina-me

Data da revisão: 22/10/2026  
Escopo inicial: repositório `admensiname-glitch/friendly-companion`, branch `main`.  
Status: plano interno de remediação; não é parecer jurídico nem prova de conformidade do ambiente publicado.

## Regras de execução

- Não declarar conformidade sem evidência verificável do ambiente real.
- Não inventar controlador, encarregado, e-mail, endereço, fornecedores, prazos de retenção ou bases legais.
- Não alterar fluxos visíveis aos estudantes, cadastro, permissões, mensagens, consentimentos, coleta de dados ou comportamento de IA sem aprovação explícita do responsável pelo produto.
- Testes de segurança devem usar contas e dados sintéticos controlados; nunca consultar dados reais de estudantes.
- Não executar migrações no banco de produção como parte desta auditoria sem revisão e aprovação separadas.

## Achados iniciais

### J-01 — Política de Privacidade tem campos operacionais pendentes
Arquivo: `src/routes/privacidade.tsx`.

A página declara que a identidade do controlador, o canal de privacidade e os contatos devem ser preenchidos pelo responsável antes do lançamento. A seção de solicitações também remete a um canal genérico, sem identificar o contato na própria página.

**Ação:** o responsável legal deve fornecer e confirmar:
1. nome/razão social e dados de identificação do controlador;
2. canal real para solicitações de titulares e reclamações;
3. identificação e contato do encarregado, quando aplicável;
4. fornecedores e operadores efetivamente usados, finalidades, dados enviados, retenção e eventual transferência internacional;
5. procedimento real para solicitações de titulares e incidentes.

Não preencher com dados presumidos. A publicação da política deve ser conferida no domínio efetivamente utilizado.

**Base para análise:** LGPD, arts. 6º, 9º, 14, 18, 37, 41 e 46, conforme aplicabilidade.

### J-02 — Fluxo para menores de idade não comprovado
Arquivo a revisar: `src/routes/cadastro.tsx` e fluxos relacionados de autenticação/onboarding.

O formulário inspecionado coleta nome, e-mail e senha, mas não demonstrou aferição de idade nem um fluxo específico para menores. Isso não prova que controles não existam em outras partes do produto.

**Ação:** mapear a faixa etária efetivamente aceita e a aplicabilidade das regras específicas para crianças e adolescentes; documentar base legal e melhor interesse; verificar exigências de idade, transparência, configurações protetivas e supervisão parental quando aplicáveis. Não adicionar bloqueio de idade, consentimento parental, coleta de data de nascimento ou novo passo de cadastro sem autorização do responsável pelo produto, pois isso muda a experiência do aluno.

**Base para análise:** LGPD, art. 14; Lei nº 15.211/2025 (ECA Digital) e regulamentação vigente aplicável. Confirmar a redação consolidada e a aplicabilidade com assessoria jurídica.

### J-03 — Autorização e isolamento do Direct
Arquivos iniciais: migrações em `supabase/migrations/`, incluindo `20261021185229_direct_foundation_operational.sql` e `20261022040000_security_hardening_direct_community.sql`.

Há políticas RLS e verificações de participação, mas leitura de código não substitui testes de autorização no banco efetivamente implantado.

**Ação de validação (sem dados reais):**
- Conta A não consegue ler, alterar ou excluir conversa, mensagens ou preferências da conta B sem autorização.
- Um membro não consegue inserir a si próprio em conversa alheia nem elevar privilégios.
- Bloqueio impede as ações definidas pelo produto e não vaza informação por busca de pessoas.
- Solicitações pendentes, aceite, rejeição e desbloqueio respeitam o fluxo autorizado.
- Usuários anônimos e não autenticados não conseguem consultar dados privados.
- Conferir grants, RLS, funções SECURITY DEFINER/INVOKER e privilégios do schema no banco de staging.

Registrar consulta/teste, resultado e commit da migração; não marcar como corrigido apenas por existir uma policy.

**Base para análise:** LGPD, arts. 6º, VII e VIII, e 46.

### J-04 — Dados enviados ao Tutor e fornecedores de IA
Arquivo inicial: `supabase/functions/ai-tutor/index.ts`; mapear também funções de prova/correção e logs.

**Ação:** produzir inventário de campos enviados, finalidade, fornecedor, região de processamento, retenção, uso para treinamento (conforme contrato/configuração), controles de acesso e procedimento de exclusão. Verificar se mensagens, respostas, identificadores ou dados de menores são transmitidos desnecessariamente. Não alterar fornecedor ou conteúdo enviado sem revisão e autorização, pois pode alterar a experiência do aluno.

**Base para análise:** LGPD, arts. 6º, 9º, 14, 33–36 e 46, conforme aplicabilidade.

### J-05 — Direitos do titular e ciclo de vida dos dados
**Ação:** localizar e testar os fluxos reais de acesso, correção, exclusão/anonimização quando cabível, revogação de consentimento quando aplicável e atendimento ao titular. Documentar exceções legais de retenção, backups e dados enviados a operadores. Não apagar dados reais como teste.

**Base para análise:** LGPD, arts. 18 e 19, entre outros aplicáveis.

### J-06 — Acessibilidade
**Ação:** executar auditoria automatizada e manual de teclado, foco, semântica, leitor de tela, contraste, formulários, erros e avaliações. Corrigir problemas sem mudar fluxos funcionais; se uma correção alterar o fluxo do aluno, solicitar aprovação antes.

**Base para análise:** Lei nº 13.146/2015, art. 63, conforme aplicabilidade.

### J-07 — Termos, preço e cancelamento
Arquivo: `src/routes/termos.tsx`.

**Ação:** conferir se a URL canônica corresponde ao domínio oficial real antes de alterá-la; o arquivo contém uma URL antiga de preview. Revisar oferta, renovação, cancelamento, suporte e responsabilidades conforme o serviço realmente comercializado. Confirmar preço e condições com o responsável; não inventar termos de cobrança.

**Base para análise:** CDC, arts. 6º, 30, 31, 46 e 49, conforme aplicabilidade.

## Critério de encerramento

Cada item só pode ser marcado como:
- **Conforme verificado:** evidência do código e/ou teste do ambiente real anexada.
- **Não conforme:** requisito aplicável e falha demonstrada por evidência reproduzível.
- **Pendente:** falta dado, teste, decisão do controlador ou confirmação jurídica.

Nenhum item está automaticamente aprovado por este documento. A próxima etapa é reunir os dados reais do controlador/operadores e executar testes em ambiente de staging, com dados sintéticos, antes de preparar correções de produção.
