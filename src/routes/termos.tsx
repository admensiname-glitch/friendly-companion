import { Link, createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso | Ensina-me" },
      { name: "description", content: "Consulte os termos de uso da plataforma educacional Ensina-me." },
      { property: "og:title", content: "Termos de uso | Ensina-me" },
      { property: "og:description", content: "Consulte os termos de uso da plataforma educacional Ensina-me." },
      { name: "twitter:title", content: "Termos de uso | Ensina-me" },
      { name: "twitter:description", content: "Consulte os termos de uso da plataforma educacional Ensina-me." },
      { name: "robots", content: "index,follow" }
    ],
    links: [{ rel: "canonical", href: "https://ensina-buddy-app.lovable.app/termos" }]
  }),
  component: Termos
});
function Termos(){return <main className="min-h-screen bg-[#F8FAFC] text-[#172334]"><div className="mx-auto max-w-3xl px-5 py-10 sm:px-8"><Link to="/" className="text-sm font-semibold text-[#0242D7]">← Ensina-me</Link><h1 className="mt-8 text-4xl font-bold tracking-tight">Termos de uso</h1><p className="mt-3 text-sm text-[#64748B]">Versão inicial — 3 de outubro de 2026.</p><div className="mt-10 space-y-7 text-sm leading-7 text-[#475569]"><section><h2 className="text-lg font-bold text-[#172334]">1. Sobre o serviço</h2><p>O Ensina-me é uma plataforma de apoio à aprendizagem universitária. Os conteúdos, exercícios, feedbacks e recursos de estudo têm finalidade educacional e não substituem orientações oficiais da instituição de ensino.</p></section><section><h2 className="text-lg font-bold text-[#172334]">2. Conta e segurança</h2><p>Você é responsável pela exatidão dos dados fornecidos e pela proteção das credenciais da sua conta. Não compartilhe sua senha com terceiros.</p></section><section><h2 className="text-lg font-bold text-[#172334]">3. Conteúdo acadêmico</h2><p>O Ensina-me organiza e simplifica materiais educacionais e referências acadêmicas. Quando uma fonte externa for apresentada, ela deve ser consultada na forma original para verificar contexto e detalhes.</p></section><section><h2 className="text-lg font-bold text-[#172334]">4. Uso aceitável</h2><p>Não utilize a plataforma para tentar acessar dados de outras pessoas, interferir no funcionamento do serviço, automatizar abusos ou violar direitos de terceiros.</p></section><section><h2 className="text-lg font-bold text-[#172334]">5. Disponibilidade</h2><p>O serviço pode passar por manutenção, correções e mudanças. Funcionalidades experimentais podem ser alteradas durante a evolução do produto.</p></section><section><h2 className="text-lg font-bold text-[#172334]">6. Contato</h2><p>Para solicitações relacionadas à conta ou ao uso da plataforma, utilize o canal de suporte disponibilizado pelo Ensina-me.</p></section></div><footer className="mt-12 border-t border-[#DCE4ED] pt-6 text-sm"><Link to="/privacidade" className="text-[#0242D7]">Política de Privacidade</Link></footer></div></main>}
