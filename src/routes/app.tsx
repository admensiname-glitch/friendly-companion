import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/app")({
  // Keep this shell client-only. Supabase Auth uses browser session storage,
  // so protected-route checks belong in the browser rather than SSR.
  ssr: false,
  component: AppLayout,
});

type IconName = "home" | "book" | "library" | "review" | "chart" | "logout" | "spark" | "moon" | "sun" | "user" | "more" | "close";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /><path d="M8 7h8" /></>,
    library: <><path d="M4 19V5" /><path d="M8 19V5" /><path d="M12 19V5" /><path d="M16 19V5" /><path d="M20 19V5" /></>,
    review: <><path d="M4 6h16" /><path d="M4 12h11" /><path d="M4 18h8" /><path d="m17 15 2 2 3-4" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 4v16" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 4 .7 2 2 .7-.2.7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></>,
    moon: <><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z" /></>,
    sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m4.93 19.07 1.41-1.41" /><path d="m17.66 6.34 1.41-1.41" /></>,
    user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
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
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      setAuthChecking(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        await navigate({ to: "/login", replace: true });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("student_profiles")
        .select("onboarding_completed")
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setAuthError("Não foi possível verificar sua configuração. Verifique sua conexão e tente novamente.");
        setAuthChecking(false);
        return;
      }

      if (!profile?.onboarding_completed) {
        await navigate({ to: "/onboarding", replace: true });
        return;
      }

      setAuthChecking(false);
    };

    void checkAccess();

    return () => {
      active = false;
    };
  }, [navigate]);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("ensina-me-theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  function toggleTheme() {
    setIsDark((current) => {
      const next = !current;
      window.localStorage.setItem("ensina-me-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }
  const [mobileGuideOpen, setMobileGuideOpen] = useState(false);

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

  if (authChecking || authError) {
    return (
      <div className="min-h-screen bg-background text-foreground" aria-busy={authChecking}>
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          {authError ? (
            <div className="w-full max-w-md rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-6 text-center dark:border-[#6B3030] dark:bg-[#2A161A]">
              <p className="text-sm font-semibold text-[#991B1B] dark:text-[#FCA5A5]">{authError}</p>
              <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 rounded-xl bg-[#0242D7] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0038B8]">Tentar novamente</button>
            </div>
          ) : (
            <div className="text-sm font-medium text-[#687688] dark:text-[#AAB7C7]">
              Abrindo sua área de aprendizagem...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={isDark ? "fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#27364A] bg-[#101A29] lg:flex" : "fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#DCE4ED] bg-[#E9EEF4] lg:flex"}>
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

        <div className="mt-auto border-t border-[#DCE4ED] px-4 py-4 dark:border-[#27364A]">
          {logoutError && <p className="mb-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs leading-5 text-[#B91C1C]" role="alert">{logoutError}</p>}
          <Link
            to="/app/perfil"
            className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[#EAF0F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] dark:hover:bg-[#172033]"
            aria-label="Abrir meu perfil"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0242D7] text-[10px] font-extrabold tracking-wide text-white shadow-sm">
              EM
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#0F172A] dark:text-[#E7EDF5]">Meu perfil</p>
              <p className="mt-0.5 truncate text-[11px] text-[#7B8796] dark:text-[#8797AA]">Conta e preferências</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#7B8796] transition-colors hover:bg-[#EAF0F6] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#8797AA] dark:hover:bg-[#172033] dark:hover:text-[#E7EDF5]"
          >
            <Icon name="logout" className="h-4 w-4" />
            {isLoggingOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      </aside>

      <header className={isDark ? "sticky top-0 z-30 border-b border-[#27364A] bg-[#0D1624]/96 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur lg:ml-[248px]" : "sticky top-0 z-30 border-b border-[#DCE4ED] bg-[#F1F4F8]/96 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur lg:ml-[248px]"}>
        <div className="flex h-[64px] items-center justify-between gap-2 px-3 sm:h-[72px] sm:gap-3 sm:px-6 lg:px-9">
          <Link to="/app/dashboard" className="focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4 dark:focus-visible:ring-offset-[#101827] lg:hidden" aria-label="Ensina-me, início"><BrandLogo compact tone={isDark ? "light" : "blue"} /></Link>
          <div className="hidden lg:block">
            <p className="text-[11px] font-medium text-[#98A3B1]">Seu espaço de aprendizagem</p>
            <p className="mt-0.5 text-sm font-semibold text-[#273547]">Estude no seu ritmo. Avance com clareza.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 lg:flex">
            <Link
              to="/app/perfil"
              aria-label="Abrir meu perfil"
              title="Meu perfil"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE4ED] bg-white text-[#596778] transition-colors hover:border-[#C8D7EB] hover:text-[#0242D7] dark:border-[#334155] dark:bg-[#172033] dark:text-[#C5D0DE] dark:hover:border-[#4B6380] dark:hover:text-[#7DB0FF]"
            >
              <Icon name="user" className="h-[17px] w-[17px]" />
            </Link>
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
            </div>
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
        <div className="mx-auto w-full max-w-[1180px] px-3.5 py-5 pb-24 sm:px-6 sm:py-7 sm:pb-10 lg:px-9 lg:py-9 lg:pb-12">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label="Navegação rápida"
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[#DCE5EE] bg-[#F8FAFC]/96 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-[#2B3A4F] dark:bg-[#111B2A]/96 lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5">
          {navigation.slice(0, 2).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/app/dashboard" }}
              activeProps={{ className: "text-[#0242D7] dark:text-[#7DB0FF]" }}
              inactiveProps={{ className: "text-[#7A8796] dark:text-[#8FA0B2]" }}
              className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold"
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "flex h-7 w-9 items-center justify-center rounded-xl bg-[#EAF1FC] dark:bg-[#172B48]" : "flex h-7 w-9 items-center justify-center rounded-xl"}>
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </Link>
          ))}

          <Link
            to="/app/estude-agora"
            className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold text-[#0242D7] dark:text-[#7DB0FF]"
            activeOptions={{ exact: true }}
          >
            <span className="flex h-8 w-10 items-center justify-center rounded-2xl bg-[#0242D7] text-white shadow-[0_6px_16px_rgba(2,66,215,0.22)] dark:bg-[#4E8CF0]">
              <Icon name="spark" className="h-[18px] w-[18px]" />
            </span>
            <span className="truncate">Estudar</span>
          </Link>

          <Link
            to="/app/revisao"
            className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold text-[#7A8796] dark:text-[#8FA0B2]"
            activeProps={{ className: "text-[#0242D7] dark:text-[#7DB0FF]" }}
            activeOptions={{ exact: true }}
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? "flex h-7 w-9 items-center justify-center rounded-xl bg-[#EAF1FC] dark:bg-[#172B48]" : "flex h-7 w-9 items-center justify-center rounded-xl"}>
                  <Icon name="review" className="h-[18px] w-[18px]" />
                </span>
                <span className="truncate">Revisão</span>
              </>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMobileGuideOpen(true)}
            aria-label="Abrir mais opções"
            className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold text-[#7A8796] dark:text-[#8FA0B2]"
          >
            <span className="flex h-7 w-9 items-center justify-center rounded-xl">
              <Icon name="more" className="h-[18px] w-[18px]" />
            </span>
            <span className="truncate">Mais</span>
          </button>
        </div>
      </nav>

      {mobileGuideOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/35 backdrop-blur-[2px]"
            aria-label="Fechar guia do aluno"
            onClick={() => setMobileGuideOpen(false)}
          />
          <aside
            aria-label="Guia do aluno"
            className={isDark
              ? "absolute inset-y-0 right-0 flex w-[min(88vw,340px)] flex-col border-l border-[#2B3A4F] bg-[#111B2A] shadow-2xl"
              : "absolute inset-y-0 right-0 flex w-[min(88vw,340px)] flex-col border-l border-[#DCE5EE] bg-[#F6F8FA] shadow-2xl"}
          >
            <div className="flex items-center justify-between border-b border-[#DCE5EE] px-5 py-4 dark:border-[#2B3A4F]">
              <div>
                <p className="text-xs font-semibold text-[#0242D7] dark:text-[#7DB0FF]">Ensina-me</p>
                <h2 className="mt-1 text-lg font-bold text-[#172334] dark:text-[#E7EDF5]">Guia do aluno</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileGuideOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#718093] hover:bg-[#EAF0F5] dark:text-[#9AA9BA] dark:hover:bg-[#1B2638]"
                aria-label="Fechar guia do aluno"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Navegação móvel">
              <p className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A96A5] dark:text-[#74869A]">
                Onde estudar
              </p>
              <div className="mt-2">
                {navigation.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileGuideOpen(false)}
                    activeOptions={{ exact: item.to === "/app/dashboard" }}
                    activeProps={{ className: "flex min-h-12 items-center gap-3 rounded-xl bg-[#EAF1FC] px-3 text-sm font-bold text-[#0242D7] dark:bg-[#1A2A40] dark:text-[#7DB0FF]" }}
                    inactiveProps={{ className: "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#536276] hover:bg-[#EAF0F5] dark:text-[#B5C2D0] dark:hover:bg-[#1B2638]" }}
                  >
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-8 border-t border-[#E2E8EF] pt-5 dark:border-[#2B3A4F]">
                <p className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A96A5] dark:text-[#74869A]">
                  Conta
                </p>
                <Link
                  to="/app/perfil"
                  onClick={() => setMobileGuideOpen(false)}
                  className="mt-2 flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#536276] hover:bg-[#EAF0F5] dark:text-[#B5C2D0] dark:hover:bg-[#1B2638]"
                >
                  <Icon name="user" className="h-[18px] w-[18px]" />
                  Meu perfil
                </Link>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="mt-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#536276] hover:bg-[#EAF0F5] dark:text-[#B5C2D0] dark:hover:bg-[#1B2638]"
                >
                  <Icon name={isDark ? "sun" : "moon"} className="h-[18px] w-[18px]" />
                  {isDark ? "Modo claro" : "Modo noturno"}
                </button>
              </div>
            </nav>

            <div className="border-t border-[#E2E8EF] p-4 dark:border-[#2B3A4F]">
              <p className="px-2 text-xs leading-5 text-[#7A8796] dark:text-[#8797AA]">
                Use o Tutor quando quiser uma explicação, um exemplo ou uma nova questão.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
