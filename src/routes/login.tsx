import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" }] }),
  component: Login,
});

type LoginStatus = "normal" | "loading" | "success" | "error";
type ResendStatus = "normal" | "loading" | "success" | "error";
type AuthDiagnostic = {
  code: string;
  message: string;
  status: number | null;
} | null;

type AuthErrorLike = {
  code?: string | null;
  message: string;
  status?: number | null;
};

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

function getAuthErrorDetails(error: AuthErrorLike) {
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
        "E-mail ainda não confirmado. Confirme sua conta pelo e-mail enviado pelo Ensina-me antes de entrar.",
      diagnostic: { code, message, status } satisfies NonNullable<AuthDiagnostic>,
      canResend: true,
    };
  }

  if (
    normalizedCode === "invalid_credentials" ||
    normalizedMessage.includes("invalid login credentials")
  ) {
    return {
      userMessage:
        "E-mail ou senha inválidos. Confira os dados e tente novamente.",
      diagnostic: { code, message, status } satisfies NonNullable<AuthDiagnostic>,
      canResend: false,
    };
  }

  if (
    normalizedCode === "user_not_found" ||
    normalizedMessage.includes("user not found")
  ) {
    return {
      userMessage:
        "Não foi encontrada uma conta de usuário com esses dados.",
      diagnostic: { code, message, status } satisfies NonNullable<AuthDiagnostic>,
      canResend: false,
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
      diagnostic: { code, message, status } satisfies NonNullable<AuthDiagnostic>,
      canResend: false,
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
      diagnostic: { code, message, status } satisfies NonNullable<AuthDiagnostic>,
      canResend: false,
    };
  }

  return {
    userMessage: `O Supabase Auth recusou o acesso: ${message}`,
    diagnostic: { code, message, status } satisfies NonNullable<AuthDiagnostic>,
    canResend: false,
  };
}

