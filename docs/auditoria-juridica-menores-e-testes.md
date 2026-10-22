# Proposta protetiva para menores e plano de testes de autorização
**Status: PROPOSTA PARA APROVAÇÃO. Não altera cadastro, banco ou experiência do aluno.**  
**Data:** 22/10/2026  
**Repositório:** `admensiname-glitch/friendly-companion`

## 1. Evidência observada no código
O formulário `src/routes/cadastro.tsx` pede nome, e-mail, senha e confirmação. Não solicita data de nascimento nem demonstra, neste arquivo, um fluxo de idade/responsável. Isso não prova que inexista controle em outra parte, no provedor de autenticação ou no ambiente publicado. O fluxo real precisa ser mapeado antes de decidir a implementação.

## 2. Proposta protetiva para menores — sem implementar ainda
A Lei nº 15.211/2025 (ECA Digital) aplica-se a serviços direcionados a crianças e adolescentes ou de acesso provável por eles; o fato de o Ensina-me ser educacional e aceitar universitários não afasta, sozinho, a necessidade de avaliar o público provável e os riscos. A ANPD publicou orientações preliminares sobre aferição de idade e informa que os mecanismos devem ser proporcionais, confiáveis e compatíveis com privacidade e minimização de dados. A aplicação concreta precisa ser confirmada com assessoria jurídica.

### Etapa A — definir público e risco
1. Confirmar público-alvo pretendido, idade mínima pretendida, marketing, canais de aquisição, conteúdo e uso previsível por menores.
2. Fazer avaliação documentada de risco e de melhor interesse para cadastro, Tutor/IA, Direct, grupos, perfil e comunidade.
3. Separar exigências legais por faixa etária; não presumir que uma única regra de consentimento parental se aplique indistintamente a toda pessoa menor de 18 anos.

### Etapa B — escolher a solução de idade com minimização
- Comparar opções proporcionais: sinal de idade fornecido por plataforma/dispositivo quando disponível, verificação por terceiro confiável ou outro mecanismo adequado ao risco e à regulamentação.
- Preferir receber apenas um resultado ou faixa etária necessária, sem armazenar cópia de documento ou data completa de nascimento se não for necessário.
- Documentar precisão, falsos positivos/negativos, acessibilidade, proteção contra discriminação, segurança, retenção e finalidade exclusiva.
- Não implementar apenas uma caixa de seleção como se fosse verificação robusta quando a legislação exigir mecanismo confiável.
- Não adicionar data de nascimento, documento, conta de responsável ou bloqueio de acesso antes da aprovação do responsável pelo produto e da validação jurídica.

### Etapa C — proteções por padrão e supervisão
Avaliar, conforme aplicabilidade e risco: perfil e visibilidade privados por padrão para menores; controles simples de quem pode encontrar, contatar e adicionar o estudante; restrições contra contato indesejado; denúncia e bloqueio claros; mecanismos de supervisão parental acessíveis quando exigidos; informação compreensível para jovem e responsável; e tratamento específico de riscos do Tutor/IA e de mensagens. Qualquer mudança funcional deve ser apresentada para aprovação antes de codificar.

### Etapa D — transparência e governança
- Documentar finalidade, base legal, campos coletados, fornecedor, retenção, acesso e exclusão.
- Considerar relatório de impacto/avaliação de risco conforme as obrigações aplicáveis.
- Definir atendimento de direitos e resposta a incidentes envolvendo menores.
- Reavaliar após mudanças materiais de funcionalidades, público, fornecedores ou lei.

## 3. Plano de testes Direct/Comunidade — somente leitura até autorização
Não foi possível executar testes de integração contra um ambiente Supabase de staging nesta rodada; a revisão abaixo é análise estática do código, não um teste real de acesso.

### Achado prioritário a validar
Na migração `supabase/migrations/20261021185229_direct_foundation_operational.sql`, linhas aproximadas 264–272, a policy `direct_members_self_update` permite UPDATE para o próprio `user_id` e exige que a pessoa continue membro da conversa, mas não compara/restringe explicitamente a coluna `role`. A própria migração comenta que a intenção é impedir promoção de papel. Como o arquivo concede UPDATE em `direct_conversation_members` a `authenticated`, isso cria uma **suspeita forte de elevação de privilégio via alteração de role** se a policy estiver implantada como escrita e não houver outro controle (por exemplo, trigger ou privilégios por coluna). É uma conclusão de revisão estática, ainda não uma exploração confirmada no banco de produção.

**Não corrigir sem autorização**, conforme instrução do responsável. A correção proposta para revisão é retirar a capacidade do cliente de alterar campos privilegiados (por exemplo, UPDATE apenas de colunas permitidas por grant/controle equivalente) e manter alterações de preferências via RPCs que validem a identidade e a associação. Escolher e validar a implementação antes de aplicar migração.

### Casos de teste com contas fictícias
Executar somente em staging, com dados sintéticos:
1. Conta A tenta alterar seu próprio `role` para `owner`/ `admin`; deve falhar.
2. Conta A tenta mudar `user_id` ou `conversation_id` da linha de associação; deve falhar.
3. A tenta ler, editar ou excluir mensagens de conversa de B sem ser membro; deve falhar.
4. A tenta enviar mensagem usando `sender_id` de B; deve falhar.
5. A tenta aceitar/recusar uma solicitação endereçada a B; deve falhar.
6. A bloqueia B; busca de pessoas, novas solicitações e aceitação de pedidos devem respeitar o bloqueio nos dois sentidos conforme regra de produto.
7. A tenta criar grupo com identificadores inválidos, duplicados, bloqueados ou sem perfil; a operação deve rejeitar de forma consistente com a política do produto.
8. Conta anônima e conta não autenticada tentam chamar RPCs, ler tabelas ou acessar arquivos de áudio privados; não devem obter dados privados.
9. Testar RLS efetiva, grants, funções SECURITY DEFINER, bucket `direct-voice`, realtime e policies cumulativas.
10. Na Comunidade, autor e dono da publicação devem ter apenas os poderes de moderação pretendidos; outros estudantes não devem excluir comentários de terceiros ou acessar dados não públicos.

Para cada caso: registrar usuário sintético, operação, resultado esperado/observado, evidência sem dados pessoais e commit/migração correspondente. Nunca testar com contas reais de estudantes.

## 4. Fontes oficiais para validação jurídica
- Lei nº 15.211/2025 — ECA Digital, Planalto: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm
- ANPD — página oficial ECA Digital e aferição de idade: https://www.gov.br/anpd/pt-br/assuntos/noticias/eca-digital
- ANPD — orientações preliminares de aferição de idade (PDF): https://www.gov.br/anpd/pt-br/assuntos/eca-digital/mecanismos-confiaveis-de-afericao-de-idade-orientacoes-preliminares.pdf
- LGPD — Lei nº 13.709/2018, Planalto: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

## 5. Decisões ainda necessárias
- Qual faixa etária o Ensina-me pretende aceitar e qual é o público-alvo efetivo?
- O responsável aprova investigar a solução de idade primeiro, sem adicionar ainda campos ou bloqueios ao cadastro?
- O responsável autoriza uma migração corretiva proposta para a policy de role **somente após** o teste de staging e apresentação do diff?
- Quem é o controlador e qual é o canal real de privacidade?
- Quais fornecedores de IA/hospedagem estão ativos e quais contratos/configurações de retenção se aplicam?
