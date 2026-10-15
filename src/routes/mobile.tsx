import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mobile")({
  ssr: false,
  component: MobileApp,
});

type Tab = "inicio" | "cursos" | "estudar" | "perfil";
type Course = { id: string; name: string; description?: string | null };
type Profile = { display_name: string | null; avatar_url?: string | null };
type Recommendation = {
  topic_id: string | null;
  discipline_id?: string | null;
  topic_name?: string | null;
  discipline_name?: string | null;
  reason?: "assessment" | "review" | "continue" | "start" | "none";
  message?: string | null;
};
type Discipline = { id: string; name: string; description: string | null };

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "inicio", label: "Início", icon: "⌂" },
  { id: "cursos", label: "Cursos", icon: "▤" },
  { id: "estudar", label: "Estudar", icon: "✦" },
  { id: "perfil", label: "Perfil", icon: "○" },
];

function MobileApp() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("inicio");
  const [authenticated, setAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [disciplinesLoading, setDisciplinesLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session || sessionError) {
        setLoading(false);
        return;
      }
      if (!active) return;
      setEmail(session.user.email ?? "");
      const [profileResult, membershipsResult, recommendationResult, todayResult] = await Promise.all([
        supabase.from("student_profiles").select("display_name,avatar_url,onboarding_completed").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("student_courses").select("course_id").order("created_at", { ascending: true }),
        supabase.rpc("get_student_study_recommendation"),
        supabase.rpc("get_student_today_study"),
      ]);
      if (!active) return;
      if (!profileResult.data?.onboarding_completed) {
        window.localStorage.setItem("ensina-me-entry-mode", "mobile");
        await navigate({ to: "/onboarding", replace: true });
        return;
      }
      if (profileResult.data) setProfile(profileResult.data as Profile);
      if (membershipsResult.error) {
        setError("Não foi possível carregar seus cursos. Tente novamente.");
      } else {
        const ids = [...new Set((membershipsResult.data ?? []).map((row) => row.course_id).filter(Boolean))];
        if (ids.length) {
          const courseResult = await supabase.from("courses").select("id,name").in("id", ids).eq("published", true).order("name");
          if (!active) return;
          if (!courseResult.error) setCourses((courseResult.data ?? []) as Course[]);
        }
      }
      if (!recommendationResult.error) setRecommendation((recommendationResult.data ?? null) as Recommendation | null);
      if (!todayResult.error && todayResult.data) {
        const value = todayResult.data as unknown as { minutes?: number };
        setTodayMinutes(Number(value.minutes ?? 0));
      }
      setAuthenticated(true);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (!selectedCourse) {
      setDisciplines([]);
      return;
    }
    let active = true;
    setDisciplinesLoading(true);
    void supabase.from("disciplines").select("id,name,description").eq("course_id", selectedCourse.id).eq("published", true).order("name")
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (!queryError) setDisciplines((data ?? []) as Discipline[]);
        setDisciplinesLoading(false);
      });
    return () => { active = false; };
  }, [selectedCourse]);

  const filteredCourses = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return normalized ? courses.filter((course) => course.name.toLocaleLowerCase("pt-BR").includes(normalized)) : courses;
  }, [courses, search]);

  async function signInMobile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");
    setAuthBusy(true);
    const normalizedEmail = authEmail.trim().toLowerCase();
    if (!normalizedEmail || !authPassword) {
      setAuthMessage("Informe seu e-mail e sua senha.");
      setAuthBusy(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: authPassword,
    });
    if (signInError) {
      setAuthMessage("Não foi possível entrar. Confira seu e-mail e sua senha e tente novamente.");
      setAuthBusy(false);
      return;
    }
    window.location.replace("/mobile");
  }

  async function signOut() {
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("Não foi possível sair da conta. Tente novamente.");
      setSigningOut(false);
      return;
    }
    await navigate({ to: "/login", replace: true });
  }

  const greetingName = profile?.display_name?.trim().split(/\s+/)[0] || "por aqui";
  const fullName = profile?.display_name?.trim();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const recommendationReason = recommendation?.reason === "review"
    ? "Uma revisão está pronta"
    : recommendation?.reason === "assessment"
      ? "Prepare-se para uma avaliação"
      : recommendation?.reason === "continue"
        ? "Continue de onde parou"
        : recommendation?.reason === "start"
          ? "Comece um novo tópico"
          : "Seu próximo passo";

  return (
    <div className="em-mobile min-h-[100dvh] bg-[#F5F8FE] text-[#15243A]">
      <header className="sticky top-0 z-20 border-b border-[#E5ECF6] bg-white/95 px-5 pb-3 pt-[max(env(safe-area-inset-top),14px)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between">
          <a href="/mobile" className="flex items-center gap-2.5" aria-label="Ensina-me início">
            <img src="/ensina-me-icon.svg" alt="" className="h-9 w-9 rounded-xl" />
            <span className="text-[17px] font-extrabold tracking-[-0.04em]">Ensina-me</span>
          </a>
          <span className="rounded-full bg-[#EEF4FF] px-3 py-1.5 text-[11px] font-bold text-[#0242D7]">MOBILE</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-5 pb-28 pt-6">
        {error && <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div aria-label="Carregando Ensina-me" className="space-y-4">
            <div className="h-28 animate-pulse rounded-3xl bg-[#E7EDF7]" />
            <div className="h-40 animate-pulse rounded-3xl bg-[#E7EDF7]" />
            <div className="h-24 animate-pulse rounded-3xl bg-[#E7EDF7]" />
          </div>
        ) : !authenticated ? (
          <section className="pt-5">
            <div className="mb-6">
              <p className="text-sm font-bold text-[#0242D7]">Acesse sua conta</p>
              <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-.055em]">Entre para continuar aprendendo.</h1>
              <p className="mt-3 text-sm leading-6 text-[#68778C]">Acesse seus cursos, pratique e acompanhe seu progresso pelo celular.</p>
            </div>
            <form onSubmit={(event) => void signInMobile(event)} className="space-y-4 rounded-[24px] border border-[#E3EAF4] bg-white p-5">
              <div>
                <label htmlFor="mobile-email" className="text-sm font-bold">E-mail</label>
                <input id="mobile-email" type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#DCE5F0] bg-white px-3.5 text-base outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" placeholder="voce@exemplo.com" />
              </div>
              <div>
                <label htmlFor="mobile-password" className="text-sm font-bold">Senha</label>
                <input id="mobile-password" type="password" autoComplete="current-password" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#DCE5F0] bg-white px-3.5 text-base outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" placeholder="Sua senha" />
              </div>
              {authMessage && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{authMessage}</p>}
              <button type="submit" disabled={authBusy} className="min-h-12 w-full rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white disabled:opacity-60">{authBusy ? "Entrando…" : "Entrar no Ensina-me"}</button>
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <a href="/recuperar-senha" className="text-[#0242D7]">Esqueci minha senha</a>
                <a href="/cadastro" onClick={() => window.localStorage.setItem("ensina-me-entry-mode", "mobile")} className="text-[#53657D]">Criar conta</a>
              </div>
            </form>
          </section>
        ) : (
          <>
            {tab === "inicio" && (
              <section className="space-y-5">
                <div className="pt-1">
                  <p className="text-sm font-semibold text-[#65758B]">Sua jornada de aprendizagem</p>
                  <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-[-0.055em]">{fullName ? `${greeting}, ${fullName}.` : `${greeting}!`}</h1>
                  <p className="mt-2 text-[14px] leading-6 text-[#66758A]">Um passo de cada vez. Vamos avançar no seu aprendizado?</p>
                </div>

                <section className="overflow-hidden rounded-[26px] bg-[#0242D7] p-5 text-white shadow-[0_14px_32px_rgba(2,66,215,.18)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="max-w-[230px]">
                      <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-100">Seu próximo passo</p>
                      <h2 className="mt-2 text-[22px] font-extrabold leading-tight tracking-[-.035em]">{recommendation?.topic_name || "Seu aprendizado começa aqui"}</h2>
                      <p className="mt-2 text-sm leading-5 text-blue-100">{recommendation?.discipline_name || "Escolha um curso para encontrar seu próximo tópico."}</p>
                    </div>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl" aria-hidden="true">✦</span>
                  </div>
                  <button type="button" onClick={() => setTab(recommendation?.topic_id ? "estudar" : "cursos")} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[#0242D7] active:scale-[.99]">
                    {recommendation?.topic_id ? "Ver plano de estudo" : "Explorar meus cursos"} <span aria-hidden="true">→</span>
                  </button>
                </section>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#E3EAF4] bg-white p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7]" aria-hidden="true">◷</span>
                    <p className="mt-3 text-2xl font-extrabold tracking-tight">{todayMinutes}<span className="ml-1 text-sm font-bold">min</span></p>
                    <p className="mt-1 text-xs font-semibold text-[#728096]">Estudo de hoje</p>
                  </div>
                  <div className="rounded-2xl border border-[#E3EAF4] bg-white p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF9F2] text-[#17804A]" aria-hidden="true">▤</span>
                    <p className="mt-3 text-2xl font-extrabold tracking-tight">{courses.length}</p>
                    <p className="mt-1 text-xs font-semibold text-[#728096]">Cursos disponíveis</p>
                  </div>
                </div>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-extrabold">Acesso rápido</h2>
                    <span className="text-xs font-semibold text-[#8794A7]">Sua rotina</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setTab("cursos")} className="rounded-2xl border border-[#E3EAF4] bg-white p-4 text-left active:scale-[.99]">
                      <span className="text-xl text-[#0242D7]" aria-hidden="true">▤</span>
                      <span className="mt-3 block text-sm font-extrabold">Meus cursos</span>
                      <span className="mt-1 block text-xs leading-5 text-[#728096]">Encontre uma disciplina</span>
                    </button>
                    <button type="button" onClick={() => setTab("estudar")} className="rounded-2xl border border-[#E3EAF4] bg-white p-4 text-left active:scale-[.99]">
                      <span className="text-xl text-[#0242D7]" aria-hidden="true">✦</span>
                      <span className="mt-3 block text-sm font-extrabold">Estudar agora</span>
                      <span className="mt-1 block text-xs leading-5 text-[#728096]">Veja sua recomendação</span>
                    </button>
                  </div>
                </section>
              </section>
            )}

            {tab === "cursos" && (
              <section>
                <p className="text-sm font-bold text-[#0242D7]">Sua biblioteca</p>
                <h1 className="mt-1 text-[29px] font-extrabold tracking-[-.05em]">Meus cursos</h1>
                <p className="mt-2 text-sm leading-6 text-[#68778C]">Seu percurso acadêmico, organizado em um só lugar.</p>
                <label className="mt-5 flex min-h-12 items-center gap-3 rounded-2xl border border-[#DFE7F2] bg-white px-4">
                  <span className="text-lg text-[#7B8BA1]" aria-hidden="true">⌕</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Buscar curso" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#93A0B2]" />
                </label>
                {selectedCourse ? (
                  <div className="mt-5">
                    <button type="button" onClick={() => setSelectedCourse(null)} className="mb-4 text-sm font-bold text-[#0242D7]">← Todos os cursos</button>
                    <h2 className="text-xl font-extrabold">{selectedCourse.name}</h2>
                    {selectedCourse.description && <p className="mt-2 text-sm leading-6 text-[#68778C]">{selectedCourse.description}</p>}
                    {disciplinesLoading ? <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[#E7EDF7]" /> : disciplines.length ? (
                      <div className="mt-4 space-y-2">
                        {disciplines.map((discipline) => <div key={discipline.id} className="rounded-2xl border border-[#E3EAF4] bg-white p-4"><p className="font-bold">{discipline.name}</p>{discipline.description && <p className="mt-1 text-xs leading-5 text-[#728096]">{discipline.description}</p>}</div>)}
                      </div>
                    ) : <p className="mt-4 rounded-2xl border border-[#E3EAF4] bg-white p-4 text-sm text-[#68778C]">Ainda não há disciplinas publicadas neste curso.</p>}
                  </div>
                ) : filteredCourses.length ? (
                  <div className="mt-5 space-y-3">
                    {filteredCourses.map((course) => <button key={course.id} type="button" onClick={() => setSelectedCourse(course)} className="flex min-h-[94px] w-full items-center gap-4 rounded-2xl border border-[#E3EAF4] bg-white p-4 text-left active:scale-[.99]"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-xl text-[#0242D7]" aria-hidden="true">▤</span><span className="min-w-0 flex-1"><span className="block font-extrabold">{course.name}</span><span className="mt-1 block text-xs leading-5 text-[#728096]">{course.description || "Toque para ver as disciplinas disponíveis."}</span></span><span className="text-lg text-[#0242D7]" aria-hidden="true">›</span></button>)}
                  </div>
                ) : <div className="mt-5 rounded-2xl border border-dashed border-[#CDD9EA] bg-white p-6 text-center"><p className="font-bold">Nenhum curso encontrado</p><p className="mt-2 text-sm text-[#728096]">Tente outra busca ou confira seu acesso aos cursos.</p></div>}
              </section>
            )}

            {tab === "estudar" && (
              <section>
                <p className="text-sm font-bold text-[#0242D7]">{recommendationReason}</p>
                <h1 className="mt-1 text-[29px] font-extrabold tracking-[-.05em]">Estudar agora</h1>
                <p className="mt-2 text-sm leading-6 text-[#68778C]">Uma sugestão baseada no seu percurso de aprendizagem.</p>
                {recommendation?.topic_id ? (
                  <div className="mt-5 rounded-[24px] border border-[#DCE6F5] bg-white p-5">
                    <span className="inline-flex rounded-full bg-[#EEF4FF] px-3 py-1.5 text-xs font-bold text-[#0242D7]">{recommendationReason}</span>
                    <h2 className="mt-4 text-xl font-extrabold leading-snug">{recommendation.topic_name || "Tópico recomendado"}</h2>
                    <p className="mt-2 text-sm text-[#68778C]">{recommendation.discipline_name || "Sua disciplina"}</p>
                    {recommendation.message && <p className="mt-4 rounded-xl bg-[#F5F8FE] p-3 text-sm leading-6 text-[#53657D]">{recommendation.message}</p>}
                    <p className="mt-4 text-sm leading-6 text-[#68778C]">A recomendação foi carregada do seu percurso. A próxima etapa é trazer o estudo do tópico para esta interface mobile, sem abrir o layout desktop.</p>
                    <button type="button" onClick={() => setTab("cursos")} className="mt-4 min-h-12 w-full rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white">Ver meus cursos</button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] border border-[#E3EAF4] bg-white p-5"><h2 className="font-extrabold">Vamos preparar seu percurso</h2><p className="mt-2 text-sm leading-6 text-[#68778C]">Assim que houver uma recomendação disponível, ela aparecerá aqui. Você também pode explorar seus cursos.</p><button type="button" onClick={() => setTab("cursos")} className="mt-4 min-h-12 w-full rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white">Explorar cursos</button></div>
                )}
              </section>
            )}

            {tab === "perfil" && (
              <section>
                <p className="text-sm font-bold text-[#0242D7]">Sua conta</p>
                <h1 className="mt-1 text-[29px] font-extrabold tracking-[-.05em]">Perfil</h1>
                <div className="mt-5 rounded-[24px] border border-[#E3EAF4] bg-white p-5">
                  <div className="flex items-center gap-4">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF] text-xl font-extrabold text-[#0242D7]">{greetingName.slice(0,1).toUpperCase()}</span>}
                    <div className="min-w-0"><p className="truncate font-extrabold">{profile?.display_name || "Seu perfil"}</p><p className="mt-1 break-all text-xs text-[#728096]">{email}</p></div>
                  </div>
                  <div className="mt-5 border-t border-[#E8EDF5] pt-4"><p className="text-sm font-bold">Seu percurso</p><p className="mt-1 text-sm text-[#728096]">{courses.length} cursos disponíveis na sua conta.</p></div>
                  <button type="button" disabled={signingOut} onClick={() => void signOut()} className="mt-5 min-h-12 w-full rounded-xl border border-[#F0D8D8] bg-[#FFF7F7] px-4 text-sm font-extrabold text-[#B42318] disabled:opacity-60">{signingOut ? "Saindo da conta…" : "Sair da conta"}</button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {authenticated && !loading && <nav aria-label="Navegação mobile" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E1E9F4] bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {tabs.map((item) => {
            const active = tab === item.id;
            return <button key={item.id} type="button" onClick={() => { setTab(item.id); if (item.id !== "cursos") setSelectedCourse(null); }} aria-current={active ? "page" : undefined} className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-extrabold transition-colors ${active ? "bg-[#EEF4FF] text-[#0242D7]" : "text-[#8390A3] active:bg-[#F5F8FE]"}`}><span className="text-[21px] leading-none" aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>;
          })}
        </div>
      </nav>}
    </div>
  );
}
