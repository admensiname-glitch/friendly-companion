import { Link, Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

type IconName = "home" | "book" | "library" | "review" | "chart" | "logout" | "spark" | "moon" | "sun";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /><path d="M8 7h8" /></>,
    library: <><path d="M4 19V5" /><path d="M8 19V5" /><path d="M12 19V5" /><path d="M16 19V5" /><path d="M20 19V5" /></>,
    review: <><path d="M4 6h16" /><path d="M4 12h11" /><path d="M4 18h8" /><path d="m17 15 2 2 3-4" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 4v16" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 4 .7 2 2 .7-.2.7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}

const navigation = [
  { to: "/app/dashboard" as const, label: "Início", icon: "home" as const },
  { to: "/app/disciplinas" as const, label: "Disciplinas", icon: "book" as const },
  { to: "/app/catalogo" as const, label: "Catálogo", icon: "library" as const },
  { to: "/app/revisao" as const, label: "Revisão", icon: "review" as const },
  { to: "/app/desempenho" as const, label: "Desempenho", icon: "chart" as const },
];

function AppLayout() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("ensina-me-theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  function toggleTheme() {
    setIsDark((current) => {
      const next = !current;
      window.localStorage.setItem("ensina-me-theme", next ? "dark" : "light");
      return next;
    });
  }
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
    <div className={isDark ? "dark min-h-screen bg-[#0D1422] text-[#E7EDF5]" : "min-h-screen bg-[#EAF0F6] text-[#0F172A]"}>
      <aside className={isDark ? "fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#27364A] bg-[#111A2A] lg:flex" : "fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#DCE4ED] bg-[#F3F6FA] lg:flex"}>
        <div className="flex h-[72px] items-center px-7">
          <Link to="/app/dashboard" className="focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4 dark:focus-visible:ring-offset-[#111A2A]" aria-label="Ensina-me, início">
            <BrandLogo tone={isDark ? "light" : "blue"} />
          </Link>
        </div>

        <div className="px-4 pt-4">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A0AAB8]">Navegar</p>
          <nav aria-label="Navegação principal" className="mt-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/app/dashboard" }}
                activeProps={{ className: "group flex min-h-11 items-center gap-3 rounded-xl bg-[#EEF4FF] px-3 text-sm font-semibold text-[#0242D7]" }}
                inactiveProps={{ className: "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#596778] transition-colors hover:bg-[#F8FAFC] hover:text-[#172334]" }}
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0242D7] shadow-sm" : "flex h-8 w-8 items-center justify-center rounded-lg text-[#8793A1]"}>
                      <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto px-4 pb-5">
          {logoutError && <p className="mb-3 rounded-lg bg-[#FEF2F2] px-3 py-2 text-xs leading-5 text-[#B91C1C]" role="alert">{logoutError}</p>}
          <div className="rounded-2xl border border-[#E7ECF3] bg-[#FAFBFD] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0242D7] text-[10px] font-bold text-white">EM</div>
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">Área do aluno</p>
                <p className="mt-0.5 text-[11px] text-[#8B96A5]">Seu espaço de estudo</p>
              </div>
            </div>
            <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#6B7787] transition-colors hover:bg-[#FFFFFF] hover:text-[#0F172A] disabled:opacity-60">
              <Icon name="logout" className="h-4 w-4" />
              {isLoggingOut ? "Saindo..." : "Sair da área"}
            </button>
          </div>
        </div>
      </aside>

      <header className={isDark ? "sticky top-0 z-30 border-b border-[#27364A] bg-[#101827]/95 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur lg:ml-[248px]" : "sticky top-0 z-30 border-b border-[#DCE4ED] bg-[#F7F9FC]/95 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur lg:ml-[248px]"}>
        <div className="flex h-[64px] items-center justify-between gap-2 px-3 sm:h-[72px] sm:gap-3 sm:px-6 lg:px-9">
          <Link to="/app/dashboard" className="focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4 dark:focus-visible:ring-offset-[#101827] lg:hidden" aria-label="Ensina-me, início"><BrandLogo compact tone={isDark ? "light" : "blue"} /></Link>
          <div className="hidden lg:block">
            <p className="text-[11px] font-medium text-[#98A3B1]">Seu espaço de aprendizagem</p>
            <p className="mt-0.5 text-sm font-semibold text-[#273547]">Estude no seu ritmo. Avance com clareza.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={isDark}
              aria-label={isDark ? "Ativar modo claro" : "Ativar modo noturno"}
              title={isDark ? "Modo claro" : "Modo noturno"}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#DCE4ED] bg-white px-2.5 text-sm font-semibold text-[#596778] transition-colors hover:border-[#C8D7EB] hover:text-[#0242D7] dark:border-[#334155] dark:bg-[#172033] dark:text-[#C5D0DE] dark:hover:border-[#4B6380] dark:hover:text-[#7DB0FF]"
            >
              <Icon name={isDark ? "sun" : "moon"} className="h-[17px] w-[17px]" />
              <span className="hidden sm:inline">{isDark ? "Modo claro" : "Modo noturno"}</span>
            </button>
            <Link to="/app/revisao" className="hidden items-center gap-2 rounded-xl border border-[#E1E7EF] bg-white px-3.5 py-2 text-sm font-semibold text-[#556273] transition-colors hover:border-[#C8D7EB] hover:text-[#0242D7] dark:border-[#334155] dark:bg-[#172033] dark:text-[#B7C3D1] dark:hover:border-[#4B6380] dark:hover:text-[#7DB0FF] sm:flex">
              <Icon name="review" className="h-4 w-4" />
              Revisar
            </Link>
            <Link to="/app/estude-agora" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0242D7] px-3 sm:h-auto sm:px-3.5 sm:py-2 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(2,66,215,0.18)] transition-all hover:-translate-y-px hover:bg-[#0038B8] dark:shadow-[0_8px_24px_rgba(2,66,215,0.28)]">
              <Icon name="spark" className="h-4 w-4" />
              <span className="hidden sm:inline">Estudar agora</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="lg:ml-[248px]">
        <div className="mx-auto w-full max-w-[1180px] px-3.5 py-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:px-9 lg:py-9 lg:pb-12">
          <Outlet />
        </div>
      </main>

      <nav aria-label="Navegação móvel" className={isDark ? "mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[#27364A] bg-[#111A2A]/96 px-1.5 pt-1.5 backdrop-blur lg:hidden" : "mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[#E1E7EF] bg-[#F4F7FB]/96 px-1.5 pt-1.5 backdrop-blur lg:hidden"}>
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-0.5">
          {navigation.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/app/dashboard" }}
              activeProps={{ className: "touch-manipulation flex min-h-[50px] min-w-0 flex-col items-center justify-center rounded-xl bg-[#EEF4FF] px-1 text-[#0242D7]" }}
              inactiveProps={{ className: "touch-manipulation flex min-h-[50px] min-w-0 flex-col items-center justify-center rounded-xl px-1 text-[#7A8796] transition-colors hover:bg-[#F8FAFC] hover:text-[#0242D7]" }}
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} className={isActive ? "h-[19px] w-[19px] text-[#0242D7]" : "h-[19px] w-[19px]"} />
                  <span className="mt-1 max-w-full truncate text-[9px] font-semibold leading-none sm:text-[10px]">{item.label}</span>
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
