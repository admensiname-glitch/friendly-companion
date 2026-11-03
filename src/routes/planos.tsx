import { Link, createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos | Ensina-me" },
      { name: "description", content: "Conheça os planos do Ensina-me para seus estudos universitários." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PlansPage,
});

const freeFeatures = [
  "Conteúdos e organização por disciplinas",
  "Explicações e materiais de estudo",
  "Prática, revisão e Tutor com limites básicos",
  "Modo de prova disponível",
];

const completeFeatures = [
  "Tudo do plano Gratuito",
  "Mais uso do Tutor e recursos multimodais",
  "Mais prática, revisão e acompanhamento",
  "Relatórios detalhados de desempenho",
  "Modo de prova disponível",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm leading-5 text-[#43536B]">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0242D7]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PlansPage() {
  return (
    <main className="min-h-screen bg-white text-[#14233B]">
      <header className="border-b border-[#E8EDF5] bg-white">
        <div className="mx-auto flex min-h-14 max-w-[1080px] items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Ensina-me, página inicial"><BrandLogo /></Link>
          <nav className="flex items-center gap-2">
            <Link to="/" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#526178] hover:bg-[#F4F7FC] sm:inline-flex">Início</Link>
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#34445D] hover:bg-[#F4F7FC]">Entrar</Link>
            <Link to="/cadastro" className="inline-flex min-h-10 items-center rounded-lg bg-[#0242D7] px-4 text-sm font-bold text-white hover:bg-[#0039B9]">Criar conta</Link>
          </nav>
        </div>
      </header>

      <section className="bg-[#F8FAFE] px-4 py-8 text-center sm:py-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0242D7]">Planos Ensina-me</p>
        <h1 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Aprenda no seu ritmo.</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#53627A] sm:text-base">O essencial para estudar é gratuito. Se precisar, amplie seus recursos.</p>
      </section>

      <section className="mx-auto max-w-[920px] px-4 py-7 sm:px-6 sm:py-9">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-[#E1E8F2] bg-white p-5 sm:p-6">
            <p className="text-sm font-bold text-[#526178]">Gratuito</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight">R$ 0</h2>
            <p className="mt-1 text-sm text-[#64738A]">Para organizar seus estudos e aprender.</p>
            <FeatureList items={freeFeatures} />
            <Link to="/cadastro" className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#D6E0EF] px-4 text-sm font-bold text-[#243650] hover:border-[#0242D7] hover:bg-[#F7F9FF]">Criar conta gratuita</Link>
          </article>

          <article className="rounded-2xl border-2 border-[#0242D7] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#0242D7]">Ensina-me Completo</p>
              <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[10px] font-extrabold text-[#0242D7]">EM BREVE</span>
            </div>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight">R$ 29,90<span className="ml-1 text-sm font-semibold text-[#64738A]">/mês*</span></h2>
            <p className="mt-1 text-sm text-[#64738A]">Para aprofundar e ampliar o uso das ferramentas.</p>
            <FeatureList items={completeFeatures} />
            <div className="mt-5 flex min-h-10 items-center justify-center rounded-lg bg-[#F3F6FC] px-4 text-sm font-bold text-[#526178]">Contratação ainda não disponível</div>
          </article>
        </div>

        <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-[#718099]">*Valor de referência em avaliação. Os limites, condições e eventual teste gratuito serão definidos e informados antes da abertura das assinaturas. O modo de prova continua disponível nos dois planos.</p>
      </section>

      <footer className="border-t border-[#E8EDF5]">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3"><BrandLogo compact /><span className="text-xs text-[#718099]">Aprendizagem com clareza.</span></div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#5C6B82]" aria-label="Links">
            <Link to="/" className="hover:text-[#0242D7]">Início</Link>
            <Link to="/termos" className="hover:text-[#0242D7]">Termos de uso</Link>
            <Link to="/privacidade" className="hover:text-[#0242D7]">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
