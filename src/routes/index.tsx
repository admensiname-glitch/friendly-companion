import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-white text-[#0F172A]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link
          to="/"
          className="text-xl font-bold tracking-[-0.03em] text-[#0242D7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
          aria-label="Ensina-me, página inicial"
        >
          Ensina-me
        </Link>
        <nav aria-label="Navegação principal" className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
          >
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="rounded-md bg-[#0242D7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          <p className="mb-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#0242D7]">
            Plataforma universitária de aprendizagem
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Aprender não é só estudar. É construir domínio.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#64748B]">
            O Ensina-me organiza sua jornada de aprendizagem para que você compreenda, pratique e revise dentro de uma experiência acadêmica preparada para o seu ritmo.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/cadastro"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#0242D7] px-6 text-base font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Criar minha conta
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-6 text-base font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="mt-5 text-sm text-[#64748B]">
            Primeiro curso do MVP: <span className="font-semibold text-[#0F172A]">Pedagogia</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 sm:p-8">
          <div className="mb-10 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0F172A]">Sua jornada de aprendizagem</p>
            <span className="rounded-full border border-[#BFDBFE] px-3 py-1 text-xs font-medium text-[#0242D7]">
              Ensina-me
            </span>
          </div>
          <ol className="space-y-5" aria-label="Etapas da jornada de aprendizagem">
            {[
              ["Conteúdo", "Encontre o conhecimento que importa"],
              ["Compreensão", "Construa uma base sólida"],
              ["Prática", "Aplique o que aprendeu"],
              ["Feedback", "Entenda seus pontos de evolução"],
              ["Revisão", "Retome o que merece sua atenção"],
              ["Domínio", "Avance com consistência"],
            ].map(([title, description], index) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0242D7] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-[#0F172A]">{title}</p>
                  <p className="mt-0.5 text-sm leading-6 text-[#64748B]">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 sm:grid-cols-3 lg:px-8">
          <div>
            <p className="font-semibold text-[#0F172A]">Aprendizado no lugar certo</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Conteúdo e atividades organizados em uma experiência acadêmica completa.</p>
          </div>
          <div>
            <p className="font-semibold text-[#0F172A]">Feito para o seu ritmo</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">A estrutura acompanha sua evolução sem inventar atalhos ou resultados.</p>
          </div>
          <div>
            <p className="font-semibold text-[#0F172A]">Tecnologia com intenção</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Uma base confiável para conectar conteúdo, prática, feedback e revisão.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
