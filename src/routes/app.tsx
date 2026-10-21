import { Link, Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" }] }),
  component: AppLayout,
});

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
  | "chevron"
  | "tutor"
  | "community"
  | "messages";

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
    chevron: <path d="m9 18 6-6-6-6" />,
    tutor: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M8 8h8" /><path d="M8 12h5" /><path d="M15 15h3" /></>,
    community: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M2.5 20a5.5 5.5 0 0 1 11 0" /><path d="M10.5 20a5.5 5.5 0 0 1 11 0" /></>,
    messages: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l-2 2v-5.5A8.5 8.5 0 1 1 21 11.5Z" /><path d="M7.5 11h9" /><path d="M7.5 15h6" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}

const navigation = [
  { to: "/app/dashboard" as const, label: "Início", icon: "home" as const },
  { to: "/app/disciplinas" as const, label: "Meus cursos", icon: "book" as const },
  { to: "/app/estude-agora" as const, label: "Estudar agora", icon: "spark" as const },
  { to: "/app/tutor" as const, label: "Tutor", icon: "tutor" as const },
  { to: "/app/comunidade" as const, label: "Comunidade", icon: "community" as const },
  { to: "/app/direct" as const, label: "Direct", icon: "messages" as const },
  { to: "/app/prova" as const, label: "Praticar", icon: "exam" as const },
  { to: "/app/revisao" as const, label: "Revisão", icon: "review" as const },
  { to: "/app/desempenho" as const, label: "Desempenho", icon: "chart" as const },
];

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authChecking, setAuthChecking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileName, setProfileName] = useState("Meu perfil");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const logoutPending = useRef(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add("ensina-app-viewport-lock");
    body.classList.add("ensina-app-viewport-lock");

    return () => {
      root.classList.remove("ensina-app-viewport-lock");
      body.classList.remove("ensina-app-viewport-lock");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 1023px)").matches) return;
    const main = document.querySelector<HTMLElement>(".app-main-scroll");
    main?.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ensina-me-theme");
    const shouldUseDark = savedTheme === "dark";
    document.documentElement.classList.toggle("dark", shouldUseDark);
    setIsDarkMode(shouldUseDark);
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDarkMode;
    document.documentElement.classList.toggle("dark", nextIsDark);
    window.localStorage.setItem("ensina-me-theme", nextIsDark ? "dark" : "light");
    setIsDarkMode(nextIsDark);
  }

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
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
        .select("onboarding_completed,display_name,avatar_url")
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

      setProfileName(profile?.display_name?.trim() || "Meu perfil");
      setProfileAvatar(profile?.avatar_url ?? null);
      setAuthChecking(false);
    };

    void checkAccess();
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    let active = true;

    const syncProfile = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("display_name,avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      setProfileName(profile?.display_name?.trim() || "Meu perfil");
      setProfileAvatar(profile?.avatar_url ?? null);
    };

    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ displayName?: string; avatarUrl?: string | null }>).detail;
      if (detail?.displayName !== undefined) setProfileName(detail.displayName.trim() || "Meu perfil");
      if (detail?.avatarUrl !== undefined) setProfileAvatar(detail.avatarUrl);
      void syncProfile();
    };

    void syncProfile();
    window.addEventListener("ensina-me-profile-updated", onProfileUpdated);
    return () => {
      active = false;
      window.removeEventListener("ensina-me-profile-updated", onProfileUpdated);
    };
  }, [location.pathname]);

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

  const mobileContext = (() => {
    const pathname = location.pathname;
    if (pathname === "/app/dashboard" || pathname === "/app/") return { title: "Início", back: false };
    if (pathname === "/app/estude-agora") return { title: "Estudar agora", back: false };
    if (pathname === "/app/tutor") return { title: "Tutor", back: false };
    if (pathname === "/app/comunidade") return { title: "Comunidade", back: false };
    if (pathname === "/app/direct") return { title: "Direct", back: false };
    if (pathname === "/app/disciplinas" || pathname === "/app/disciplinas/") return { title: "Meus cursos", back: false };
    if (pathname === "/app/prova") return { title: "Modo Prova", back: false };
    if (pathname === "/app/revisao") return { title: "Revisão", back: false };
    if (pathname === "/app/desempenho") return { title: "Desempenho", back: false };
    if (pathname === "/app/perfil") return { title: "Meu perfil", back: true };
    if (pathname.includes("/app/disciplinas/")) return { title: "Tópico", back: true };
    if (pathname.includes("/app/estudo/")) return { title: "Estudo", back: true };
    if (pathname.includes("/app/questoes/")) return { title: "Questão", back: true };
    return { title: "Ensina-me", back: true };
  })();

  if (authError) {
    return (
      <div className="app-stage flex min-h-[100dvh] items-center justify-center px-6">
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
      </div>
    );
  }

  const mobileNav = [
    navigation[0]!,
    navigation[2]!,
    navigation[5]!,
    navigation[6]!,
  ];

  return (
    <div className="app-shell min-h-[100dvh] bg-white text-foreground">
      <aside className="app-desktop-sidebar fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r lg:flex">
        <div className="flex h-[82px] items-center px-7">
          <Link to="/app/dashboard" aria-label="Ensina-me, início">
            <BrandLogo tone="blue" />
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
              <span className="app-avatar overflow-hidden">
                {profileAvatar ? <img src={profileAvatar} alt="" className="h-full w-full object-cover" decoding="async" loading="eager" /> : "EM"}
              </span>
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

      <header className="app-mobile-header fixed inset-x-0 top-0 z-50 lg:hidden">
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
              <BrandLogo compact tone="blue" />
            </Link>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold tracking-[-0.02em] text-[#172334] dark:text-[#E7EDF5]">{mobileContext.title}</p>
            {mobileContext.back && <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A96A5] dark:text-[#8797AA]">Ensina-me</p>}
          </div>
        </div>
        <button
          type="button"
          className="app-icon-button ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE5F0] bg-white text-[#172334] shadow-sm dark:border-[#2B3A4F] dark:bg-[#111B2A] dark:text-[#E7EDF5]"
          aria-label={mobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
          aria-expanded={mobileMenuOpen}
          aria-controls="app-mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <Icon name={mobileMenuOpen ? "close" : "more"} className="h-5 w-5" />
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-[#0B1728]/45 backdrop-blur-[2px]"
            aria-label="Fechar menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            id="app-mobile-navigation"
            aria-label="Menu principal do Ensina-me"
            className="absolute inset-y-0 right-0 flex w-[min(86vw,360px)] flex-col overflow-y-auto bg-white px-4 pb-6 pt-5 shadow-2xl dark:bg-[#111B2A]"
          >
            <div className="mb-5 flex items-center justify-between border-b border-[#E6EBF2] pb-4 dark:border-[#2B3A4F]">
              <Link to="/app/dashboard" className="min-w-0" aria-label="Ensina-me, início">
                <BrandLogo tone="blue" />
              </Link>
              <button
                type="button"
                className="app-icon-button flex h-10 w-10 items-center justify-center rounded-xl"
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 rounded-2xl bg-[#F2F6FC] p-3 dark:bg-[#172437]">
              <div className="flex items-center gap-3">
                <span className="app-avatar overflow-hidden">
                  {profileAvatar ? <img src={profileAvatar} alt="" className="h-full w-full object-cover" decoding="async" /> : "EM"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#172334] dark:text-[#E7EDF5]">{profileName}</p>
                  <p className="text-xs text-[#7A8796] dark:text-[#9EADBD]">Seu espaço de aprendizagem</p>
                </div>
              </div>
            </div>
            <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8A96A5]">Navegação</p>
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/app/dashboard" }}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
                    location.pathname === item.to || (item.to !== "/app/dashboard" && location.pathname.startsWith(item.to + "/"))
                      ? "bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1A2D49] dark:text-[#8DB8FF]"
                      : "text-[#405064] hover:bg-[#F5F7FA] dark:text-[#D1DCE8] dark:hover:bg-[#1A2739]"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.05]">
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <Icon name="chevron" className="h-4 w-4 opacity-45" />
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-[#E6EBF2] pt-3 dark:border-[#2B3A4F]">
              <Link to="/app/perfil" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#405064] dark:text-[#D1DCE8]">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1A2D49] dark:text-[#8DB8FF]"><Icon name="user" className="h-[18px] w-[18px]" /></span>
                Meu perfil e configurações
              </Link>
              <button type="button" onClick={toggleTheme} className="mt-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#405064] dark:text-[#D1DCE8]" aria-label={isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1A2D49] dark:text-[#8DB8FF]"><Icon name={isDarkMode ? "sun" : "moon"} className="h-[18px] w-[18px]" /></span>
                {isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}
              </button>
              <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="mt-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#B42318] disabled:opacity-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF0EF]"><Icon name="logout" className="h-[18px] w-[18px]" /></span>
                {isLoggingOut ? "Saindo..." : "Sair da conta"}
              </button>
            </div>
          </nav>
        </div>
      )}

      <header className="app-desktop-header fixed inset-x-0 top-0 z-30 hidden lg:block lg:ml-[252px]">
        <div className="mx-auto flex h-[58px] max-w-[1280px] items-center justify-between px-8">
          <div>
            <p className="mt-1 text-lg font-extrabold text-[#243245] dark:text-[#E7EDF5]">Aprenda hoje. Conquiste amanhã.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme} className="app-top-action inline-flex h-10 items-center gap-2 px-3" aria-label={isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"} title={isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}>
              <Icon name={isDarkMode ? "sun" : "moon"} className="h-4 w-4" />
              <span>{isDarkMode ? "Modo claro" : "Modo escuro"}</span>
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

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#DCE5F0] bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-2 shadow-[0_-8px_24px_rgba(23,35,52,.06)] backdrop-blur lg:hidden dark:border-[#2B3A4F] dark:bg-[#111B2A]/95" aria-label="Atalhos principais">
        {[navigation[0]!, navigation[2]!, navigation[5]!, navigation[6]!, navigation[7]!].map((item) => {
          const active = location.pathname === item.to || (item.to !== "/app/dashboard" && location.pathname.startsWith(item.to + "/"));
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/app/dashboard" }}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-extrabold ${
                active ? "text-[#0242D7] dark:text-[#8DB8FF]" : "text-[#7A8796] dark:text-[#9EADBD]"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              <span>{item.label === "Meus cursos" ? "Disciplinas" : item.label === "Estudar agora" ? "Estudar" : item.label === "Praticar" ? "Provas" : item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className={"app-main-scroll lg:ml-[252px] pt-[60px] pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0 lg:pt-[58px] " + (location.pathname === "/app/direct" ? "h-[calc(100dvh-76px)] overflow-hidden pb-0 lg:h-[100dvh]" : "")}>
        <div className={"app-content mx-auto w-full max-w-[1280px] px-4 pb-8 pt-0 sm:px-6 sm:pt-0 lg:px-8 lg:pb-12 lg:pt-0 " + (location.pathname === "/app/direct" ? "h-full max-w-none px-0 pb-0" : "")}>
          <div key={location.pathname} className={"app-route-stage " + (location.pathname === "/app/direct" ? "h-full min-h-0" : "")}>
            <Outlet />
          </div>
        </div>
      </main>

    </div>
  );
}
