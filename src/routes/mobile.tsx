import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileStudyTools } from "@/components/mobile/MobileStudyTools";

export const Route = createFileRoute("/mobile")({
  ssr: false,
  component: MobileApp,
});

type Tab = "inicio" | "cursos" | "estudar" | "comunidade" | "perfil";
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
type Topic = { id: string; name: string; description: string | null; position: number };
type LessonSection = { id: string; title: string; content: string; position: number; section_type: string | null };
type PracticeQuestion = { id: string; question_text: string; question_type: string; position: number; feedback_hint: string | null; options: { id: string; content: string; is_correct: boolean; feedback_correct: string | null; feedback_incorrect: string | null }[] };
type TopicVideo = { id: string; title: string; description: string | null; video_url: string; embed_url: string | null; platform: string | null; channel_name: string | null; duration_label: string | null };
type CommunityPost = { id: string; body: string; created_at: string; author_id: string; author_display_name: string | null; author_avatar_url: string | null; author_is_verified: boolean | null; is_official: boolean | null; official_until: string | null; image_url: string | null };

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "inicio", label: "Início", icon: "⌂" },
  { id: "cursos", label: "Cursos", icon: "▤" },
  { id: "estudar", label: "Estudar", icon: "✦" },
  { id: "comunidade", label: "Comunidade", icon: "💬" },
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
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [authName, setAuthName] = useState("");
  const [authPasswordConfirmation, setAuthPasswordConfirmation] = useState("");
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
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [studyTopic, setStudyTopic] = useState<Topic | null>(null);
  const [lessonSections, setLessonSections] = useState<LessonSection[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [topicVideos, setTopicVideos] = useState<TopicVideo[]>([]);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityMessage, setCommunityMessage] = useState("");
  const [communityPosting, setCommunityPosting] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
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

  useEffect(() => {
    if (!selectedDiscipline) {
      setTopics([]);
      return;
    }
    let active = true;
    setTopicsLoading(true);
    void supabase.from("topics").select("id,name,description,position").eq("discipline_id", selectedDiscipline.id).eq("published", true).order("position").order("name")
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (!queryError) setTopics((data ?? []) as Topic[]);
        setTopicsLoading(false);
      });
    return () => { active = false; };
  }, [selectedDiscipline]);

  useEffect(() => {
    if (!studyTopic) {
      setLessonSections([]);
      setPracticeQuestions([]);
      setTopicVideos([]);
      return;
    }
    let active = true;
    setLessonLoading(true);
    setSelectedAnswers({});
    void (async () => {
      const [materialResult, exerciseResult, videoResult] = await Promise.all([
        supabase.from("materials").select("id").eq("topic_id", studyTopic.id).eq("status", "published").limit(1).maybeSingle(),
        supabase.from("exercises").select("id").eq("topic_id", studyTopic.id).eq("published", true).order("position"),
        supabase.from("topic_videos").select("id,title,description,video_url,embed_url,platform,channel_name,duration_label").eq("topic_id", studyTopic.id).eq("published", true).order("position"),
      ]);
      if (!active) return;
      let sections: LessonSection[] = [];
      if (materialResult.data?.id) {
        const sectionResult = await supabase.from("material_sections").select("id,title,content,position,section_type").eq("material_id", materialResult.data.id).order("position");
        if (!active) return;
        if (!sectionResult.error) sections = (sectionResult.data ?? []) as LessonSection[];
      }
      let questions: PracticeQuestion[] = [];
      const exerciseIds = (exerciseResult.data ?? []).map((exercise) => exercise.id);
      if (exerciseIds.length) {
        const questionResult = await supabase.from("exercise_questions").select("id,exercise_id,question_text,question_type,position,feedback_hint").in("exercise_id", exerciseIds).order("position");
        if (!active) return;
        if (!questionResult.error && questionResult.data?.length) {
          const optionResult = await supabase.from("exercise_options").select("id,question_id,content,is_correct,feedback_correct,feedback_incorrect,position").in("question_id", questionResult.data.map((question) => question.id)).order("position");
          if (!active) return;
          const optionsByQuestion = new Map<string, PracticeQuestion["options"]>();
          for (const option of optionResult.data ?? []) {
            const list = optionsByQuestion.get(option.question_id) ?? [];
            list.push(option);
            optionsByQuestion.set(option.question_id, list);
          }
          questions = questionResult.data.map((question) => ({
            id: question.id,
            question_text: question.question_text,
            question_type: question.question_type,
            position: question.position,
            feedback_hint: question.feedback_hint,
            options: optionsByQuestion.get(question.id) ?? [],
          })) as PracticeQuestion[];
        }
      }
      setLessonSections(sections);
      setPracticeQuestions(questions);
      setTopicVideos((videoResult.data ?? []) as TopicVideo[]);
      setLessonLoading(false);
    })();
    return () => { active = false; };
  }, [studyTopic]);

  useEffect(() => {
    if (tab !== "comunidade" || !authenticated) return;
    let active = true;
    setCommunityLoading(true);
    void supabase.from("community_posts").select("id,body,created_at,author_id,author_display_name,author_avatar_url,author_is_verified,is_official,official_until,image_url").order("is_official", { ascending: false }).order("created_at", { ascending: false }).limit(50)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError("Não foi possível carregar a comunidade agora.");
        else setCommunityPosts((data ?? []) as CommunityPost[]);
        setCommunityLoading(false);
      });
    return () => { active = false; };
  }, [tab, authenticated]);

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

  async function signUpMobile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");
    const normalizedName = authName.trim();
    const normalizedEmail = authEmail.trim().toLowerCase();
    if (!normalizedName || !normalizedEmail || authPassword.length < 8 || authPassword !== authPasswordConfirmation) {
      setAuthMessage("Confira seu nome, e-mail e senha. A senha deve ter ao menos 8 caracteres e as confirmações precisam ser iguais.");
      return;
    }
    setAuthBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: authPassword,
      options: { data: { full_name: normalizedName } },
    });
    if (signUpError) {
      setAuthMessage(signUpError.message.toLowerCase().includes("already") ? "Já existe uma conta com este e-mail. Tente entrar." : "Não foi possível criar a conta. Confira os dados e tente novamente.");
      setAuthBusy(false);
      return;
    }
    if (data.session) {
      window.location.replace("/mobile");
      return;
    }
    setAuthMode("login");
    setAuthMessage("Conta criada. Confirme seu e-mail pelo link enviado pelo Ensina-me e depois entre.");
    setAuthBusy(false);
  }

  async function resetPasswordMobile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");
    const normalizedEmail = authEmail.trim().toLowerCase();
    if (!normalizedEmail) { setAuthMessage("Informe seu e-mail."); return; }
    setAuthBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: `${window.location.origin}/redefinir-senha` });
    setAuthMessage(resetError ? "Não foi possível enviar o link agora. Tente novamente." : "Se houver uma conta com esse e-mail, enviaremos as instruções de recuperação. Confira também o spam.");
    setAuthBusy(false);
  }

  async function publishCommunityPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = communityMessage.trim();
    if (!body || communityPosting) return;
    setCommunityPosting(true);
    setError("");
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult.user) {
      setError("Sua sessão expirou. Entre novamente para publicar.");
      setCommunityPosting(false);
      return;
    }
    const { error: insertError } = await supabase.from("community_posts").insert({ author_id: userResult.user.id, body });
    if (insertError) {
      setError("Não foi possível publicar. Confira sua conexão e tente novamente.");
      setCommunityPosting(false);
      return;
    }
    setCommunityMessage("");
    const { data } = await supabase.from("community_posts").select("id,body,created_at,author_id,author_display_name,author_avatar_url,author_is_verified,is_official,official_until,image_url").order("is_official", { ascending: false }).order("created_at", { ascending: false }).limit(50);
    setCommunityPosts((data ?? []) as CommunityPost[]);
    setCommunityPosting(false);
  }

  async function signOut() {
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("Não foi possível sair da conta. Tente novamente.");
      setSigningOut(false);
      return;
    }
    window.localStorage.setItem("ensina-me-entry-mode", "mobile");
    await navigate({ to: "/mobile", replace: true });
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
            {authMessage && <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-[#DCE6F5] bg-white p-3 text-sm leading-6 text-[#42536A]">{authMessage}</p>}
            {authMode === "login" ? (
              <form onSubmit={(event) => void signInMobile(event)} className="space-y-4 rounded-[24px] border border-[#E3EAF4] bg-white p-5">
                <div><label htmlFor="mobile-email" className="text-sm font-bold">E-mail</label><input id="mobile-email" type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#DCE5F0] bg-white px-3.5 text-base outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" placeholder="voce@exemplo.com" /></div>
                <div><label htmlFor="mobile-password" className="text-sm font-bold">Senha</label><input id="mobile-password" type="password" autoComplete="current-password" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#DCE5F0] bg-white px-3.5 text-base outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" placeholder="Sua senha" /></div>
                <button type="submit" disabled={authBusy} className="min-h-12 w-full rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white disabled:opacity-60">{authBusy ? "Entrando…" : "Entrar no Ensina-me"}</button>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold"><button type="button" onClick={() => { setAuthMode("forgot"); setAuthMessage(""); }} className="text-[#0242D7]">Esqueci minha senha</button><button type="button" onClick={() => { setAuthMode("signup"); setAuthMessage(""); }} className="text-[#53657D]">Criar conta</button></div>
              </form>
            ) : authMode === "signup" ? (
              <form onSubmit={(event) => void signUpMobile(event)} className="space-y-4 rounded-[24px] border border-[#E3EAF4] bg-white p-5">
                <div><label htmlFor="mobile-name" className="text-sm font-bold">Nome completo</label><input id="mobile-name" autoComplete="name" required value={authName} onChange={(event) => setAuthName(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#DCE5F0] bg-white px-3.5 text-base outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" placeholder="Seu nome" /></div>
                <div><label htmlFor="mobile-signup-email" className="text-sm font-bold">E-mail</label><input id="mobile-signup-email" type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#DCE5F0] bg-white px-3.5 text-base outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" placeholder="voce@exemplo.com" /></div>
                <div><label htmlFor="mobile-signup-password" className="text-sm font-bold">Senha (mínimo 8 caracteres)</label><input id="mobile-signup-password" type="password" autoComplete="new-password" minLength={8} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#DCE5F0] bg-white px-3.5 text-base outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" placeholder="Crie uma senha" /></div>
                <div><label htmlFor="mobile-signup-confirm" className="text-sm font-bold">Confirmar senha</label><input id="mobile-signup-confirm" type="password" autoComplete="new-password" minLength={8} required value={authPasswordConfirmation} onChange={(event) => setAuthPasswordConfirmation(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#DCE5F0] bg-white px-3.5 text-base outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" placeholder="Repita sua senha" /></div>
                <button type="submit" disabled={authBusy} className="min-h-12 w-full rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white disabled:opacity-60">{authBusy ? "Criando conta…" : "Criar minha conta"}</button>
                <button type="button" onClick={() => { setAuthMode("login"); setAuthMessage(""); }} className="w-full py-2 text-sm font-bold text-[#0242D7]">Já tenho conta</button>
              </form>
            ) : (
              <form onSubmit={(event) => void resetPasswordMobile(event)} className="space-y-4 rounded-[24px] border border-[#E3EAF4] bg-white p-5">
                <h2 className="font-extrabold">Recuperar senha</h2>
                <div><label htmlFor="mobile-reset-email" className="text-sm font-bold">E-mail</label><input id="mobile-reset-email" type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#DCE5F0] bg-white px-3.5 text-base outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" placeholder="voce@exemplo.com" /></div>
                <button type="submit" disabled={authBusy} className="min-h-12 w-full rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white disabled:opacity-60">{authBusy ? "Enviando…" : "Enviar link de recuperação"}</button>
                <button type="button" onClick={() => { setAuthMode("login"); setAuthMessage(""); }} className="w-full py-2 text-sm font-bold text-[#0242D7]">Voltar ao login</button>
              </form>
            )}
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
                    {selectedDiscipline ? (
                      <>
                        <button type="button" onClick={() => { setSelectedDiscipline(null); setStudyTopic(null); }} className="mb-4 text-sm font-bold text-[#0242D7]">← Todas as disciplinas</button>
                        <h2 className="text-xl font-extrabold">{selectedDiscipline.name}</h2>
                        {selectedDiscipline.description && <p className="mt-2 text-sm leading-6 text-[#68778C]">{selectedDiscipline.description}</p>}
                        {topicsLoading ? <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[#E7EDF7]" /> : topics.length ? (
                          <div className="mt-4 space-y-2">
                            {topics.map((topic) => <button key={topic.id} type="button" onClick={() => { setStudyTopic(topic); setTab("estudar"); }} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#E3EAF4] bg-white p-4 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] font-bold text-[#0242D7]">{topic.position || "•"}</span><span className="min-w-0 flex-1"><span className="block font-bold">{topic.name}</span>{topic.description && <span className="mt-1 block text-xs leading-5 text-[#728096]">{topic.description}</span>}</span><span className="text-[#0242D7]">›</span></button>)}
                          </div>
                        ) : <p className="mt-4 rounded-2xl border border-[#E3EAF4] bg-white p-4 text-sm text-[#68778C]">Ainda não há tópicos publicados nesta disciplina.</p>}
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setSelectedCourse(null)} className="mb-4 text-sm font-bold text-[#0242D7]">← Todos os cursos</button>
                        <h2 className="text-xl font-extrabold">{selectedCourse.name}</h2>
                        {selectedCourse.description && <p className="mt-2 text-sm leading-6 text-[#68778C]">{selectedCourse.description}</p>}
                        {disciplinesLoading ? <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[#E7EDF7]" /> : disciplines.length ? (
                          <div className="mt-4 space-y-2">
                            {disciplines.map((discipline) => <button key={discipline.id} type="button" onClick={() => setSelectedDiscipline(discipline)} className="flex w-full items-center gap-3 rounded-2xl border border-[#E3EAF4] bg-white p-4 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7]">▤</span><span className="min-w-0 flex-1"><span className="block font-bold">{discipline.name}</span>{discipline.description && <span className="mt-1 block text-xs leading-5 text-[#728096]">{discipline.description}</span>}</span><span className="text-[#0242D7]">›</span></button>)}
                          </div>
                        ) : <p className="mt-4 rounded-2xl border border-[#E3EAF4] bg-white p-4 text-sm text-[#68778C]">Ainda não há disciplinas publicadas neste curso.</p>}
                      </>
                    )}
                  </div>
                ) : filteredCourses.length ? (
                  <div className="mt-5 space-y-3">
                    {filteredCourses.map((course) => <button key={course.id} type="button" onClick={() => { setSelectedCourse(course); setSelectedDiscipline(null); setStudyTopic(null); }} className="flex min-h-[94px] w-full items-center gap-4 rounded-2xl border border-[#E3EAF4] bg-white p-4 text-left active:scale-[.99]"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-xl text-[#0242D7]" aria-hidden="true">▤</span><span className="min-w-0 flex-1"><span className="block font-extrabold">{course.name}</span><span className="mt-1 block text-xs leading-5 text-[#728096]">{course.description || "Toque para ver as disciplinas disponíveis."}</span></span><span className="text-lg text-[#0242D7]" aria-hidden="true">›</span></button>)}
                  </div>
                ) : <div className="mt-5 rounded-2xl border border-dashed border-[#CDD9EA] bg-white p-6 text-center"><p className="font-bold">Nenhum curso encontrado</p><p className="mt-2 text-sm text-[#728096]">Tente outra busca ou confira seu acesso aos cursos.</p></div>}
              </section>
            )}

            {tab === "estudar" && (
              <section>
                <p className="text-sm font-bold text-[#0242D7]">{recommendationReason}</p>
                <h1 className="mt-1 text-[29px] font-extrabold tracking-[-.05em]">Estudar agora</h1>
                <p className="mt-2 text-sm leading-6 text-[#68778C]">Uma sugestão baseada no seu percurso de aprendizagem.</p>
                <div className="mt-5">
                  <MobileStudyTools
                    topicId={studyTopic?.id ?? recommendation?.topic_id ?? null}
                    disciplineId={selectedDiscipline?.id ?? null}
                    availableTopics={topics}
                    onOpenTopic={(item) => {
                      setStudyTopic({ id: item.id, name: item.name, description: null, position: 0 });
                      setSelectedDiscipline((current) => current?.id === item.disciplineId ? current : { id: item.disciplineId, name: "Disciplina", description: null });
                    }}
                  />
                </div>
                {studyTopic ? (
                  <div className="mt-5 space-y-4">
                    <button type="button" onClick={() => { setStudyTopic(null); setTab("cursos"); }} className="text-sm font-bold text-[#0242D7]">← Voltar aos tópicos</button>
                    <div className="rounded-[24px] border border-[#DCE6F5] bg-white p-5">
                      <span className="inline-flex rounded-full bg-[#EEF4FF] px-3 py-1.5 text-xs font-bold text-[#0242D7]">Conteúdo de estudo</span>
                      <h2 className="mt-3 text-xl font-extrabold leading-snug">{studyTopic.name}</h2>
                      {studyTopic.description && <p className="mt-2 text-sm leading-6 text-[#68778C]">{studyTopic.description}</p>}
                    </div>
                    {lessonLoading ? <div className="space-y-3"><div className="h-28 animate-pulse rounded-2xl bg-[#E7EDF7]" /><div className="h-36 animate-pulse rounded-2xl bg-[#E7EDF7]" /></div> : lessonSections.length ? (
                      <div className="space-y-3">
                        {lessonSections.map((section, index) => <article key={section.id} className="rounded-2xl border border-[#E3EAF4] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#0242D7]">Parte {index + 1}</p><h3 className="mt-2 text-base font-extrabold">{section.title}</h3><div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#42536A]">{section.content}</div></article>)}
                      </div>
                    ) : !lessonLoading ? <div className="rounded-2xl border border-[#E3EAF4] bg-white p-5"><p className="font-bold">Conteúdo ainda indisponível</p><p className="mt-2 text-sm leading-6 text-[#68778C]">Este tópico ainda não tem material publicado para leitura.</p></div> : null}
                    {topicVideos.length > 0 && <section className="space-y-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#0242D7]">Aprenda também em vídeo</p><h2 className="mt-1 text-xl font-extrabold">Vídeos explicativos</h2><p className="mt-2 text-sm leading-6 text-[#68778C]">Materiais em vídeo selecionados para este tópico.</p></div>{topicVideos.map((video) => <article key={video.id} className="overflow-hidden rounded-2xl border border-[#E3EAF4] bg-white">{video.embed_url && /^https:\/\//i.test(video.embed_url) ? <div className="aspect-video bg-[#0F172A]"><iframe src={video.embed_url} title={video.title} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div> : null}<div className="p-4"><h3 className="font-extrabold">{video.title}</h3>{video.description && <p className="mt-2 text-sm leading-6 text-[#68778C]">{video.description}</p>}<div className="mt-2 flex flex-wrap gap-2 text-xs text-[#728096]">{video.channel_name && <span>{video.channel_name}</span>}{video.duration_label && <span>· {video.duration_label}</span>}</div><a href={video.video_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[#EEF4FF] px-3 text-sm font-bold text-[#0242D7]">Assistir agora ↗</a></div></article>)}</section>}
                    <section className="space-y-3">
                      <div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#0242D7]">Prática</p><h2 className="mt-1 text-xl font-extrabold">Confira sua compreensão</h2><p className="mt-2 text-sm leading-6 text-[#68778C]">Responda e receba o feedback disponível para cada alternativa.</p></div>
                      {!lessonLoading && practiceQuestions.length ? practiceQuestions.map((question, index) => {
                        const selected = selectedAnswers[question.id];
                        const chosen = question.options.find((option) => option.id === selected);
                        return <article key={question.id} className="rounded-2xl border border-[#E3EAF4] bg-white p-5"><p className="text-xs font-bold text-[#0242D7]">Questão {index + 1}</p><h3 className="mt-2 font-bold leading-6">{question.question_text}</h3>{question.options.length ? <div className="mt-4 space-y-2">{question.options.map((option) => { const isChosen = selected === option.id; const revealed = Boolean(selected); return <button key={option.id} type="button" disabled={revealed} onClick={() => setSelectedAnswers((previous) => ({ ...previous, [question.id]: option.id }))} className={`w-full rounded-xl border p-3 text-left text-sm leading-6 transition-colors ${revealed && option.is_correct ? "border-emerald-300 bg-emerald-50 text-emerald-900" : isChosen ? "border-red-300 bg-red-50 text-red-900" : "border-[#E3EAF4] bg-white text-[#42536A]"}`}><span className="mr-2 font-extrabold">{String.fromCharCode(65 + question.options.indexOf(option))}.</span>{option.content}</button>})}</div> : <p className="mt-3 text-sm text-[#68778C]">Esta questão não tem alternativas disponíveis neste formato.</p>}{chosen && <div className={`mt-3 rounded-xl p-3 text-sm leading-6 ${chosen.is_correct ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}><p className="font-extrabold">{chosen.is_correct ? "Resposta correta" : "Vamos revisar essa ideia"}</p><p className="mt-1">{(chosen.is_correct ? chosen.feedback_correct : chosen.feedback_incorrect)?.trim() || question.feedback_hint || (chosen.is_correct ? "Você identificou a alternativa correta." : "Releia o conteúdo e compare as alternativas antes de tentar novamente.")}</p></div>}</article>
                      }) : !lessonLoading ? <div className="rounded-2xl border border-[#E3EAF4] bg-white p-5 text-sm leading-6 text-[#68778C]">Não há questões de prática publicadas para este tópico no momento.</div> : null}
                    </section>
                  </div>
                ) : recommendation?.topic_id ? (
                  <div className="mt-5 rounded-[24px] border border-[#DCE6F5] bg-white p-5">
                    <span className="inline-flex rounded-full bg-[#EEF4FF] px-3 py-1.5 text-xs font-bold text-[#0242D7]">{recommendationReason}</span>
                    <h2 className="mt-4 text-xl font-extrabold leading-snug">{recommendation.topic_name || "Tópico recomendado"}</h2>
                    <p className="mt-2 text-sm text-[#68778C]">{recommendation.discipline_name || "Sua disciplina"}</p>
                    {recommendation.message && <p className="mt-4 rounded-xl bg-[#F5F8FE] p-3 text-sm leading-6 text-[#53657D]">{recommendation.message}</p>}
                    <p className="mt-4 text-sm leading-6 text-[#68778C]">Escolha o tópico em Meus cursos para abrir o conteúdo completo e praticar por aqui.</p>
                    <button type="button" onClick={() => setTab("cursos")} className="mt-4 min-h-12 w-full rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white">Ver meus cursos</button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] border border-[#E3EAF4] bg-white p-5"><h2 className="font-extrabold">Vamos preparar seu percurso</h2><p className="mt-2 text-sm leading-6 text-[#68778C]">Assim que houver uma recomendação disponível, ela aparecerá aqui. Você também pode explorar seus cursos.</p><button type="button" onClick={() => setTab("cursos")} className="mt-4 min-h-12 w-full rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white">Explorar cursos</button></div>
                )}
              </section>
            )}

            {tab === "comunidade" && (
              <section>
                <p className="text-sm font-bold text-[#0242D7]">Aprenda em conjunto</p>
                <h1 className="mt-1 text-[29px] font-extrabold tracking-[-.05em]">Comunidade</h1>
                <p className="mt-2 text-sm leading-6 text-[#68778C]">Compartilhe dúvidas, descobertas e ideias com outros estudantes.</p>
                <form onSubmit={(event) => void publishCommunityPost(event)} className="mt-5 rounded-2xl border border-[#E3EAF4] bg-white p-4">
                  <label htmlFor="mobile-community-message" className="text-sm font-bold">O que você quer compartilhar?</label>
                  <textarea id="mobile-community-message" value={communityMessage} onChange={(event) => setCommunityMessage(event.target.value)} maxLength={3000} rows={4} placeholder="Escreva uma dúvida, reflexão ou descoberta..." className="mt-2 w-full resize-y rounded-xl border border-[#DCE5F0] p-3 text-base leading-6 outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15" />
                  <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-[#728096]">{communityMessage.length}/3000</span><button type="submit" disabled={communityPosting || !communityMessage.trim()} className="min-h-11 rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white disabled:opacity-50">{communityPosting ? "Publicando…" : "Publicar"}</button></div>
                </form>
                <div className="mt-5 space-y-3">
                  {communityLoading ? <div className="h-32 animate-pulse rounded-2xl bg-[#E7EDF7]" /> : communityPosts.length ? communityPosts.map((post) => <article key={post.id} className="rounded-2xl border border-[#E3EAF4] bg-white p-4"><div className="flex items-center gap-3">{post.author_avatar_url ? <img src={post.author_avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF4FF] font-bold text-[#0242D7]">{(post.author_display_name || "E").slice(0,1).toUpperCase()}</span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold">{post.author_display_name || "Estudante"}</p>{post.author_is_verified && <span className="rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[10px] font-bold text-[#0242D7]">Verificado</span>}{post.is_official && (!post.official_until || new Date(post.official_until).getTime() > Date.now()) && <span className="rounded-full bg-[#FFF3D6] px-2 py-0.5 text-[10px] font-bold text-[#8A5A00]">Oficial</span>}</div><p className="text-xs text-[#8794A7]">{new Date(post.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p></div></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#42536A]">{post.body}</p>{post.image_url && <img src={post.image_url} alt="Imagem compartilhada na publicação" loading="lazy" className="mt-3 max-h-80 w-full rounded-xl object-cover" />}</article>) : <div className="rounded-2xl border border-dashed border-[#CDD9EA] bg-white p-6 text-center"><p className="font-bold">A comunidade começa com você</p><p className="mt-2 text-sm leading-6 text-[#728096]">Ainda não há publicações disponíveis. Compartilhe a primeira ideia.</p></div>}
                </div>
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
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {tabs.map((item) => {
            const active = tab === item.id;
            return <button key={item.id} type="button" onClick={() => { setTab(item.id); if (item.id !== "cursos") setSelectedCourse(null); }} aria-current={active ? "page" : undefined} className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-extrabold transition-colors ${active ? "bg-[#EEF4FF] text-[#0242D7]" : "text-[#8390A3] active:bg-[#F5F8FE]"}`}><span className="text-[21px] leading-none" aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>;
          })}
        </div>
      </nav>}
    </div>
  );
}
