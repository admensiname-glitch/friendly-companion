# Direct do Ensina-me — especificação consolidada do MVP

**Status:** planejamento consolidado para implementação e validação.  
**Escopo deste documento:** registrar decisões já confirmadas; não representa implementação técnica nem comprovação de que os recursos já existem.  
**Idioma inicial:** português do Brasil (pt-BR).

## 1. Regras de execução

- Implementar no repositório existente do Ensina-me, preservando as funcionalidades atuais.
- Não alterar o projeto Benevva.
- Não depender de créditos do Lovable.
- Fazer mudanças pequenas, revisáveis e testáveis; não declarar uma função pronta sem evidência.
- O MVP só poderá ser liberado após cumprir todos os critérios da seção 9.
- As decisões ainda não confirmadas permanecem em aberto; não presumir uma resposta.

## 2. Conversas individuais e solicitações

- Uma nova conversa exige solicitação e aceitação do destinatário antes de liberar mensagens.
- Ao aceitar, a conversa é aceita imediatamente, abre e permite o envio de mensagens.
- Uma nova solicitação entre pessoas que já tiveram conversa aceita e encerrada exige nova aceitação.
- Solicitações pendentes não expiram automaticamente, salvo bloqueio ou outra regra de segurança.
- Solicitações recebidas ficam em uma aba no topo do Direct, com contador de pendentes.
- A aba **Enviadas** acompanha solicitações pendentes. Solicitações canceladas são retiradas da lista sem notificar o destinatário; solicitações recusadas saem da lista e ficam apenas em registro interno de segurança; solicitações aceitas saem da aba e passam à lista de conversas aceitas.
- O remetente pode cancelar uma solicitação a qualquer momento antes da aceitação.
- Após recusa, novas solicitações dessa pessoa ficam bloqueadas até o destinatário permitir novamente.
- A permissão para voltar a receber solicitações pode ser alterada nas configurações do Direct ou no perfil da pessoa; os dois locais devem permanecer sincronizados.
- Ao reautorizar, mostrar confirmação de que a pessoa poderá enviar uma nova solicitação, sem liberar mensagens automaticamente.
- Após reautorização, novas solicitações geram notificação no aplicativo e push, respeitando preferências de privacidade e permissões do dispositivo. O texto push será genérico: “Você recebeu uma nova solicitação de conversa no Ensina-me.”
- Se houver solicitação pendente quando ocorrer bloqueio, mantê-la registrada, mas impedir sua aceitação enquanto o bloqueio estiver ativo. Após desbloqueio, a solicitação antiga continua indisponível; será necessária uma nova solicitação. Mostrar: “Esta solicitação não está mais disponível. Você pode enviar uma nova solicitação.”
- Bloquear impede novas mensagens entre ambos, preserva o histórico autorizado e oculta a conversa da lista principal. Desbloquear permite uma nova solicitação, que exige aceitação.
- O perfil exibirá nome, foto e botão de solicitação apenas quando a solicitação for permitida. Se o destinatário não puder receber solicitações, ocultar o botão sem revelar o motivo específico.

## 3. Conversas, grupos e presença

- Separar a lista em abas de conversas individuais e grupos.
- Permitir fixar conversas individuais e grupos no topo das respectivas abas. A fixação é pessoal e sincroniza entre web e Android.
- Permitir arquivar conversas individuais e grupos numa área de arquivadas. O histórico permanece acessível e novas mensagens não desarquivam automaticamente.
- Mensagens individuais sempre geram notificação, respeitando silêncio e permissões do dispositivo.
- Cada estudante pode personalizar notificações por grupo.
- Marcar mensagens como lidas somente quando o estudante abrir a conversa e visualizar as mensagens.
- Cada estudante pode ativar ou desativar confirmações de leitura. O remetente só vê a confirmação se o destinatário mantiver o recurso ativado.
- Mostrar online e visto por último, permitindo ocultar ambos.
- Mostrar indicador de digitação aos participantes autorizados enquanto a pessoa escreve.

## 4. Mensagens de voz

