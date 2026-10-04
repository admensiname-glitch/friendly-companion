# Transformação mobile-first do Ensina-me

## Objetivo
Converter a área autenticada em uma experiência de aplicativo educacional mobile-first, preservando rotas, dados, regras de aprendizagem, identidade e funcionalidades atuais.

## Implementação
1. **Base visual e navegação**
   - Corrigir o erro de sintaxe atual que impede a compilação.
   - Evoluir o shell autenticado com cabeçalho mobile compacto, logo existente, acesso ao perfil e notificações.
   - Reorganizar a barra inferior para Início, Estudar, Praticar, Revisão e Mais.
   - Trocar “Mais” por um bottom sheet acessível, com catálogo, desempenho, modo prova, perfil, tema e saída.
   - Aplicar safe areas, alvos de toque de no mínimo 44px e manter a sidebar no desktop.

2. **Home orientada à próxima ação**
   - Compactar a saudação e colocar “o que estudar agora” no primeiro plano.
   - Tornar meta diária e progresso geral mais visuais e escaneáveis.
   - Exibir continuidade e disciplinas em cards compactos próprios para toque e rolagem mobile.
   - Manter os mesmos RPCs, dados e destinos atuais.

3. **Telas do aluno**
   - Padronizar cabeçalhos, cards, listas, vazios, carregamentos e ações nas telas de disciplinas, catálogo, revisão, desempenho, perfil e “Estude agora”.
   - Reduzir densidade no celular sem remover informações ou ações.
   - Preservar o dark mode com tokens semânticos.

4. **Estudo, prática e prova**
   - Melhorar largura de leitura, progresso e ações persistentes do material no celular.
   - Dar às alternativas e controles de exercícios/prova alvos grandes e estados claros.
   - Ajustar navegação de questões e ações finais para não colidirem com a barra inferior.

5. **Validação**
   - Conferir metadados próprios das rotas alteradas.
   - Validar compilação e erros de execução.
   - Testar visualmente Home, disciplinas, estudo, revisão e modo prova em viewport mobile; corrigir cortes, sobreposições e quebras evidentes.
   - Confirmar que desktop e dark mode continuam funcionais.

## Detalhes técnicos
- Mudanças restritas à apresentação e composição React/CSS já existentes.
- Nenhuma alteração em Supabase, schema, RPCs, contratos de dados, conteúdo pedagógico ou regras do Modo Prova.
- Componentes compartilhados serão usados apenas quando reduzirem inconsistência sem mudar a arquitetura existente.
