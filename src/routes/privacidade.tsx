import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade e Proteção de Dados | Ensina-me" },
      { name: "description", content: "Como o Ensina-me trata dados pessoais e atende aos direitos previstos na Lei Geral de Proteção de Dados (LGPD)." },
      { property: "og:title", content: "Política de Privacidade e Proteção de Dados | Ensina-me" },
      { property: "og:description", content: "Transparência sobre dados pessoais, finalidades, segurança e direitos dos titulares." },
      { name: "robots", content: "index,follow" }
    ]
  }),
  component: Privacidade
});

function Privacidade() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#172334]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Link to="/" className="text-sm font-semibold text-[#0242D7]">← Ensina-me</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Política de Privacidade e Proteção de Dados</h1>
        <p className="mt-3 text-sm text-[#64748B]">Lei nº 13.709/2018 — Lei Geral de Proteção de Dados (LGPD).</p>
        <p className="mt-5 rounded-xl border border-[#DCE4ED] bg-white p-4 text-sm leading-6 text-[#475569]">
          Esta política descreve as práticas que devem reger o tratamento de dados pessoais no Ensina-me. Antes do lançamento público, o responsável pela operação deve preencher os dados reais do controlador, o canal de privacidade e os fornecedores efetivamente utilizados. Não inventamos contatos ou responsáveis.
        </p>
        <div className="mt-10 space-y-7 text-sm leading-7 text-[#475569]">
          <section><h2 className="text-lg font-bold text-[#172334]">1. Controlador e contato</h2><p>O controlador é a pessoa física ou jurídica responsável pelas decisões sobre o tratamento de dados no Ensina-me. Sua identidade, contato oficial e, quando aplicável, contato do encarregado devem ser informados aqui pelo responsável legal antes do lançamento. Até que esses dados sejam confirmados, esta página não identifica uma pessoa ou empresa por suposição.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">2. Dados tratados</h2><p>Conforme as funcionalidades utilizadas, podem ser tratados: dados de conta e autenticação (como e-mail e identificadores técnicos); perfil (como nome de exibição, foto e preferências); dados acadêmicos (disciplinas, progresso, respostas, resultados, revisões e recomendações); conteúdo enviado à Comunidade, ao Direct, ao Tutor e ao suporte; e dados técnicos mínimos para segurança, prevenção de abuso e diagnóstico de falhas.</p><p className="mt-2">Evite inserir dados pessoais sensíveis, senhas, documentos ou informações de terceiros em campos de texto livre. Só devem ser coletados dados adequados, pertinentes e limitados ao necessário.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">3. Finalidades e bases legais</h2><p>Os dados podem ser utilizados para criar e proteger contas, oferecer materiais e exercícios, registrar progresso, gerar feedback educacional, permitir comunicação escolhida pelo usuário, responder a solicitações, prevenir fraude, manter a integridade do serviço e cumprir obrigações legais. Cada finalidade deve ter base legal aplicável nos termos da LGPD, como execução de contrato, obrigação legal, exercício regular de direitos, legítimo interesse após avaliação apropriada ou consentimento quando necessário. A publicação desta política, por si só, não constitui consentimento.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">4. Tutor e recursos de IA</h2><p>Ao utilizar o Tutor ou recursos automatizados, o texto enviado e o contexto necessário podem ser processados para produzir explicações e feedback. Não inclua informações pessoais desnecessárias. O responsável deve manter documentados os fornecedores efetivamente usados, os dados transmitidos, as finalidades e os prazos de retenção, e informar mudanças materiais.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">5. Compartilhamento e transferência internacional</h2><p>Fornecedores de hospedagem, autenticação, banco de dados, armazenamento, suporte ou IA podem processar dados estritamente necessários para prestar os serviços contratados. O controlador deve manter a lista real de operadores e avaliar suas garantias. O Ensina-me não deve vender dados pessoais. Se houver transferência internacional, ela deve observar a LGPD e a regulamentação aplicável da ANPD.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">6. Retenção e eliminação</h2><p>Os dados devem ser mantidos pelo tempo necessário às finalidades informadas, à segurança e às obrigações legais. Após esse período, serão eliminados ou anonimizados, salvo quando a conservação tiver fundamento legal. Cópias de segurança podem persistir por período limitado conforme o ciclo técnico de retenção.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">7. Segurança e incidentes</h2><p>O Ensina-me busca aplicar controles técnicos e administrativos proporcionais ao risco, incluindo autenticação, controle de permissões, regras de acesso ao banco e prevenção de abuso. Nenhum sistema oferece garantia absoluta. Incidentes devem ser avaliados e tratados conforme a LGPD e as regras da ANPD, inclusive quanto à comunicação a titulares e autoridades quando exigida.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">8. Direitos dos titulares</h2><p>Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade, informações sobre compartilhamento, portabilidade quando aplicável, revisão de decisões unicamente automatizadas nos termos legais e revogação de consentimento quando essa for a base legal. A identidade poderá ser verificada de forma proporcional para impedir divulgação a terceiros. Alguns dados podem ser mantidos por obrigação legal ou exercício regular de direitos.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">9. Crianças e adolescentes</h2><p>Se o serviço tratar dados de crianças ou adolescentes, deverá observar o melhor interesse e as exigências específicas da LGPD e da legislação aplicável, incluindo os requisitos de transparência e consentimento quando cabíveis. A operação deve definir os fluxos apropriados antes de direcionar o serviço a esse público.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">10. Cookies e armazenamento local</h2><p>Recursos técnicos de sessão e armazenamento podem ser necessários à autenticação e ao funcionamento. Qualquer uso adicional para análise, publicidade ou rastreamento deve ser identificado e informado, e depender de escolha do usuário quando exigido pela legislação. A descrição final deve refletir os recursos realmente ativos.</p></section>
          <section><h2 className="text-lg font-bold text-[#172334]">11. Canal para solicitações e atualizações</h2><p>Para exercer direitos ou relatar questões de privacidade, utilize o canal oficial de suporte disponibilizado na plataforma. O responsável deve publicar aqui um contato válido do controlador/encarregado antes do lançamento público. Esta política pode ser atualizada para refletir mudanças no serviço, no tratamento ou na legislação; mudanças relevantes devem ser comunicadas de forma apropriada.</p></section>
        </div>
        <footer className="mt-12 border-t border-[#DCE4ED] pt-6 text-sm"><Link to="/termos" className="text-[#0242D7]">Termos de uso</Link></footer>
      </div>
    </main>
  );
}