function Login() {
  const navigate = useNavigate();
  const submitPending = useRef(false);
  const resendPending = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<LoginStatus>("normal");
  const [message, setMessage] = useState("");
  const [authDiagnostic, setAuthDiagnostic] = useState<AuthDiagnostic>(null);
  const [canResend, setCanResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<ResendStatus>("normal");
  const [resendMessage, setResendMessage] = useState("");

  function clearAuthFeedback() {
    setMessage("");
    setAuthDiagnostic(null);
    setCanResend(false);
    setStatus("normal");
  }

  function clearResendFeedback() {
    setResendMessage("");
    setResendStatus("normal");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitPending.current) return;

    const formData = new FormData(event.currentTarget);
    const normalizedEmail = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const currentPassword = String(formData.get("password") ?? "");

    setMessage("");
    setAuthDiagnostic(null);
    setCanResend(false);
    setResendMessage("");
    setResendStatus("normal");

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

    submitPending.current = true;
    setStatus("loading");

    try {
      const { data: sessionData, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: currentPassword,
      });

      if (error) {
        const details = getAuthErrorDetails(error as AuthErrorLike);
        setMessage(details.userMessage);
        setAuthDiagnostic(details.diagnostic);
        setCanResend(details.canResend);
        setStatus("error");
        return;
      }

      if (!sessionData.session) {
        setStatus("error");
        setMessage("Não foi possível abrir sua sessão. Tente entrar novamente.");
        return;
      }

      // A sessão já está criada. Entre imediatamente na área do aluno.
      // O guard da rota /app continua responsável por validar onboarding e acesso.
      await navigate({ to: "/app/dashboard", replace: true });
    } catch (caughtError) {
      setMessage(
        caughtError instanceof Error
          ? `Falha inesperada: ${caughtError.message}`
          : "Não foi possível concluir o login. Tente novamente.",
      );
      setStatus("error");
    } finally {
      submitPending.current = false;
    }
  }

  async function handleResend() {
    if (resendPending.current) return;

    const normalizedEmail = email.trim().toLowerCase();
    setResendMessage("");

    if (!normalizedEmail) {
      setResendStatus("error");
      setResendMessage("Informe o e-mail antes de solicitar um novo envio.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setResendStatus("error");
      setResendMessage("Informe um endereço de e-mail válido.");
      return;
    }

    resendPending.current = true;
    setResendStatus("loading");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });

      if (error) {
        setResendStatus("error");
        setResendMessage(
          `Não foi possível reenviar a confirmação: ${error.message}`,
        );
        return;
      }

      setResendStatus("success");
      setResendMessage(
        "E-mail de confirmação reenviado. Confira também a pasta de spam.",
      );
    } catch (caughtError) {
      setResendStatus("error");
      setResendMessage(
        caughtError instanceof Error
          ? `Não foi possível reenviar a confirmação: ${caughtError.message}`
          : "Não foi possível reenviar a confirmação. Tente novamente.",
      );
    } finally {
      resendPending.current = false;
    }
  }

  const isLoading = status === "loading";
  const isResending = resendStatus === "loading";
  const showDiagnostic = import.meta.env.DEV && authDiagnostic !== null;

  return (
    <main className="h-dvh overflow-hidden bg-white px-4 py-3 text-[#14233B] sm:px-8 sm:py-5 lg:px-8 lg:py-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col justify-center">
        <Link
          to="/"
          className="mb-3 w-fit shrink-0 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4 lg:hidden"
          aria-label="Ensina-me, página inicial"
        >
          <BrandLogo />
        </Link>

        <div className="grid min-h-0 w-full items-center gap-3 sm:gap-4 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <aside className="hidden h-[460px] max-w-xl grid-rows-[auto_1fr_auto] lg:grid">
            <Link
              to="/"
              className="inline-block w-fit focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
              aria-label="Ensina-me, página inicial"
            >
              <BrandLogo large className="gap-3" />
            </Link>
            <div className="flex items-center py-8">
              <h2 className="max-w-[560px] text-[3rem] font-bold leading-[1.1] tracking-[-0.05em] text-[#14233B] xl:text-[3.5rem]">
                Você já começou. <span className="text-[#0242D7]">Continue de onde parou.</span>
              </h2>
            </div>
            <p className="max-w-lg self-end text-base leading-7 text-[#64748B] xl:text-lg xl:leading-8">
              Um pouco de cada vez também leva longe. Seu próximo avanço começa com o estudo de hoje.
            </p>
          </aside>
          <section className="mx-auto w-full max-w-[460px] self-center rounded-[26px] border border-[#E6EBF3] bg-white p-5 shadow-[0_24px_70px_rgba(20,35,59,0.12)] sm:rounded-[28px] sm:p-7 lg:min-h-[460px] lg:p-8" aria-labelledby="login-title">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0242D7]">
            Bem-vindo de volta
          </p>
          <h1 id="login-title" className="mt-3 text-[1.75rem] font-bold tracking-[-0.045em] sm:text-[1.9rem]">
            Que bom ter você aqui.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#718099]">
            Acesse seu espaço e continue aprendendo no seu ritmo.
          </p>

          {message && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
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
                      <dd className="inline">{authDiagnostic.status ?? "não informado"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Mensagem: </dt>
                      <dd className="inline break-words">{authDiagnostic.message}</dd>
                    </div>
                  </dl>
                </details>
              )}
            </div>
          )}

          {canResend && (
            <div className="mt-4 rounded-xl border border-[#DCE7FF] bg-[#F7F9FF] p-4 text-sm text-[#34445D]">
              <p>Ainda não recebeu o e-mail?</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading || isResending}
                className="mt-2 font-semibold text-[#0242D7] underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResending ? "Enviando..." : "Reenviar e-mail de confirmação"}
              </button>

              {resendMessage && (
                <p
                  className={`mt-3 ${
                    resendStatus === "success" ? "text-[#166534]" : "text-[#991B1B]"
                  }`}
                  role={resendStatus === "error" ? "alert" : "status"}
                  aria-live="polite"
                >
                  {resendMessage}
                </p>
              )}
            </div>
          )}

          <form className="mt-6 space-y-5 sm:mt-7 sm:space-y-5" aria-label="Formulário de login" onSubmit={handleSubmit}>
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
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearAuthFeedback();
                  clearResendFeedback();
                }}
                disabled={isLoading}
                className="mt-2 h-12 w-full rounded-xl border border-[#D9E2F0] bg-white px-4 text-sm text-[#14233B] [color-scheme:light] [-webkit-box-shadow:inset_0_0_0_1000px_#fff] [-webkit-text-fill-color:#14233B] outline-none transition placeholder:text-[#9AA6B8] hover:border-[#B9C9E2] focus:border-[#0242D7] focus:ring-4 focus:ring-[#0242D7]/10 disabled:cursor-not-allowed disabled:bg-[#F7F9FC]"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-[#0F172A]">Senha</label>
              <Link to="/recuperar-senha" className="text-xs font-semibold text-[#0242D7] hover:underline">Esqueci minha senha</Link>
            </div>

            <div>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearAuthFeedback();
                  }}
                  disabled={isLoading}
                  className="h-12 w-full rounded-xl border border-[#D9E2F0] bg-white py-2 pl-4 pr-12 text-sm text-[#14233B] [color-scheme:light] [-webkit-box-shadow:inset_0_0_0_1000px_#fff] [-webkit-text-fill-color:#14233B] outline-none transition placeholder:text-[#9AA6B8] hover:border-[#B9C9E2] focus:border-[#0242D7] focus:ring-4 focus:ring-[#0242D7]/10 disabled:cursor-not-allowed disabled:bg-[#F7F9FC]"
                  required
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

            <button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-[#0242D7] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(2,66,215,0.16)] transition-all hover:-translate-y-0.5 hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
            >
              {isLoading ? "Abrindo seu espaço..." : "Continuar meus estudos"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#64748B]">
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
      </div>
    </main>
  );
}
