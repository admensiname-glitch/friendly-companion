import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cadastro")({
  component: Cadastro,
});

function Cadastro() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#0F172A] sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-xl font-bold tracking-[-0.03em] text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
            aria-label="Ensina-me, página inicial"
          >
            Ensina-me
          </Link>
          <Link
            to="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-[#0F172A] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
          >
            Já tenho conta
          </Link>
        </header>

        <section
          className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8"
          aria-labelledby="cadastro-title"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
            Criar conta
          </p>
          <h1
            id="cadastro-title"
            className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A]"
          >
            Comece sua jornada
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            A criação de conta será conectada ao Supabase na próxima etapa da
            fundação.
          </p>

          <form className="mt-8 space-y-5" aria-label="Formulário de criação de conta">
            <div>
              <label
                htmlFor="nome"
                className="text-sm font-medium text-[#0F172A]"
              >
                Nome completo
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                autoComplete="name"
                placeholder="Digite seu nome"
                className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                disabled
              />
            </div>

            <div>
              <label
                htmlFor="email-cadastro"
                className="text-sm font-medium text-[#0F172A]"
              >
                E-mail
              </label>
              <input
                id="email-cadastro"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                disabled
              />
            </div>

            <div>
              <label
                htmlFor="senha-cadastro"
                className="text-sm font-medium text-[#0F172A]"
              >
                Senha
              </label>
              <input
                id="senha-cadastro"
                name="senha"
                type="password"
                autoComplete="new-password"
                placeholder="Crie uma senha"
                className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                disabled
              />
            </div>

            <button
              type="button"
              disabled
              className="h-11 w-full cursor-not-allowed rounded-md bg-[#94A3B8] px-4 text-sm font-semibold text-white"
            >
              Criar conta em breve
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#64748B]">
            Já possui uma conta?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#0242D7] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Entrar
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
