import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/cadastro")({
  component: Cadastro,
});

type SignUpStatus = "normal" | "loading" | "success" | "error";

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5.2 0 9 4.5 9 8a8.7 8.7 0 0 1-1.2 3.2" />
        <path d="M6.2 6.2A9.2 9.2 0 0 0 3 12c0 3.5 3.8 8 9 8a9.8 9.8 0 0 0 4.1-.9" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12S6.2 4 12 4s9.5 8 9.5 8-3.7 8-9.5 8a9.7 9.7 0 0 1-4-.8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Cadastro() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [status, setStatus] = useState<SignUpStatus>("normal");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password || !passwordConfirmation) {
      setStatus("error");
      setMessage("Preencha todos os campos para criar sua conta.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setStatus("error");
      setMessage("Informe um endereço de e-mail válido.");
      return;
    }

    if (password.length < 6) {
      setStatus("error");
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      setStatus("error");
      setMessage("A confirmação da senha não corresponde à senha informada.");
      return;
    }

    setStatus("loading");

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedName,
        },
      },
    });

    if (error) {
      setStatus("error");
      const normalizedError = `${error.code ?? ""} ${error.message}`.toLowerCase();

      if (
        normalizedError.includes("already registered") ||
        normalizedError.includes("already exists")
      ) {
        setMessage("Já existe uma conta com este e-mail. Tente entrar.");
      } else if (
        normalizedError.includes("fetch") ||
        normalizedError.includes("network") ||
        error.status === 0
      ) {
        setMessage("Não foi possível conectar ao serviço de autenticação. Tente novamente.");
      } else {
        setMessage(
          `Não foi possível criar sua conta: ${error.message}`,
        );
      }
      return;
    }

    setStatus("success");

    if (data.session) {
      setMessage(
        "Conta criada e sessão iniciada. Abrindo sua configuração inicial...",
      );
      await navigate({ to: "/onboarding" });
    } else {
      setMessage(
        "Conta criada com sucesso. Enviamos um e-mail de confirmação. Abra o e-mail enviado pelo Ensina-me e confirme sua conta antes de entrar.",
      );
    }
  }

  const isLoading = status === "loading";

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#0F172A] sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
            aria-label="Ensina-me, página inicial"
          >
            <BrandLogo compact />
          </Link>
          <Link
            to="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-[#0F172A] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
          >
            Já tenho conta
          </Link>
        </header>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="cadastro-title">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
            Criar conta
          </p>
          <h1 id="cadastro-title" className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A]">
            Comece sua jornada
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            Crie sua conta para acompanhar sua aprendizagem no Ensina-me.
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
              {status === "success" && !dataHasSession(message) && (
                <Link
                  to="/login"
                  className="mt-3 inline-block font-semibold underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7]"
                >
                  Ir para o login
                </Link>
              )}
            </div>
          )}

          <form className="mt-8 space-y-5" aria-label="Formulário de criação de conta" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nome" className="text-sm font-medium text-[#0F172A]">
                Nome completo
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                autoComplete="name"
                placeholder="Digite seu nome"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                required
              />
            </div>

            <div>
              <label htmlFor="email-cadastro" className="text-sm font-medium text-[#0F172A]">
                E-mail
              </label>
              <input
                id="email-cadastro"
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
              <label htmlFor="senha-cadastro" className="text-sm font-medium text-[#0F172A]">
                Senha
              </label>
              <div className="relative mt-2">
                <input
                  id="senha-cadastro"
                  name="senha"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Crie uma senha com pelo menos 6 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                  className="h-11 w-full rounded-md border border-[#CBD5E1] bg-white py-2 pl-3 pr-12 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-[#64748B] transition-colors hover:text-[#0242D7] focus-visible:rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0242D7] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                >
                  <PasswordVisibilityIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmar-senha-cadastro" className="text-sm font-medium text-[#0F172A]">
                Confirmar senha
              </label>
              <div className="relative mt-2">
                <input
                  id="confirmar-senha-cadastro"
                  name="confirmar-senha"
                  type={showPasswordConfirmation ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repita sua senha"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  disabled={isLoading}
                  className="h-11 w-full rounded-md border border-[#CBD5E1] bg-white py-2 pl-3 pr-12 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirmation((current) => !current)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-[#64748B] transition-colors hover:text-[#0242D7] focus-visible:rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0242D7] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={
                    showPasswordConfirmation
                      ? "Ocultar confirmação da senha"
                      : "Mostrar confirmação da senha"
                  }
                  aria-pressed={showPasswordConfirmation}
                >
                  <PasswordVisibilityIcon visible={showPasswordConfirmation} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-md bg-[#0242D7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
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

function dataHasSession(message: string) {
  return message.includes("sessão iniciada");
}
