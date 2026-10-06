import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/")({
  component: Index,
});

type IconName =
  | "book"
  | "target"
  | "chart"
  | "brain"
  | "check"
  | "spark"
  | "arrow"
  | "shield"
  | "play";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths = {
    book: (
      <>
        <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
        <path d="M5 4.5v17" />
        <path d="M9 6h7" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 5-6" />
      </>
    ),
    brain: (
      <>
        <path d="M9.5 4.5a3.2 3.2 0 0 0-5.7 2A3.2 3.2 0 0 0 4 12.3a3.2 3.2 0 0 0 2.3 5.4c.5 1.4 1.8 2.3 3.2 2.3V4.5Z" />
        <path d="M14.5 4.5a3.2 3.2 0 0 1 5.7 2 3.2 3.2 0 0 1-.2 5.8 3.2 3.2 0 0 1-2.3 5.4c-.5 1.4-1.8 2.3-3.2 2.3V4.5Z" />
        <path d="M9.5 8.5h2.2v3h-3" />
        <path d="M14.5 8.5h-2.2v3h3" />
        <path d="M12 5v14" />
      </>
    ),
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    spark: (
      <>
        <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />
        <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v5.5c0 4.7-3.2 8.2-8 9.5-4.8-1.3-8-4.8-8-9.5V6z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 5 4-5 4z" />
      </>
    ),
  } as const;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

const benefits = [
  {
    icon: "book" as const,
    title: "Conteúdo de verdade",
    text: "Estude conceitos organizados por disciplina e tópico, com uma base pensada para você entender — não apenas decorar.",
  },
  {
    icon: "target" as const,
    title: "Prática com propósito",
    text: "Resolva questões, receba feedback e descubra onde sua compreensão ainda precisa de atenção.",
  },
  {
    icon: "brain" as const,
    title: "Tutor com IA",
    text: "Pergunte, peça explicações e aprofunde o assunto quando uma ideia não fizer sentido de primeira.",
  },
  {
    icon: "chart" as const,
    title: "Revisão orientada",
    text: "Seu desempenho ajuda a definir o que merece ser retomado, em vez de fazer você revisar tudo do zero.",
  },
  {
    icon: "spark" as const,
    title: "Modo prova",
    text: "Treine em um formato mais próximo da avaliação e use o resultado para identificar seus pontos fortes e fragilidades.",
  },
  {
    icon: "play" as const,
    title: "Vídeos como complemento",
    text: "Quando um vídeo ajuda a visualizar melhor o tema, ele aparece como complemento específico daquele tópico.",
  },
];

const journey = [
  ["01", "Conteúdo", "Construa a base antes de partir para a prática."],
  ["02", "Compreensão", "Confira se você realmente entendeu a ideia central."],
  ["03", "Prática", "Aplique o que estudou em questões."],
  ["04", "Feedback", "Entenda o raciocínio por trás do resultado."],
  ["05", "Revisão", "Volte ao que ainda merece atenção."],
  ["06", "Domínio", "Avance quando o conhecimento estiver consistente."],
];

