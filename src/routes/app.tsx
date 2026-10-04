import { Link, Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type IconName =
  | "home"
  | "book"
  | "library"
  | "review"
  | "chart"
  | "exam"
  | "logout"
  | "spark"
  | "moon"
  | "sun"
  | "user"
  | "more"
  | "close"
  | "bell"
  | "chevron";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /><path d="M8 7h8" /></>,
    library: <><path d="M4 19V5" /><path d="M8 19V5" /><path d="M12 19V5" /><path d="M16 19V5" /><path d="M20 19V5" /></>,
    review: <><path d="M4 6h16" /><path d="M4 12h11" /><path d="M4 18h8" /><path d="m17 15 2 2 3-4" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>,
    exam: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /><path d="m15 15 1.5 1.5L19 14" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 4v16" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 4 .7 2 2 .7-.2.7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></>,
    moon: <><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z" /></>,
    sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m4.93 19.07 1.41-1.41" /><path d="m17.66 6.34 1.41-1.41" /></>,
    user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
    more: <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}

const navigation = [
  { to: "/app/dashboard" as const, label: "Início", icon: "home" as const },
  { to: "/app/disciplinas" as const, label: "Disciplinas", icon: "book" as const },
  { to: "/app/estude-agora" as const, label: "Estudar agora", icon: "spark" as const },
  { to: "/app/prova" as const, label: "Praticar", icon: "exam" as const },
  { to: "/app/revisao" as const, label: "Revisão", icon: "review" as const },
  { to: "/app/desempenho" as const, label: "Desempenho", icon: "chart" as const },
  { to: "/app/catalogo" as const, label: "Catálogo", icon: "library" as const },
];

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const logoutPending = useRef(false);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      setAuthChecking(true);
      setAuthError(null);

      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AUTH_CHECK_TIMEOUT")), 8000),
        ),
      ]).catch((caughtError) => ({
        data: { session: null },
        error: caughtError,
      }));

      const { data, error } = sessionResult;
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("ensina-me-theme");
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    setIsDark((current) => {
      const next = !current;
      window.localStorage.setItem("ensina-me-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }

  async function handleLogout() {
    if (logoutPending.current || isLoggingOut) return;
    logoutPending.current = true;
    setIsLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await navigate({ to: "/login" });
    } catch {
      setIsLoggingOut(false);
      logoutPending.current = false;
    }
  }

  const mobileFlowClass = (() => {
    const pathname = location.pathname;
    if (pathname.includes("/app/estudo/") || pathname.includes("/app/questoes/")) return " app-study-flow";
    if (pathname.startsWith("/app/prova")) return " app-assessment-flow";
    if (pathname === "/app/revisao") return " app-review-flow";
    return "";
  })();

  const mobileContext = (() => {
    const pathname = location.pathname;
    if (pathname === "/app/dashboard" || pathname === "/app/") return { title: "Início", back: false };
    if (pathname === "/app/estude-agora") return { title: "Estudar agora", back: false };
    if (pathname === "/app/disciplinas" || pathname === "/app/disciplinas/") return { title: "Disciplinas", back: false };
    if (pathname === "/app/prova") return { title: "Modo Prova", back: false };
    if (pathname === "/app/revisao") return { title: "Revisão", back: false };
    if (pathname === "/app/desempenho") return { title: "Desempenho", back: false };
    if (pathname === "/app/catalogo" || pathname === "/app/catalogo/") return { title: "Catálogo", back: false };
    if (pathname === "/app/perfil") return { title: "Meu perfil", back: true };
    if (pathname.includes("/app/disciplinas/")) return { title: "Tópico", back: true };
    if (pathname.includes("/app/estudo/")) return { title: "Estudo", back: true };
    if (pathname.includes("/app/questoes/")) return { title: "Questão", back: true };
    return { title: "Ensina-me", back: true };
  })();

  if (authChecking || authError) {
    return (
      <div className="app-stage flex min-h-[100dvh] items-center justify-center px-6" aria-busy={authChecking}>
        {authError ? (
          <div className="app-card w-full max-w-md p-6 text-center">
            <p className="text-sm font-semibold text-[#991B1B] dark:text-[#FCA5A5]">{authError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="app-primary-button mt-4 min-h-11 px-5"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="app-brand-mark h-12 w-12">
              <BrandLogo compact tone="blue" />
            </div>
            <p className="text-sm font-semibold text-[#687688] dark:text-[#AAB7C7]">
              Abrindo seu espaço de aprendizagem...
            </p>
          </div>
        )}
      </div>
    );
  }

  const mobileNav = [
    navigation[0]!,
    navigation[2]!,
    navigation[3]!,
    navigation[4]!,
  ];

  return (
    <div className={`app-shell min-h-[100dvh] bg-background text-foreground${mobileFlowClass}`}>
      <aside className="app-desktop-sidebar fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r lg:flex">
        <div className="flex h-[82px] items-center px-7">
          <Link to="/app/dashboard" aria-label="Ensina-me, início">
            <BrandLogo tone={isDark ? "light" : "blue"} />
          </Link>
        </div>

        <div className="px-4 pt-5">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#98A4B4]">
            Seu espaço
          </p>
          <nav className="mt-3 space-y-1" aria-label="Navegação principal">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/app/dashboard" }}
                activeProps={{ className: "app-sidebar-item app-sidebar-item-active" }}
                inactiveProps={{ className: "app-sidebar-item" }}
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "app-nav-icon app-nav-icon-active" : "app-nav-icon"}>
                      <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto px-4 pb-5">
          <div className="app-sidebar-profile">
            <Link to="/app/perfil" className="flex min-w-0 flex-1 items-center gap-3">
              <span className="app-avatar">EM</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">Meu perfil</span>
                <span className="mt-0.5 block truncate text-xs opacity-65">Conta e preferências</span>
              </span>
            </Link>
            <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="app-icon-button" aria-label="Sair">
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="app-mobile-header lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {mobileContext.back ? (
            <button
              type="button"
              className="app-icon-button app-back-button"
              aria-label="Voltar"
              onClick={() => window.history.length > 1 ? window.history.back() : void navigate({ to: "/app/dashboard" })}
            >
              <Icon name="chevron" className="h-5 w-5 rotate-180" />
            </button>
          ) : (
            <Link to="/app/dashboard" aria-label="Ensina-me, início" className="shrink-0">
              <BrandLogo compact tone={isDark ? "light" : "blue"} />
            </Link>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold tracking-[-0.02em] text-[#172334] dark:text-[#E7EDF5]">{mobileContext.title}</p>
            {mobileContext.back && <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A96A5] dark:text-[#8797AA]">Ensina-me</p>}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="app-icon-button"
            aria-label="Notificações"
            aria-expanded={notificationOpen}
            onClick={() => setNotificationOpen((open) => !open)}
          >
            <Icon name="bell" className="h-[19px] w-[19px]" />
            <span className="app-notification-dot" aria-hidden="true" />
          </button>
          <Link to="/app/perfil" className="app-avatar app-avatar-small" aria-label="Meu perfil">
            EM
          </Link>
        </div>
      </header>

      <header className="app-desktop-header sticky top-0 z-30 hidden border-b lg:block lg:ml-[252px]">
        <div className="mx-auto flex h-[74px] max-w-[1280px] items-center justify-between px-8">
          <div>
            <p className="text-xs font-semibold text-[#8B97A7] dark:text-[#91A1B2]">Seu espaço de aprendizagem</p>
            <p className="mt-1 text-sm font-extrabold text-[#243245] dark:text-[#E7EDF5]">Aprenda hoje. Conquiste amanhã.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme} className="app-top-action" aria-label={isDark ? "Ativar modo claro" : "Ativar modo noturno"}>
              <Icon name={isDark ? "sun" : "moon"} className="h-4 w-4" />
            </button>
            <Link to="/app/revisao" className="app-top-action gap-2 px-3">
              <Icon name="review" className="h-4 w-4" />
              <span>Revisão</span>
            </Link>
            <Link to="/app/estude-agora" className="app-primary-button h-10 px-4">
              <Icon name="spark" className="h-4 w-4" />
              Estudar agora
            </Link>
          </div>
        </div>
      </header>

      {notificationOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/30 backdrop-blur-[2px]"
            onClick={() => setNotificationOpen(false)}
            aria-label="Fechar notificações"
          />
          <section
            className="absolute right-3 top-[calc(4.5rem+env(safe-area-inset-top))] w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[#DCE5F0] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:border-[#304158] dark:bg-[#111C2A]"
            aria-label="Notificações"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 dark:border-[#2B3A4F]">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0242D7] dark:text-[#7DB0FF]">Ensina-me</p>
                <h2 className="mt-1 text-base font-extrabold text-[#172334] dark:text-[#E7EDF5]">Notificações</h2>
              </div>
              <button
                type="button"
                className="app-icon-button"
                onClick={() => setNotificationOpen(false)}
                aria-label="Fechar"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">
              <div className="rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] p-4 dark:border-[#2B3A4F] dark:bg-[#172437]">
                <p className="text-sm font-extrabold text-[#243245] dark:text-[#E7EDF5]">Continue seu percurso</p>
                <p className="mt-1 text-xs leading-5 text-[#687688] dark:text-[#AAB7C7]">
                  O Ensina-me está pronto para indicar o próximo passo do seu estudo.
                </p>
                <Link
                  to="/app/estude-agora"
                  onClick={() => setNotificationOpen(false)}
                  className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#0242D7] px-3 py-2 text-xs font-extrabold text-white"
                >
                  Ver próximo passo
                </Link>
              </div>
              <p className="px-1 pb-1 pt-3 text-[11px] text-[#8A95A3] dark:text-[#7F90A3]">
                Novas notificações aparecerão aqui quando houver atividades, revisões ou avaliações importantes.
              </p>
            </div>
          </section>
        </div>
      )}

      <main className="lg:ml-[252px]">
        <div className="app-content mx-auto w-full max-w-[1280px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-8">
          <div key={location.pathname} className="app-route-stage">
            <Outlet />
          </div>
        </div>
      </main>

      <nav className="app-mobile-tabbar lg:hidden" aria-label="Navegação principal">
        <div className="mx-auto grid h-[68px] max-w-md grid-cols-5 px-1">
          {mobileNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/app/dashboard" }}
              className="app-tab"
              activeProps={{ className: "app-tab app-tab-active" }}
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "app-tab-icon app-tab-icon-active" : "app-tab-icon"}>
                    <Icon name={item.icon} className="h-[19px] w-[19px]" />
                  </span>
                  <span>{item.label === "Estudar agora" ? "Estudar" : item.label}</span>
                </>
              )}
            </Link>
          ))}
          <button type="button" className="app-tab" onClick={() => setMoreOpen(true)} aria-label="Mais opções">
            <span className="app-tab-icon">
              <Icon name="more" className="h-[19px] w-[19px]" />
            </span>
            <span>Mais</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="app-sheet-backdrop lg:hidden" role="presentation">
          <button type="button" className="absolute inset-0 bg-[#0F172A]/35 backdrop-blur-[2px]" onClick={() => setMoreOpen(false)} aria-label="Fechar menu" />
          <section className="app-bottom-sheet" aria-label="Mais opções">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-[#CBD5E1] dark:bg-[#475569]" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0242D7] dark:text-[#78A9FF]">Ensina-me</p>
                <h2 className="mt-1 text-xl font-extrabold text-[#172334] dark:text-[#E7EDF5]">Mais opções</h2>
              </div>
              <button type="button" className="app-icon-button" onClick={() => setMoreOpen(false)} aria-label="Fechar">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3 rounded-2xl border border-[#D7E4F5] bg-[#F7FAFF] p-4 dark:border-[#304158] dark:bg-[#172437]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0242D7] text-white">
                  <span className="text-lg">↓</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-[#172334] dark:text-[#E7EDF5]">
                    {isInstalled ? "Ensina-me instalado" : "Instale o Ensina-me"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#687688] dark:text-[#AAB7C7]">
                    {isInstalled
                      ? "Você já está usando a versão instalada."
                      : installPrompt
                        ? "Abra como aplicativo, sem a aba do navegador."
                        : "Use o menu do Chrome e escolha “Instalar aplicativo” quando estiver disponível."}
                  </p>
                </div>
              </div>
              {!isInstalled && installPrompt && (
                <button
                  type="button"
                  onClick={() => void installApp()}
                  disabled={installing}
                  className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  {installing ? "Instalando..." : "Instalar aplicativo"}
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {navigation.slice(1).filter((item) => item.to !== "/app/estude-agora").map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMoreOpen(false)} className="app-sheet-item">
                  <span className="app-sheet-item-icon"><Icon name={item.icon} className="h-5 w-5" /></span>
                  <span>{item.label}</span>
                  <Icon name="chevron" className="ml-auto h-4 w-4 opacity-40" />
                </Link>
              ))}
              <Link to="/app/perfil" onClick={() => setMoreOpen(false)} className="app-sheet-item">
                <span className="app-sheet-item-icon"><Icon name="user" className="h-5 w-5" /></span>
                <span>Meu perfil</span>
                <Icon name="chevron" className="ml-auto h-4 w-4 opacity-40" />
              </Link>
              <button type="button" onClick={toggleTheme} className="app-sheet-item">
                <span className="app-sheet-item-icon"><Icon name={isDark ? "sun" : "moon"} className="h-5 w-5" /></span>
                <span>{isDark ? "Modo claro" : "Modo escuro"}</span>
                <Icon name="chevron" className="ml-auto h-4 w-4 opacity-40" />
              </button>
            </div>

            <button type="button" onClick={() => void handleLogout()} disabled={isLoggingOut} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#F3D5D8] bg-[#FFF7F7] px-4 text-sm font-extrabold text-[#B4232D] dark:border-[#5E3037] dark:bg-[#2A181C] dark:text-[#FCA5A5]">
              <Icon name="logout" className="h-4 w-4" />
              {isLoggingOut ? "Saindo..." : "Sair da conta"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
