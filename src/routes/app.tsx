import { Link, Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const logoutPending = useRef(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (logoutPending.current || isLoggingOut) return;

    logoutPending.current = true;
    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setLogoutError("Não foi possível sair. Tente novamente.");
        setIsLoggingOut(false);
        logoutPending.current = false;
        return;
      }

      await navigate({ to: "/login" });
    } catch {
      setLogoutError("Não foi possível sair. Tente novamente.");
      setIsLoggingOut(false);
      logoutPending.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-5 lg:px-8">
          <Link
            to="/app/dashboard"
            className="text-xl font-bold tracking-[-0.03em] text-[#0242D7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
            aria-label="Ensina-me, área do aluno"
          >
            Ensina-me
          </Link>

          <nav aria-label="Navegação principal" className="hidden items-center gap-1 sm:flex">
            <Link
              to="/app/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0242D7]"
            >
              Início
            </Link>
            <Link
              to="/app/disciplinas"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0242D7]"
            >
              Minhas disciplinas
            </Link>
            <Link
              to="/app/catalogo"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0242D7]"
            >
              Catálogo
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {logoutError && (
              <span
                className="text-sm text-[#DC2626]"
                role="alert"
              >
                {logoutError}
              </span>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Sair da área do aluno"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut ? "Saindo..." : "Sair da área"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
        <Outlet />
      </main>
    </div>
  );
}
