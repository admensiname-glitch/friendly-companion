import { Link, createFileRoute } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ensina-me | Aprendizagem universitária com prática e revisão" },
      { name: "description", content: "Organize seus estudos universitários com materiais por tópico, tutor de IA, questões com feedback e revisão orientada pelo seu progresso." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Ensina-me | Aprendizagem universitária com prática e revisão" },
      { property: "og:description", content: "Organize seus estudos universitários com materiais por tópico, tutor de IA, questões com feedback e revisão orientada pelo seu progresso." },
      { property: "og:type", content: "website" }
    ],
    links: [{ rel: "canonical", href: "https://ensina-buddy-app.lovable.app/" }]
  }),
  component: Index,
});

function Icon({
  name,
  className = "",
}: {
  name: "book" | "target" | "chart" | "arrow" | "spark" | "check" | "brain" | "refresh";
  className?: string;
}) {
  const paths = {
    book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 4.5v17" /><path d="M9 6h7" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    brain: <><path d="M12 18V5" /><path d="M12 8a3.5 3.5 0 0 0-6.8-1A3.8 3.8 0 0 0 5 14.4 3.6 3.6 0 0 0 8 20h4" /><path d="M12 8a3.5 3.5 0 0 1 6.8-1 3.8 3.8 0 0 1 .2 7.4A3.6 3.6 0 0 1 16 20h-4" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

const learningSteps = [
  { number: "01", title: "Entenda", text: "Construa uma base clara, em partes que fazem sentido." },
  { number: "02", title: "Pratique", text: "Teste o que aprendeu com questões e desafios." },
  { number: "03", title: "Receba feedback", text: "Descubra por que acertou ou onde precisa melhorar." },
  { number: "04", title: "Revise", text: "Retome os pontos importantes e avance com confiança." },
];

function Index() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#14233B]">
      <header className="sticky top-0 z-40 border-b border-[#E8EDF5] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Ensina-me, página inicial" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"><BrandLogo /></Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-2 sm:gap-4">
            <a href="#como-funciona" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#526178] transition hover:text-[#0242D7] sm:inline-flex">Como funciona</a>
            <Link to="/login" className="rounded-xl px-3 py-2.5 text-sm font-bold text-[#34445D] transition hover:bg-[#F4F7FC] sm:px-4">Entrar</Link>
            <Link to="/cadastro" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0646D9] px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(6,70,217,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0039B9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0646D9] focus-visible:ring-offset-2 sm:px-5">Começar <Icon name="arrow" className="h-4 w-4" /></Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate">
        <div aria-hidden="true" className="pointer-events-none absolute right-[-9rem] top-[-8rem] -z-10 h-[30rem] w-[30rem] rounded-full bg-[#EAF1FF] blur-3xl" />
        <div className="mx-auto grid w-full max-w-[1240px] gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="max-w-[620px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE7FF] bg-[#F5F8FF] px-3.5 py-2 text-xs font-extrabold tracking-wide text-[#0646D9]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0646D9] text-white"><Icon name="spark" className="h-3 w-3" /></span>
              APRENDIZAGEM UNIVERSITÁRIA
            </div>
            <h1 className="mt-6 text-[2.8rem] font-extrabold leading-[1.04] tracking-[-0.055em] text-[#14233B] sm:text-6xl lg:text-[4.35rem]">
              Não estude só para lembrar. <span className="text-[#0646D9]">Aprenda para dominar.</span>
            </h1>
            <p className="mt-6 max-w-[550px] text-base leading-7 text-[#53627A] sm:text-lg sm:leading-8">
              Organize suas disciplinas, tire dúvidas com o tutor, pratique com questões e descubra o que revisar em seguida.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/cadastro" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#0646D9] px-6 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(6,70,217,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0039B9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0646D9] focus-visible:ring-offset-2">
                Começar a aprender <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <a href="#como-funciona" className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-[#D9E2F0] bg-white px-6 text-sm font-bold text-[#34445D] transition hover:border-[#B9CCED] hover:bg-[#F8FAFF]">Conhecer a jornada</a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#53627A]">
              <span className="inline-flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-[#0646D9]" /> Estudo com propósito</span>
              <span className="inline-flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-[#0646D9]" /> Progresso acompanhado</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
            <div aria-hidden="true" className="absolute -left-5 top-12 h-24 w-24 rounded-full border border-[#D8E5FF] sm:-left-8" />
            <div aria-hidden="true" className="absolute -bottom-5 right-8 h-24 w-24 rounded-[2rem] bg-[#EAF1FF] rotate-12" />
            <div className="relative rounded-[28px] border border-[#E0E8F5] bg-white p-3 shadow-[0_28px_80px_rgba(22,49,94,0.12)] sm:p-4">
              <div className="rounded-[21px] bg-[#F7F9FD] p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#7C8AA2]">Sua jornada de hoje</p>
                    <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#172842] sm:text-2xl">Aprender, passo a passo.</h2>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E7EEFF] text-[#0646D9]"><Icon name="target" className="h-5 w-5" /></span>
                </div>
                <div className="mt-6 rounded-2xl bg-[#0646D9] p-5 text-white sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-white/75">EXEMPLO DE ESTUDO</span>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">Pedagogia</span>
                  </div>
                  <h3 className="mt-4 text-xl font-extrabold leading-snug tracking-tight sm:text-2xl">Alfabetização e letramento</h3>
                  <p className="mt-2 text-sm leading-6 text-white/80">Entenda os conceitos, conecte as ideias e teste sua compreensão.</p>
                  <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/10 p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0646D9]"><Icon name="book" className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-bold">Próximo passo</p><p className="mt-0.5 text-xs text-white/75">Prática com feedback</p></div>
                    <Icon name="arrow" className="h-4 w-4 shrink-0" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-xl border border-[#E4EAF4] bg-white p-3"><Icon name="book" className="h-4 w-4 text-[#0646D9]" /><p className="mt-2 text-xs font-extrabold text-[#253650]">Conteúdo</p><p className="mt-1 text-[11px] leading-4 text-[#718099]">Entenda</p></div>
                  <div className="rounded-xl border border-[#E4EAF4] bg-white p-3"><Icon name="target" className="h-4 w-4 text-[#0646D9]" /><p className="mt-2 text-xs font-extrabold text-[#253650]">Prática</p><p className="mt-1 text-[11px] leading-4 text-[#718099]">Experimente</p></div>
                  <div className="rounded-xl border border-[#E4EAF4] bg-white p-3"><Icon name="refresh" className="h-4 w-4 text-[#0646D9]" /><p className="mt-2 text-xs font-extrabold text-[#253650]">Revisão</p><p className="mt-1 text-[11px] leading-4 text-[#718099]">Consolide</p></div>
                </div>
              </div>
            </div>
            <div className="absolute -right-2 top-[-18px] hidden items-center gap-2 rounded-2xl border border-[#E2EAF7] bg-white px-4 py-3 shadow-[0_12px_32px_rgba(22,49,94,0.1)] sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#0646D9]"><Icon name="brain" className="h-4 w-4" /></span>
              <span className="text-xs font-extrabold text-[#253650]">Compreender antes de avançar</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E8EDF5] bg-[#F8FAFE]">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[0.8fr_1.2fr] md:items-center lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0646D9]">Muito além de ler</p>
            <h2 className="mt-3 max-w-md text-3xl font-extrabold leading-tight tracking-[-0.04em] text-[#14233B] sm:text-4xl">Estudar é construir conhecimento, não acumular páginas.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <article className="border-l-2 border-[#BFD2FF] pl-4">
              <Icon name="book" className="h-6 w-6 text-[#0646D9]" />
              <h3 className="mt-3 text-base font-extrabold text-[#1B2B45]">Conteúdo claro</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C6B82]">Estude tópicos organizados em uma sequência clara, com materiais e referências para aprofundar o assunto.</p>
            </article>
            <article className="border-l-2 border-[#BFD2FF] pl-4">
              <Icon name="target" className="h-6 w-6 text-[#0646D9]" />
              <h3 className="mt-3 text-base font-extrabold text-[#1B2B45]">Prática orientada</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C6B82]">Pratique com questões e use o feedback para entender por que uma alternativa faz sentido — ou não.</p>
            </article>
            <article className="border-l-2 border-[#BFD2FF] pl-4">
              <Icon name="chart" className="h-6 w-6 text-[#0646D9]" />
              <h3 className="mt-3 text-base font-extrabold text-[#1B2B45]">Evolução visível</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C6B82]">Acompanhe seu desempenho por tópico e escolha os próximos passos com mais clareza.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0646D9]">O método Ensina-me</p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.045em] text-[#14233B] sm:text-5xl">Cada etapa tem um propósito.</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#5C6B82] sm:text-lg">Uma jornada de aprendizagem que conecta explicação, aplicação e retomada para você saber o que fazer depois.</p>
        </div>
        <div className="mt-10 grid gap-0 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          {learningSteps.map((step, index) => <article key={step.number} className="group border-t border-[#DDE5F0] py-6 sm:px-5 sm:first:pl-0 lg:px-6 lg:first:pl-0 lg:last:pr-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold tracking-wide text-[#0646D9]">{step.number}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE7F8] text-[#0646D9] transition group-hover:bg-[#0646D9] group-hover:text-white"><Icon name={index === 0 ? "book" : index === 1 ? "target" : index === 2 ? "spark" : "refresh"} className="h-4 w-4" /></span>
            </div>
            <h3 className="mt-5 text-xl font-extrabold tracking-tight text-[#1B2B45]">{step.title}</h3>
            <p className="mt-2 max-w-[250px] text-sm leading-6 text-[#5C6B82]">{step.text}</p>
          </article>)}
        </div>
      </section>

      <section className="mx-4 mb-16 overflow-hidden rounded-[28px] bg-[#EEF4FF] sm:mx-6 lg:mx-auto lg:mb-24 lg:max-w-[1208px]">
        <div className="grid gap-8 px-6 py-10 sm:px-10 sm:py-12 md:grid-cols-[1fr_auto] md:items-center lg:px-14 lg:py-14">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0646D9]">Seu próximo passo começa aqui</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.045em] text-[#14233B] sm:text-4xl">Transforme seu tempo de estudo em aprendizagem de verdade.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#53627A]">Comece sua jornada com o Ensina-me e avance uma etapa de cada vez.</p>
          </div>
          <Link to="/cadastro" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#0646D9] px-6 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(6,70,217,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0039B9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0646D9] focus-visible:ring-offset-2">Criar minha conta <Icon name="arrow" className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-[#E8EDF5] bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-4"><BrandLogo compact /><span className="text-sm text-[#718099]">Aprendizagem com clareza.</span></div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#5C6B82]" aria-label="Links legais">
            <Link to="/termos" className="transition hover:text-[#0646D9]">Termos de uso</Link>
            <Link to="/privacidade" className="transition hover:text-[#0646D9]">Privacidade</Link>
            <Link to="/login" className="transition hover:text-[#0646D9]">Entrar</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