- Mensagens de voz fazem parte do MVP; chamadas de áudio ao vivo ficam fora do MVP.
- Gravar e enviar sem limite fixo de duração, sujeitos aos limites técnicos e de envio.
- Interface de gravação: cronômetro, representação visual do áudio, pausar/continuar, ouvir, descartar e enviar.
- Ao tocar em enviar, transmitir imediatamente, sem segunda confirmação.
- Ao sair da tela durante a gravação, pausar automaticamente e preservar o áudio para continuar depois.
- Se uma ligação ou interrupção do sistema ocorrer durante a gravação, encerrar o trecho como rascunho separado, sem continuar a mesma gravação.
- Permitir que vários participantes gravem ao mesmo tempo, cada um com seu próprio áudio. Os demais participantes veem que alguém está gravando, sem acesso ao áudio.
- Reprodução manual por padrão; oferecer opção de reprodução automática sequencial.
- Em grupos, a reprodução sequencial segue a ordem cronológica, mesmo quando os áudios forem de remetentes diferentes.
- Controles de reprodução: reproduzir, pausar, retomar, avançar, retroceder e ajustar velocidade.
- Velocidade inicial de 1× e, depois, lembrar a última velocidade escolhida.
- Quando suportado, alternar automaticamente entre alto-falante e áudio auricular ao aproximar o telefone do ouvido.
- Manter qualidade padrão independentemente do tipo de conexão.
- Não incluir transcrição nem legenda no MVP; avaliar transcrição numa fase futura.
- Indicadores de envio: enviando, enviado, entregue e lido, respeitando as configurações de confirmação de leitura.
- Permitir apagar para todos até 15 minutos após o envio; depois desse prazo, só remover da própria visualização.
- Se o envio falhar, preservar o áudio, tentar novamente automaticamente quando possível e oferecer reenvio manual.

## 5. Rascunhos de voz

- Rascunhos permanecem privados até o envio; somente o autor pode acessá-los.
- Manter rascunhos até o estudante enviar ou descartar, sujeito aos limites de armazenamento.
- Sincronizar rascunhos entre dispositivos autorizados.
- Mostrar espaço ocupado e avisar quando o armazenamento estiver próximo do limite, solicitando envio ou descarte.
- Em falha de sincronização, manter o áudio no dispositivo de origem, mostrar sincronização pendente, tentar novamente automaticamente e oferecer repetição manual.
- Em conflito de edição entre dispositivos, usar a última alteração confirmada e preservar temporariamente a outra versão por 24 horas para recuperação.
- Descartar um rascunho individual imediatamente ao tocar no comando, sem segunda etapa.
- Ao sair de uma conversa com áudio não enviado, preservar o rascunho privado e mostrar indicador discreto de áudio pendente junto à conversa.
- Identificar vários rascunhos pela ordem de criação e mostrar duração, horário e conversa correspondente. Organizar cronologicamente; não incluir busca específica no MVP.
- Para descarte em lote, permitir seleção individual, múltipla e “Selecionar todos”; mostrar quantidade e pedir confirmação. Após confirmação, o descarte é definitivo para o estudante, sem desfazer ou lixeira. Sincronizar o descarte entre dispositivos autorizados sem afetar mensagens já enviadas.

## 6. Configurações, acessibilidade e apresentação

- Categorias de configurações: **Privacidade e segurança**, **Notificações**, **Conversas e grupos**, **Mensagens de voz**.
- Salvar e aplicar automaticamente cada alteração, com indicação discreta de estado “Salvo”.
- Se não for possível salvar, preservar a alteração local, mostrar “Aguardando sincronização” e tentar novamente automaticamente. Não declarar sucesso antes da confirmação do servidor.
- Em conflitos entre dispositivos, prevalece a alteração mais recente do estudante, segundo a ordem confirmada pelo sistema; alterações antigas não podem sobrescrever uma nova já confirmada.
- Respeitar automaticamente as preferências de acessibilidade do Android e navegador; oferecer controles complementares quando necessários.
- Idioma inicial apenas português do Brasil.
- Na primeira abertura, apresentar resumo curto das funções principais e acesso à ajuda; dispensável, sem tutorial obrigatório e sem reaparecer repetidamente após ser dispensado, salvo consulta voluntária.
- Combinar artigos na central de ajuda existente com explicações contextuais nas telas importantes.
- Quando houver um conjunto significativo de melhorias, preparar um resumo de novidades sem calendário fixo; não interromper o uso. A forma de divulgação desse resumo ainda está pendente de decisão.

