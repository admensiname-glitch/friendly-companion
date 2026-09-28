import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#0F172A] sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-2xl flex-col justify-center">
        <header className="mb-10">
          <Link
            to="/"
            className="inline-block text-xl font-bold tracking-[-0.03em] text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
            aria-label="Ensina-me, página inicial"
          >
            Ensina-me
          </Link>
        </header>

        <section
          className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-10"
          aria-labelledby="onboarding-title"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
            Configuração inicial
          </p>
          <h1
            id="onboarding-title"
            className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
          >
            Prepare sua área de aprendizagem
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#64748B]">
            Nesta etapa, o Ensina-me vai preparar a organização dos seus
            estudos no curso de Pedagogia. As preferências e perguntas serão
            incluídas na próxima fase da fundação.
          </p>

          <div
            className="mt-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-[#0F172A]">
              Configuração ainda não iniciada
            </p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Nenhuma preferência ou dado de aluno foi criado nesta etapa.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/app/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#0242D7] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Acessar área do aluno
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Voltar ao início
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
