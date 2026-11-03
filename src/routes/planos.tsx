import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, ArrowRight, BookOpen, Brain, ChartNoAxesCombined, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos | Ensina-me" },
      { name: "description", content: "Conheça os planos do Ensina-me e escolha como organizar, praticar e aprofundar seus estudos universitários." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PlansPage,
});

const benefits = [
  { icon: BookOpen, title: "Conteúdo e disciplinas", description: "Acesse os conteúdos acadêmicos e organize seus estudos por disciplina e tópico." },
  { icon: Brain, title: "Tutor", description: "Tire dúvidas e aprofunde sua compreensão com apoio inteligente." },
  { icon: RefreshCw, title: "Prática e revisão", description: "Pratique, receba feedback e retome os assuntos que precisam de atenção." },
  { icon: ChartNoAxesCombined, title: "Acompanhamento", description: "Visualize sua evolução e tenha mais clareza sobre os próximos passos." },
];

const comparison = [
  { feature: "Conteúdos acadêmicos essenciais", free: "Incluído", complete: "Incluído" },
  { feature: "Organização por disciplinas e tópicos", free: "Incluído", complete: "Incluído" },
  { feature: "Explicações e materiais de estudo", free: "Incluído", complete: "Incluído" },
  { feature: "Prática e exercícios", free: "Uso básico", complete: "Limites ampliados" },
  { feature: "Tutor", free: "Uso limitado", complete: "Limites ampliados" },
  { feature: "Recursos multimodais do Tutor", free: "Disponibilidade conforme limite", complete: "Limites ampliados" },
  { feature: "Revisão e acompanhamento", free: "Essencial", complete: "Ampliado" },
  { feature: "Relatórios de desempenho", free: "Visão básica", complete: "Visão detalhada" },
  { feature: "Modo de prova", free: "Disponível", complete: "Disponível" },
];

