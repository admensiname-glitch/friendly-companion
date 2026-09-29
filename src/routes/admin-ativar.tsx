import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin-ativar")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: ActivateAdmin,
});

type ActivationStatus = "idle" | "loading" | "success" | "error";

type SupabaseErrorLike = {
  context?: unknown;
};

function getResponseStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const context = (error as SupabaseErrorLike).context;
  if (context instanceof Response) return context.status;

  if (
    context &&
    typeof context === "object" &&
    "status" in context &&
    typeof context.status === "number"
  ) {
    return context.status;
  }

  return null;
}

function isConnectionError(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      /fetch|network|conexão|connection/i.test(error.message))
  );
}

function ActivateAdmin() {
  const navigate = useNavigate();
  const submitPending = useRef(false);
  const [activationKey, setActivationKey] = useState("");
  const [showActivationKey, setShowActivationKey] = useState(false);
  const [status, setStatus] = useState<ActivationStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitPending.current) return;

    const submittedKey = activationKey.trim();
    if (!submittedKey) {
      setStatus("error");
      setMessage("Informe a chave de ativação.");
      return;
    }

    submitPending.current = true;
    setStatus("loading");
    setMessage("");

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !data.session) {
        setStatus("error");
        setMessage("Sua sessão expirou. Entre na sua conta novamente.");
        return;
      }

      const { error: activationError } = await supabase.functions.invoke(
        "bootstrap-admin",
        { body: { key: submittedKey } },
      );

      if (activationError) {
        const responseStatus = getResponseStatus(activationError);

        if (responseStatus === 401) {
          setMessage("Sua sessão expirou. Entre na sua conta novamente.");
        } else if (responseStatus === 403) {
          setMessage("Chave de ativação inválida.");
        } else if (responseStatus === 409) {
          setMessage(
            "A ativação inicial de administrador já foi concluída.",
          );
        } else if (isConnectionError(activationError)) {
          setMessage(
            "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.",
          );
        } else {
          setMessage(
            "Não foi possível concluir a ativação. Tente novamente em instantes.",
          );
        }

        setStatus("error");
        return;
      }

      setStatus("success");
      setMessage("Administrador ativado com sucesso.");
      await navigate({ to: "/admin" });
    } catch (error) {
      if (isConnectionError(error)) {
        setMessage(
          "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.",
        );
      } else {
        setMessage(
          "Não foi possível concluir a ativação. Tente novamente em instantes.",
        );
      }

      setStatus("error");
    } finally {
      setActivationKey("");
      submitPending.current = false;
    }
  }

  const isLoading = status === "loading";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-12 text-[#0F172A]">
      <section
        className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8"
        aria-labelledby="activate-admin-title"
      >
        <Link
          to="/app/dashboard"
          className="inline-block text-xl font-bold tracking-[-0.03em] text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
          aria-label="Ensina-me, área do aluno"
        >
          Ensina-me
        </Link>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
          Configuração administrativa
        </p>
        <h1
          id="activate-admin-title"
          className="mt-3 text-3xl font-bold tracking-[-0.04em]"
        >
          Ativação administrativa
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#64748B]">
          Ative o acesso administrativo desta conta.
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
            {message}
          </div>
        )}

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="activation-key"
              className="text-sm font-medium text-[#0F172A]"
            >
              Chave de ativação
            </label>
            <div className="relative mt-2">
              <input
                id="activation-key"
                name="activation-key"
                type={showActivationKey ? "text" : "password"}
                autoComplete="off"
                value={activationKey}
                onChange={(event) => {
                  setActivationKey(event.target.value);
                  if (status !== "loading") {
                    setStatus("idle");
                    setMessage("");
                  }
                }}
                disabled={isLoading}
                className="h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 pl-3 pr-12 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE] disabled:cursor-not-allowed disabled:bg-[#F1F5F9]"
                required
              />
              <button
                type="button"
                onClick={() => setShowActivationKey((current) => !current)}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-[#64748B] transition-colors hover:text-[#0242D7] focus-visible:rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0242D7] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={
                  showActivationKey
                    ? "Ocultar chave de ativação"
                    : "Mostrar chave de ativação"
                }
                aria-pressed={showActivationKey}
              >
                {showActivationKey ? (
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
                    <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                    <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5.2 0 9.5 8 9.5 8a8.7 8.7 0 0 1-1.2 3.2" />
                    <path d="M6.2 6.2A9.2 9.2 0 0 0 3 12c0 3.5 3.8 8 9 8a9.8 9.8 0 0 0 4.1-.9" />
                  </svg>
                ) : (
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
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded-md bg-[#0242D7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
          >
            {isLoading ? "Ativando..." : "Ativar acesso"}
          </button>
        </form>
      </section>
    </main>
  );
}