function Index() {
  const [showTrialOffer, setShowTrialOffer] = useState(false);

  useEffect(() => {
    const storageKey = "ensina-me:landing-trial-offer-seen";
    const hasSeenLanding = window.localStorage.getItem(storageKey) === "1";
    setShowTrialOffer(!hasSeenLanding);
    window.localStorage.setItem(storageKey, "1");
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#172334]">
      <header className="sticky top-0 z-40 border-b border-[#E6ECF4] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1180px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            aria-label="Ensina-me, página inicial"
            className="focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
          >
            <BrandLogo />
          </Link>

          <nav aria-label="Navegação principal" className="flex items-center gap-1.5">
            <Link
              to="/login"
              className="rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#556273] transition hover:bg-[#F4F7FB] hover:text-[#172334]"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(2,66,215,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0038B8]"
            >
              Começar grátis
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative border-b border-[#E7EDF5] bg-[radial-gradient(circle_at_72%_20%,rgba(2,66,215,0.13),transparent_31%),linear-gradient(180deg,#F8FBFF_0%,#FFFFFF_100%)]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[0.96fr_1.04fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#CFE0FF] bg-white px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0242D7] shadow-[0_5px_20px_rgba(2,66,215,0.07)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0242D7]" />
              7 dias grátis para experimentar
            </span>

            <h1 className="mt-6 max-w-2xl text-[43px] font-extrabold leading-[0.98] tracking-[-0.06em] text-[#132238] sm:text-6xl lg:text-[68px]">
              Pare de estudar no escuro.
              <span className="block text-[#0242D7]">Comece a entender.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#637184] sm:text-lg">
              O Ensina-me transforma seu estudo em uma jornada guiada: conteúdo claro, prática, feedback, revisão e inteligência artificial trabalhando juntos para você aprender de verdade.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/cadastro"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#0242D7] px-6 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(2,66,215,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0038B8]"
              >
                {showTrialOffer ? "Testar por 7 dias grátis" : "Começar agora"}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-13 items-center justify-center rounded-xl border border-[#D9E3EF] bg-white px-6 text-sm font-extrabold text-[#445367] transition hover:border-[#BFD2ED] hover:text-[#0242D7]"
              >
                Já tenho conta
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[#7A8796]">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="check" className="h-4 w-4 text-[#0242D7]" />
                7 dias para testar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="check" className="h-4 w-4 text-[#0242D7]" />
                Sem valor definido agora
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="check" className="h-4 w-4 text-[#0242D7]" />
                Cancele quando quiser
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-[48px] bg-[#0242D7]/8 blur-3xl" />
            <div className="relative rounded-[30px] border border-[#DDE7F4] bg-white p-3 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
              <div className="rounded-[24px] bg-[#F7F9FC] p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#8A95A3]">Seu estudo</p>
                    <p className="mt-1 text-sm font-extrabold text-[#243245]">Próximo passo recomendado</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#0242D7]">
                    <Icon name="target" className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-4 rounded-[22px] bg-[#0242D7] p-5 text-white shadow-[0_15px_32px_rgba(2,66,215,0.18)] sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/65">Foco de estudo</p>
                    <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold text-white/80">Pedagogia</span>
                  </div>
                  <p className="mt-3 text-xl font-extrabold tracking-[-0.035em] sm:text-2xl">Alfabetização e letramento</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-white/78">
                    Compreenda a diferença entre alfabetização e letramento e veja como os dois processos se articulam.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#0242D7]">
                    Estudar agora
                    <Icon name="arrow" className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Conteúdo", "Base clara"],
                    ["Prática", "Questões + feedback"],
                    ["Revisão", "Foco no que importa"],
                  ].map(([title, desc]) => (
                    <div key={title} className="rounded-2xl border border-[#E3E9F1] bg-white p-3.5">
                      <p className="text-xs font-extrabold text-[#273547]">{title}</p>
                      <p className="mt-1 text-[11px] leading-5 text-[#7B8796]">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-[#DDE7F4] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.1)] sm:block">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#0242D7]">
                  <Icon name="chart" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A95A3]">Progresso</p>
                  <p className="text-xs font-extrabold text-[#243245]">Estudo orientado pelo seu desempenho</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E7EDF5] bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0242D7]">Por que usar o Ensina-me?</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-[#172334] sm:text-4xl">
              Menos conteúdo solto. Mais aprendizagem.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#718093] sm:text-base">
              Tudo foi pensado para resolver um problema simples: saber o que estudar é diferente de saber se você realmente aprendeu.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((item) => (
              <article
                key={item.title}
                className="group rounded-2xl border border-[#E4EAF2] bg-[#FBFCFE] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#C9DAF4] hover:bg-white hover:shadow-[0_14px_34px_rgba(15,23,42,0.07)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#0242D7] transition group-hover:bg-[#0242D7] group-hover:text-white">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-extrabold text-[#253447]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#718093]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F9FC]">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0242D7]">Uma forma diferente de estudar</p>
            <h2 className="mt-3 max-w-lg text-3xl font-extrabold tracking-[-0.045em] text-[#172334] sm:text-4xl">
              Você não precisa descobrir sozinho o próximo passo.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#718093] sm:text-base">
              O Ensina-me acompanha sua jornada de aprendizagem e conecta estudo, prática e revisão. A ideia é tirar o peso de decidir tudo sozinho e colocar mais clareza no que fazer agora.
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-[#DCE7F6] bg-white px-4 py-3 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#0242D7]">
                <Icon name="shield" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-[#253447]">Feito para o estudante</p>
                <p className="text-[11px] text-[#7A8796]">Sem transformar seu estudo em burocracia.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {journey.map(([number, title, text]) => (
              <article key={number} className="rounded-2xl border border-[#E0E7F0] bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,0.035)]">
                <span className="text-[11px] font-extrabold tracking-[0.12em] text-[#0242D7]">{number}</span>
                <h3 className="mt-2 text-sm font-extrabold text-[#253447]">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#718093]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#DCE6F3] bg-white">
        <div className="mx-auto max-w-[1000px] px-4 py-14 text-center sm:px-6 lg:py-16">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0242D7]">
            {showTrialOffer ? "Comece sem compromisso" : "Pronto para estudar melhor?"}
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-[-0.045em] text-[#172334] sm:text-4xl">
            {showTrialOffer ? "Sete dias para descobrir se o seu estudo pode ser melhor." : "Dê o próximo passo no seu estudo."}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#718093] sm:text-base">
            {showTrialOffer
              ? "Experimente a plataforma, conheça seu fluxo de estudo e veja como conteúdo, prática, feedback e revisão funcionam juntos. Os valores dos planos serão apresentados antes da assinatura."
              : "Conheça o Ensina-me e veja como conteúdo, prática, feedback e revisão podem trabalhar juntos para deixar seu estudo mais claro."}
          </p>

          <Link
            to="/cadastro"
            className="mt-7 inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#0242D7] px-7 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(2,66,215,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0038B8]"
          >
            {showTrialOffer ? "Quero testar por 7 dias" : "Começar agora"}
            <Icon name="arrow" className="h-4 w-4" />
          </Link>

          {showTrialOffer && (
            <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-[#8793A0]">
              <span>7 dias grátis</span>
              <span>•</span>
              <span>Plano e valor apresentados antes da cobrança</span>
              <span>•</span>
              <span>Cancele quando quiser</span>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-[#DCE4ED] bg-[#F7F9FC]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 py-8 text-xs text-[#8A95A3] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <BrandLogo compact />
            <span>Aprendizagem com clareza.</span>
          </div>
          <nav className="flex items-center gap-4" aria-label="Links legais">
            <Link to="/termos" className="transition hover:text-[#0242D7]">Termos de uso</Link>
            <Link to="/privacidade" className="transition hover:text-[#0242D7]">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