## 7. Sugestões anônimas

- Acesso discreto e voluntário para enviar sugestões; não solicitar avaliações automaticamente.
- Campo de texto livre, sem anexos.
- A equipe não verá a identidade do estudante associada à sugestão; a anonimização deve existir no fluxo de análise, não apenas na interface.
- Antes do envio, mostrar aviso para não incluir dados pessoais e exigir confirmação de que o texto não contém dados pessoais.
- Após o envio, mostrar somente confirmação de recebimento, sem acompanhamento de status nem promessa de resposta, análise ou implementação.
- Usar o canal de suporte já existente para problemas; não criar suporte independente para o Direct no MVP.
- Não compartilhar automaticamente conteúdo de conversas privadas com o suporte.

## 8. Segurança, menores e incidentes

- Aplicar proteções exigidas pela legislação e políticas de proteção pertinentes à idade, com controles adicionais quando necessários. Requisitos específicos devem passar por avaliação jurídica e de proteção infantil antes da implementação.
- Monitoramento contínuo de erros, falhas de envio, notificações, sincronização e incidentes de segurança, com alertas para situações críticas.
- Em incidente crítico, conter imediatamente o risco limitando ou suspendendo apenas a funcionalidade afetada quando necessário; preservar evidências e investigar.
- Reativar a funcionalidade afetada somente após testes que confirmem correção, segurança e integridade dos dados.
- Comunicar diretamente os estudantes impactados, em linguagem clara, sem expor detalhes de segurança.
- Não manter histórico público de incidentes; conservar registros internos necessários com acesso restrito e retenção apropriada.
- Sugestões, registros de segurança e telemetria devem minimizar dados coletados e restringir o acesso.

## 9. Critérios obrigatórios para lançamento

O MVP só pode ser liberado quando **todos** os critérios forem atendidos:
1. Segurança e privacidade validadas, incluindo permissões, bloqueios, denúncias, proteção de menores e isolamento de conversas.
2. Testes funcionais completos para solicitações, mensagens individuais, grupos, áudio, notificações, rascunhos e sincronização.
3. Validação dos fluxos essenciais em web e Android.
4. Acessibilidade e usabilidade verificadas.
5. Nenhum defeito conhecido de qualquer gravidade.

A estratégia é lançar o conjunto do MVP após conclusão e validação, sem lançamento público antecipado com funcionalidades essenciais incompletas.

## 10. Decisões pendentes que não devem ser presumidas

- Forma de divulgação dos resumos de novidades: notificação discreta, central de novidades ou ambos.
- Quaisquer detalhes de implementação que dependam de inspeção do código, esquema do banco, políticas RLS, permissões móveis e infraestrutura atual.
- Requisitos legais específicos e regras por faixa etária, que precisam de avaliação especializada.

## 11. Ordem de execução sugerida

1. Auditar arquitetura atual, rotas, banco, autenticação, RLS, notificações e build; identificar funcionalidades existentes e lacunas.
2. Propor arquitetura e migrações mínimas antes de alterar dados ou políticas.
3. Implementar primeiro o núcleo seguro: solicitações, aceitação, bloqueio/desbloqueio, mensagens e RLS.
4. Implementar listas, grupos, leitura/presença/notificações.
5. Implementar áudio e ciclo de vida seguro dos rascunhos.
6. Implementar configurações, sugestões anônimas, ajuda e apresentação inicial.
7. Executar testes funcionais, segurança, acessibilidade e validação web/Android; corrigir todos os defeitos conhecidos antes da liberação.

Cada etapa deverá produzir evidências verificáveis (diff, testes, resultados de CI quando disponíveis). Este documento é a especificação, não prova de que qualquer etapa foi executada.
