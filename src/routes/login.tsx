import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#0F172A] sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <Link
          to="/"
          className="mb-10 w-fit text-xl font-bold tracking-[-0.03em] text-[#0242D7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
        >
          Ensina-me
        </Link>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="login-title">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
            Área do aluno
          </p>
          <h1 id="login-title" className="mt-3 text-3xl font-bold tracking-[-0.04em]">
            Entre na sua conta
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            A autenticação será conectada ao Supabase na próxima etapa da fundação.
          </p>

          <form className="mt-8 space-y-5" aria-label="Formulário de login">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="password" className="text-sm font-medium text-[#0F172A]">
                  Senha
                </label>
                <span className="text-xs text-[#64748B]">Recuperação em breve</span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
              />
            </div>
            <button
              type="button"
              disabled
              className="h-11 w-full cursor-not-allowed rounded-md bg-[#94A3B8] px-4 text-sm font-semibold text-white"
            >
              Entrar em breve
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#64748B]">
            Ainda não tem uma conta?{" "}
            <Link
              to="/cadastro"
              className="font-semibold text-[#0242D7] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Criar conta
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
