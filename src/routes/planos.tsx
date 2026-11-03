import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos | Ensina-me" },
      { name: "description", content: "Compare os planos do Ensina-me para seus estudos universitários." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PlansPage,
});

const differences = [
  {
    label: "Disciplinas ativas",
    free: "1 disciplina por vez",
    complete: "Várias disciplinas ao mesmo tempo",
  },
  {
    label: "Modo de prova",
    free: "Até 60 provas por mês",
    complete: "Limite ampliado",
  },
  {
    label: "Tutor",
    free: "Até 10 solicitações por mês",
    complete: "Uso ampliado e recursos multimodais",
  },
  {
    label: "Prática e revisão",
    free: "Recursos essenciais",
    complete: "Mais recursos para praticar e revisar",
  },
  {
    label: "Acompanhamento",
    free: "Visão básica do progresso",
    complete: "Relatórios detalhados de desempenho",
  },
];

function DifferenceRow({
  label,
  free,
  complete,
}: {
  label: string;
  free: string;
  complete: string;
}) {
  return (
    <div className="grid gap-2 border-b border-[#E9EEF5] py-4 last:border-b-0 sm:grid-cols-[1fr_1fr_1fr] sm:items-center sm:gap-5">
      <p className="text-sm font-bold text-[#263750]">{label}</p>
      <p className="flex items-start gap-2 text-sm leading-5 text-[#5B6A80]">
        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-[#9AA7B9] sm:hidden" />
        <span className="sm:hidden font-semibold text-[#8794A7]">Gratuito:</span>
        <span>{free}</span>
      </p>
      <p className="flex items-start gap-2 text-sm leading-5 text-[#344B70]">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0242D7] sm:hidden" />
        <span className="sm:hidden font-semibold text-[#0242D7]">Completo:</span>
        <span>{complete}</span>
      </p>
    </div>
  );
}

function PlansPage() {
  return (
    <main className="min-h-screen bg-white text-[#14233B]">
      <header className="border-b border-[#E8EDF5] bg-white">
        <div className="mx-auto flex min-h-14 max-w-[1080px] items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Ensina-me, página inicial"><BrandLogo /></Link>
          <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Navegação">
            <Link to="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#526178] hover:bg-[#F4F7FC]">Início</Link>
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#34445D] hover:bg-[#F4F7FC]">Entrar</Link>
            <Link to="/cadastro" className="inline-flex min-h-10 items-center rounded-lg bg-[#0242D7] px-4 text-sm font-bold text-white hover:bg-[#0039B9]">Criar conta</Link>
          </nav>
        </div>
      </header>

      <section className="bg-[#F8FAFE] px-4 pb-6 pt-7 text-center sm:pb-8 sm:pt-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0242D7]">Planos Ensina-me</p>
        <h1 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Aprenda no seu ritmo.</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#53627A] sm:text-base">Escolha o espaço de estudo que acompanha seus objetivos.</p>
      </section>

      <section className="mx-auto max-w-[960px] px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-7" aria-label="Planos disponíveis">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-[#E1E8F2] bg-white p-5 sm:p-6">
            <p className="text-sm font-bold text-[#526178]">Gratuito</p>
            <div className="mt-1 flex items-baseline gap-1">
              <h2 className="text-3xl font-extrabold tracking-tight">R$ 0</h2>
              <span className="text-sm text-[#64738A]">para sempre</span>
            </div>
            <p className="mt-2 min-h-10 text-sm leading-5 text-[#64738A]">Para começar a organizar sua rotina e aprender com constância.</p>
            <ul className="mt-4 space-y-2.5 text-sm leading-5 text-[#43536B]">
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#0242D7]" /> 1 disciplina ativa por vez</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#0242D7]" /> 60 provas por mês</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#0242D7]" /> 10 solicitações ao Tutor por mês</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#0242D7]" /> Materiais, prática e revisão essenciais</li>
            </ul>
            <Link to="/cadastro" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D6E0EF] px-4 text-sm font-bold text-[#243650] hover:border-[#0242D7] hover:bg-[#F7F9FF]">Criar conta gratuita</Link>
          </article>

          <article className="flex flex-col rounded-2xl border-2 border-[#0242D7] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#0242D7]">Ensina-me Completo</p>
              <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[10px] font-extrabold text-[#0242D7]">EM BREVE</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <h2 className="text-3xl font-extrabold tracking-tight">R$ 29,90</h2>
              <span className="text-sm text-[#64738A]">/mês*</span>
            </div>
            <p className="mt-2 min-h-10 text-sm leading-5 text-[#64738A]">Para quem quer aprofundar os estudos e ter mais liberdade para avançar.</p>
            <ul className="mt-4 space-y-2.5 text-sm leading-5 text-[#43536B]">
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#0242D7]" /> Várias disciplinas ativas</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#0242D7]" /> Limites ampliados para provas e Tutor</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#0242D7]" /> Recursos multimodais do Tutor</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#0242D7]" /> Prática, revisão e relatórios detalhados</li>
            </ul>
            <div className="mt-5 flex min-h-11 items-center justify-center rounded-lg bg-[#F3F6FC] px-4 text-sm font-bold text-[#526178]">Contratação ainda não disponível</div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="border-t border-[#E7ECF4] pt-7">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold tracking-tight text-[#192B45]">O que muda de um plano para o outro?</h2>
            <p className="mt-1 text-sm text-[#64738A]">Veja os recursos e limites lado a lado.</p>
          </div>
          <div className="hidden grid-cols-[1fr_1fr_1fr] gap-5 rounded-t-xl bg-[#F7F9FC] px-4 py-3 sm:grid">
            <span className="text-xs font-bold uppercase tracking-wide text-[#77859A]">Recurso</span>
            <span className="text-xs font-bold uppercase tracking-wide text-[#526178]">Gratuito</span>
            <span className="text-xs font-bold uppercase tracking-wide text-[#0242D7]">Completo</span>
          </div>
          <div className="sm:px-4">
            {differences.map((item) => <DifferenceRow key={item.label} {...item} />)}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#7A879A]">*Preço de referência em avaliação. Os limites do plano Completo e as condições de assinatura serão confirmados antes da contratação. Nenhuma cobrança está disponível neste momento.</p>
        </div>
      </section>

      <footer className="border-t border-[#E8EDF5]">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3"><BrandLogo compact /><span className="text-xs text-[#718099]">Aprendizagem com clareza.</span></div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#5C6B82]" aria-label="Links institucionais">
            <Link to="/" className="hover:text-[#0242D7]">Início</Link>
            <Link to="/termos" className="hover:text-[#0242D7]">Termos de uso</Link>
            <Link to="/privacidade" className="hover:text-[#0242D7]">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
