import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: Login,
});

type LoginStatus = "normal" | "loading" | "success" | "error";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("normal");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setStatus("error");
      setMessage("Preencha o e-mail e a senha para continuar.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setStatus("error");
      setMessage("Informe um endereço de e-mail válido.");
      return;
    }

    setStatus("loading");

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setStatus("error");

      const normalizedError = error.message.toLowerCase();
      if (normalizedError.includes("invalid login credentials")) {
        setMessage("E-mail ou senha inválidos, ou usuário inexistente.");
      } else if (normalizedError.includes("fetch") || normalizedError.includes("network")) {
        setMessage("Não foi possível conectar ao serviço de autenticação. Tente novamente.");
      } else {
        setMessage("Não foi possível entrar. Verifique seus dados e tente novamente.");
      }
      return;
    }

    setStatus("success");
    setMessage("Login realizado com sucesso. Redirecionando para sua área...");
    await navigate({ to: "/app/dashboard" });
  }

  const isLoading = status === "loading";

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#0F172A] sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <Link
          to="/"
          className="mb-10 w-fit text-xl font-bold tracking-[-0.03em] text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
          aria-label="Ensina-me, página inicial"
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
            Acesse sua área de aprendizagem do Ensina-me.
          </p>

          {message && (
            <p
              className={`mt-5 rounded-md border px-4 py-3 text-sm ${
                status === "success"
                  ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
                  : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
              }`}
              role={status === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {message}
            </p>
          )}

          <form className="mt-8 space-y-5" aria-label="Formulário de login" onSubmit={handleSubmit}>
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="password" className="text-sm font-medium text-[#0F172A]">
                  Senha
                </label>
                <span className="text-xs text-[#64748B]">Use sua senha cadastrada</span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-md bg-[#0242D7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#64748B]">
            Ainda não tem uma conta?{" "}
            <Link
              to="/cadastro"
              className="font-semibold text-[#0242D7] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Criar conta
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
