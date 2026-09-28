import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: Login,
});

type LoginStatus = "normal" | "loading" | "success" | "error";
type AuthDiagnostic = {
  code: string;
  message: string;
  status: number | null;
} | null;

function getAuthErrorDetails(error: {
  code?: string;
  message: string;
  status?: number;
}) {
  const code = error.code || "não informado";
  const message = error.message || "O Supabase não informou uma mensagem de erro.";
  const status = typeof error.status === "number" ? error.status : null;
  const normalizedCode = code.toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedCode === "email_not_confirmed" ||
    normalizedMessage.includes("email not confirmed")
  ) {
    return {
      userMessage:
        "E-mail ainda não confirmado. Abra o e-mail enviado pelo Ensina-me e confirme sua conta antes de entrar.",
      diagnostic: { code, message, status },
    };
  }

  if (
    normalizedCode === "invalid_credentials" ||
    normalizedMessage.includes("invalid login credentials")
  ) {
    return {
      userMessage:
        "O Supabase recusou o e-mail ou a senha informados. Confira os dados e tente novamente.",
      diagnostic: { code, message, status },
    };
  }

  if (
    normalizedCode === "user_not_found" ||
    normalizedMessage.includes("user not found")
  ) {
    return {
      userMessage: "Não foi encontrada uma conta de usuário com esses dados.",
      diagnostic: { code, message, status },
    };
  }

  if (
    status === 0 ||
    normalizedCode === "network_request_failed" ||
    normalizedCode === "fetch_failed" ||
    normalizedMessage.includes("fetch") ||
    normalizedMessage.includes("network")
  ) {
    return {
      userMessage:
        "Não foi possível conectar ao serviço de autenticação. Verifique sua conexão e tente novamente.",
      diagnostic: { code, message, status },
    };
  }

  if (
    normalizedMessage.includes("session") ||
    normalizedMessage.includes("duplicate") ||
    normalizedMessage.includes("already logged")
  ) {
    return {
      userMessage:
        "O Supabase encontrou um conflito de sessão. Saia da conta atual e tente entrar novamente.",
      diagnostic: { code, message, status },
    };
  }

  return {
    userMessage:
      "O Supabase Auth recusou a autenticação por um motivo diferente dos casos conhecidos.",
    diagnostic: { code, message, status },
  };
}

function clearPreviousError() {
  setMessage("");
  setAuthDiagnostic(null);
  setStatus("normal");
}

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("normal");
  const [message, setMessage] = useState("");
  const [authDiagnostic, setAuthDiagnostic] =
    useState<AuthDiagnostic>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setAuthDiagnostic(null);

    const normalizedEmail = email.trim();
    const currentPassword = password;

    if (!normalizedEmail || !currentPassword) {
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

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: currentPassword,
      });

      if (error) {
        const details = getAuthErrorDetails(error);
        setMessage(details.userMessage);
        setAuthDiagnostic(details.diagnostic);
        setStatus("error");
        return;
      }

      setMessage(
        "Login realizado com sucesso. Redirecionando para sua área...",
      );
      setStatus("success");
      await navigate({ to: "/app/dashboard" });
    } catch (caughtError) {
      setMessage(
        caughtError instanceof Error
          ? `Falha inesperada: ${caughtError.message}`
          : "Não foi possível concluir o login. Tente novamente.",
      );
      setStatus("error");
    }
  }

  const isLoading = status === "loading";
  const showDiagnostic = import.meta.env.DEV && authDiagnostic !== null;

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

        <section
          className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8"
          aria-labelledby="login-title"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
            Área do aluno
          </p>
          <h1
            id="login-title"
            className="mt-3 text-3xl font-bold tracking-[-0.04em]"
          >
            Entre na sua conta
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            Acesse sua área de aprendizagem do Ensina-me.
          </p>

          {message && (
            <div
              className={`mt-5 rounded-md border px-4 py-3 text-sm ${
                status === "success"
                  ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
                  : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
              }`}
              role={status === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              <p>{message}</p>

              {showDiagnostic && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-semibold">
                    Detalhes técnicos do Supabase
                  </summary>
                  <dl className="mt-2 space-y-1 font-mono">
                    <div>
                      <dt className="inline font-semibold">Código: </dt>
                      <dd className="inline">{authDiagnostic.code}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Status: </dt>
                      <dd className="inline">
                        {authDiagnostic.status ?? "não informado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Mensagem: </dt>
                      <dd className="inline break-words">
                        {authDiagnostic.message}
                      </dd>
                    </div>
                  </dl>
                </details>
              )}
            </div>
          )}

          <form
            className="mt-8 space-y-5"
            aria-label="Formulário de login"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-[#0F172A]"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status === "error") clearPreviousError();
                }}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-[#0F172A]"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (status === "error") clearPreviousError();
                }}
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