function PlansPage() {
  return (
    <main className="min-h-screen bg-white text-[#14233B]">
      <header className="sticky top-0 z-40 border-b border-[#E8EDF5] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1160px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Ensina-me, página inicial" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"><BrandLogo /></Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-2 sm:gap-4">
            <Link to="/" className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-[#526178] transition hover:bg-[#F4F7FC] sm:inline-flex">Início</Link>
            <Link to="/login" className="rounded-xl px-3 py-2.5 text-sm font-bold text-[#34445D] transition hover:bg-[#F4F7FC]">Entrar</Link>
            <Link to="/cadastro" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0242D7] px-4 text-sm font-bold text-white transition hover:bg-[#0039B9] sm:px-5">Criar conta</Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-[#E8EDF5] bg-[#FBFCFF]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-48 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#EAF1FF] blur-3xl" />
        <div className="mx-auto max-w-[980px] px-4 pb-14 pt-14 text-center sm:px-6 sm:pb-20 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#DCE7FF] bg-white px-3.5 py-2 text-xs font-extrabold tracking-wide text-[#0242D7]"><Sparkles className="h-4 w-4" /> PLANOS ENSINA-ME</span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-[-0.05em] text-[#14233B] sm:text-6xl">Seu aprendizado merece <span className="text-[#0242D7]">espaço para evoluir.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#53627A] sm:text-lg sm:leading-8">Comece com o essencial e amplie sua experiência de estudo quando precisar. O conhecimento não deve ficar atrás de uma barreira.</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid items-stretch gap-5 lg:grid-cols-2 lg:gap-7">
          <article className="flex flex-col rounded-[26px] border border-[#E1E8F2] bg-white p-6 shadow-[0_12px_36px_rgba(22,49,94,0.045)] sm:p-8">
            <div>
              <p className="text-sm font-extrabold text-[#526178]">Gratuito</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.045em] text-[#14233B]">R$ 0</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-[#64738A]">Para começar a organizar seus estudos e conhecer o método Ensina-me.</p>
            </div>
            <Link to="/cadastro" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D6E0EF] px-5 text-sm font-extrabold text-[#243650] transition hover:border-[#0242D7] hover:bg-[#F7F9FF]">Criar conta gratuita <ArrowRight className="ml-2 h-4 w-4" /></Link>
            <div className="my-7 border-t border-[#E8EDF5]" />
            <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#8794A8]">Inclui</p>
            <ul className="mt-4 space-y-3.5">
              {["Conteúdos acadêmicos essenciais", "Organização por disciplinas e tópicos", "Explicações e materiais de estudo", "Prática com limites básicos", "Tutor com limite de utilização", "Revisão e acompanhamento essenciais", "Modo de prova disponível"].map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#43536B]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0242D7]" />{item}</li>)}
            </ul>
          </article>

          <article className="relative flex flex-col rounded-[26px] border-2 border-[#0242D7] bg-white p-6 shadow-[0_18px_50px_rgba(2,66,215,0.10)] sm:p-8">
            <div className="absolute right-6 top-6 rounded-full bg-[#EEF4FF] px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-[#0242D7]">EXPERIÊNCIA AMPLIADA</div>
            <div className="pr-28">
              <p className="text-sm font-extrabold text-[#0242D7]">Ensina-me Completo</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.045em] text-[#14233B]">R$ 29,90<span className="ml-1 text-base font-semibold tracking-normal text-[#64738A]">/mês</span></h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-[#64738A]">Para quem quer aprofundar os estudos e aproveitar limites ampliados nas ferramentas.</p>
            </div>
            <a href="#comparacao" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0242D7] px-5 text-sm font-extrabold text-white transition hover:bg-[#0039B9]">Ver tudo que está incluído <ArrowRight className="ml-2 h-4 w-4" /></a>
            <div className="my-7 border-t border-[#E8EDF5]" />
            <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#8794A8]">Tudo do Gratuito, mais</p>
            <ul className="mt-4 space-y-3.5">
              {["Limites ampliados para o Tutor", "Maior capacidade de prática e exercícios", "Uso ampliado dos recursos multimodais disponíveis", "Revisões e acompanhamento ampliados", "Relatórios mais detalhados de desempenho", "Mais recursos para organizar sua rotina de estudos", "Modo de prova disponível"].map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#43536B]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0242D7]" />{item}</li>)}
            </ul>
            <p className="mt-auto pt-7 text-xs leading-5 text-[#7A879A]">Preço de referência em avaliação. A contratação e a cobrança do plano Completo ainda não estão disponíveis nesta página.</p>
          </article>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-[#E5EBF4] bg-[#F8FAFD] p-4 sm:p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0242D7]" />
          <p className="text-sm leading-6 text-[#526178]">O plano gratuito mantém acesso ao aprendizado essencial. O modo de prova não é bloqueado por assinatura. Os limites exatos das ferramentas serão informados antes de qualquer contratação.</p>
        </div>
      </section>

      <section id="comparacao" className="border-y border-[#E8EDF5] bg-[#F8FAFE]">
        <div className="mx-auto max-w-[1040px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0242D7]">Comparação transparente</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#14233B] sm:text-4xl">O que muda entre os planos?</h2>
            <p className="mt-4 text-base leading-7 text-[#5C6B82]">O essencial para aprender continua acessível. O Completo amplia a capacidade de uso das ferramentas.</p>
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-[#E0E7F1] bg-white">
            <div className="grid grid-cols-[1.35fr_0.8fr_0.8fr] border-b border-[#E6ECF4] bg-[#F7F9FC] px-4 py-4 text-xs font-extrabold text-[#526178] sm:px-6 sm:text-sm">
              <span>Recursos</span><span className="text-center">Gratuito</span><span className="text-center text-[#0242D7]">Completo</span>
            </div>
            {comparison.map((row, index) => <div key={row.feature} className={`grid grid-cols-[1.35fr_0.8fr_0.8fr] items-center gap-2 px-4 py-4 text-xs sm:px-6 sm:py-5 sm:text-sm ${index !== comparison.length - 1 ? "border-b border-[#EDF1F6]" : ""}`}>
              <span className="font-semibold leading-5 text-[#34445D]">{row.feature}</span>
              <span className="text-center leading-5 text-[#64738A]">{row.free}</span>
              <span className="text-center font-semibold leading-5 text-[#34445D]">{row.complete}</span>
            </div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0242D7]">Perguntas frequentes</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#14233B] sm:text-4xl">Antes de escolher.</h2>
          </div>
          <div className="space-y-6">
            <div><h3 className="font-extrabold text-[#243650]">O plano gratuito permite estudar de verdade?</h3><p className="mt-2 text-sm leading-6 text-[#5C6B82]">Sim. Ele mantém acesso aos conteúdos essenciais, explicações, organização dos estudos e recursos básicos de prática.</p></div>
            <div><h3 className="font-extrabold text-[#243650]">O modo de prova é exclusivo do plano Completo?</h3><p className="mt-2 text-sm leading-6 text-[#5C6B82]">Não. O modo de prova permanece disponível nos dois planos.</p></div>
            <div><h3 className="font-extrabold text-[#243650]">Já posso contratar o plano Completo?</h3><p className="mt-2 text-sm leading-6 text-[#5C6B82]">Ainda não. Esta página apresenta a proposta de planos; a contratação será liberada quando pagamento, limites e condições estiverem configurados e validados.</p></div>
            <div><h3 className="font-extrabold text-[#243650]">Haverá teste gratuito?</h3><p className="mt-2 text-sm leading-6 text-[#5C6B82]">Estamos avaliando um período de teste. As regras serão apresentadas com clareza antes de qualquer adesão.</p></div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E8EDF5] bg-white">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-4"><BrandLogo compact /><span className="text-sm text-[#718099]">Aprendizagem com clareza.</span></div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#5C6B82]" aria-label="Links legais">
            <Link to="/" className="transition hover:text-[#0242D7]">Início</Link>
            <Link to="/termos" className="transition hover:text-[#0242D7]">Termos de uso</Link>
            <Link to="/privacidade" className="transition hover:text-[#0242D7]">Privacidade</Link>
            <Link to="/login" className="transition hover:text-[#0242D7]">Entrar</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
