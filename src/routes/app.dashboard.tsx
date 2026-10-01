import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Profile {
  institution: string | null;
  semester: number | null;
  daily_study_minutes: number | null;
  difficulties: string[] | null;
}
interface StudentDiscipline { id: string; discipline_name: string; course: string; }
interface User { email?: string; user_metadata?: { full_name?: string; name?: string }; }
interface DashboardTopic {
  discipline_id: string;
  discipline_name: string;
  topic_id: string;
  topic_name: string;
  topic_description: string | null;
  progress: number;
  best_score: number | null;
  status: string;
  review_count: number;
}
interface StudyRecommendation {
  topic_id: string | null;
  discipline_id?: string;
  topic_name?: string;
  discipline_name?: string;
  reason: "review" | "continue" | "start" | "none";
  message: string;
}
interface TodayStudy { minutes: number; }
interface StudentExam { id: string; discipline: string; exam_type: string; exam_date: string | null; }

export const Route = createFileRoute("/app/dashboard")({
  component: AppDashboard,
});

function Icon({ name, className = "" }: { name: "book" | "clock" | "target" | "chart" | "arrow"; className?: string }) {
  const paths = {
    book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 4.5v17" /><path d="M9 6h7" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
  } as const;

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function MetricCard({
  icon, label, value, detail,
}: { icon: "book" | "clock" | "target" | "chart"; label: string; value: string | number; detail?: string }) {
  return (
    <div className="surface-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#0242D7]">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B96A5]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#172334]">{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-[#718093]">{detail}</p>}
    </div>
  );
}

function ContinueCard({ topic }: { topic: DashboardTopic }) {
  const statusLabel =
    topic.review_count > 0
      ? `${topic.review_count} ponto${topic.review_count === 1 ? "" : "s"} para revisar`
      : topic.best_score !== null
        ? `Última avaliação: ${topic.best_score}%`
        : topic.progress > 0
          ? `${topic.progress}% do percurso concluído`
          : "Comece por aqui";

  return (
    <Link
      to="/app/disciplinas/$disciplineId/$topicId"
      params={{ disciplineId: topic.discipline_id, topicId: topic.topic_id }}
      className="surface-card surface-card-hover group block rounded-2xl p-4 focus-visible:outline-none sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#738093]">{topic.discipline_name}</p>
          <h3 className="mt-2 line-clamp-2 text-[17px] font-semibold leading-6 text-[#172334]">{topic.topic_name}</h3>
        </div>
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F6FA] text-[#657487] transition-colors group-hover:bg-[#EEF4FF] group-hover:text-[#0242D7]">
          <Icon name="arrow" className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-sm text-[#637084]">{statusLabel}</p>
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#8792A0]">
          <span>Progresso</span><span>{topic.progress}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E9EEF5]">
          <div className="h-full rounded-full bg-[#0242D7] transition-all" style={{ width: `${topic.progress}%` }} />
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="muted-panel rounded-2xl p-8 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0242D7] shadow-sm">
        <Icon name="book" className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-[#172334]">Suas disciplinas aparecerão aqui</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#6F7C8C]">
        Assim que uma disciplina estiver disponível, você poderá entrar nela e começar a estudar.
      </p>
    </div>
  );
}

function AppDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [disciplines, setDisciplines] = useState<StudentDiscipline[]>([]);
  const [topicsProgress, setTopicsProgress] = useState<DashboardTopic[]>([]);
  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);
  const [todayStudy, setTodayStudy] = useState<TodayStudy | null>(null);
  const [nextExam, setNextExam] = useState<StudentExam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }
      const userId = sessionData.session.user.id;
      setUser(sessionData.session.user as User);

      const [profileResult, disciplinesResult, topicsResult, recommendationResult, todayResult] = await Promise.all([
        supabase.from("student_profiles").select("institution, semester, daily_study_minutes, difficulties").eq("user_id", userId).maybeSingle(),
        supabase.from("student_disciplines").select("id, discipline_name, course").eq("user_id", userId),
        supabase.rpc("get_student_dashboard_topics"),
        supabase.rpc("get_student_study_recommendation"),
        supabase.rpc("get_student_today_study"),
      ]);

      if (profileResult.data) setProfile(profileResult.data as Profile);
      if (disciplinesResult.data) setDisciplines(disciplinesResult.data as StudentDiscipline[]);
      if (!topicsResult.error) setTopicsProgress((topicsResult.data ?? []) as DashboardTopic[]);
      if (!recommendationResult.error && recommendationResult.data) setRecommendation(recommendationResult.data as StudyRecommendation);
      if (!todayResult.error && todayResult.data) setTodayStudy(todayResult.data as TodayStudy);

      const today = new Date().toISOString().slice(0, 10);
      const { data: exams } = await supabase
        .from("student_exams")
        .select("id, discipline, exam_type, exam_date")
        .eq("user_id", userId)
        .gte("exam_date", today)
        .order("exam_date", { ascending: true })
        .limit(1);
      if (exams?.[0]) setNextExam(exams[0] as StudentExam);

      setLoading(false);
    };
    void loadData();
  }, []);

  const firstName = useMemo(
    () => user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "Aluno",
    [user],
  );

  const studyTimeLabel = profile?.daily_study_minutes
    ? profile.daily_study_minutes >= 60
      ? `${Math.floor(profile.daily_study_minutes / 60)}h${profile.daily_study_minutes % 60 ? ` ${profile.daily_study_minutes % 60}min` : ""}`
      : `${profile.daily_study_minutes} min`
    : "—";

  const activeTopics = topicsProgress.filter((topic) => topic.review_count > 0 || topic.status !== "completed" || topic.progress < 100);
  const completionAverage = topicsProgress.length
    ? Math.round(topicsProgress.reduce((sum, topic) => sum + topic.progress, 0) / topicsProgress.length)
    : 0;
  const todayPercent = profile?.daily_study_minutes && todayStudy
    ? Math.min(100, Math.round((todayStudy.minutes / profile.daily_study_minutes) * 100))
    : 0;

  return (
    <section aria-labelledby="app-dashboard-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0242D7]">Visão geral</p>
          <h1 id="app-dashboard-title" className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] sm:text-[36px]">
            Olá, {firstName}
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[#687688]">Vamos descobrir o que faz mais sentido estudar agora.</p>
        </div>
        <Link
          to="/app/disciplinas"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#DCE5F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#445367] transition-colors hover:border-[#C8D8EC] hover:text-[#0242D7]"
        >
          Ver minhas disciplinas <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <div className="rounded-[20px] bg-[#0242D7] p-5 text-white shadow-[0_14px_38px_rgba(2,66,215,0.16)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">Foco de hoje</p>
              <h2 className="mt-2 text-xl font-bold leading-6 tracking-[-0.035em] sm:text-[28px] sm:leading-8">
                {recommendation?.topic_name ?? (activeTopics[0]?.topic_name ?? "Seu próximo passo")}
              </h2>
              <p className="mt-1 text-sm font-medium text-white/75">
                {recommendation?.discipline_name ?? activeTopics[0]?.discipline_name ?? "Comece um tópico para construir seu percurso."}
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/85">
                {recommendation?.message ?? "Estude um tópico, pratique e volte depois para revisar o que ainda estiver frágil."}
              </p>
            </div>
            <span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-white/12 sm:flex">
              <Icon name="target" className="h-5 w-5" />
            </span>
          </div>

          {recommendation?.topic_id && recommendation.discipline_id ? (
            <Link
              to="/app/disciplinas/$disciplineId/$topicId"
              params={{ disciplineId: recommendation.discipline_id, topicId: recommendation.topic_id }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0242D7] transition-transform hover:-translate-y-px"
            >
              Estudar agora <Icon name="arrow" className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/app/disciplinas"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0242D7]"
            >
              Escolher disciplina <Icon name="arrow" className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="surface-card rounded-[20px] p-5 sm:rounded-[22px] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#0242D7]">
              <Icon name="clock" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8792A0]">Estudo de hoje</p>
              <p className="mt-0.5 text-lg font-bold text-[#172334]">{todayStudy?.minutes ?? 0} min</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-semibold text-[#778495]">
              <span>Meta diária</span><span>{todayPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E9EEF5]">
              <div className="h-full rounded-full bg-[#0242D7]" style={{ width: `${todayPercent}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#7A8796]">
              {profile?.daily_study_minutes ? `Sua meta é ${studyTimeLabel} por dia.` : "Defina seu ritmo de estudo no perfil."}
            </p>
          </div>

          {nextExam?.exam_date && (
            <div className="mt-6 border-t border-[#EDF1F5] pt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#97A1AE]">Próxima prova</p>
              <p className="mt-1 text-sm font-semibold text-[#273547]">{nextExam.discipline}</p>
              <p className="mt-0.5 text-xs text-[#7B8795]">
                {nextExam.exam_type} · {new Date(nextExam.exam_date + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard icon="book" label="Tópicos" value={topicsProgress.length} detail={`${completionAverage}% de progresso médio`} />
        <MetricCard icon="target" label="Revisões" value={topicsProgress.reduce((sum, topic) => sum + topic.review_count, 0)} detail="Pontos identificados pelo seu estudo" />
        <MetricCard icon="chart" label="Melhor resultado" value={topicsProgress.filter(t => t.best_score !== null).length ? Math.max(...topicsProgress.filter(t => t.best_score !== null).map(t => t.best_score as number)) + "%" : "—"} detail="Entre suas avaliações concluídas" />
        <MetricCard icon="clock" label="Meta diária" value={studyTimeLabel} detail={todayStudy ? `${todayStudy.minutes} min estudados hoje` : "Comece uma sessão"} />
      </div>

      {activeTopics.length > 0 && (
        <div className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B96A5]">Retomar</p>
              <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334]">Continue de onde parou</h2>
            </div>
            <Link to="/app/desempenho" className="text-sm font-semibold text-[#0242D7] hover:underline">Ver desempenho</Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {activeTopics.slice(0, 3).map((topic) => <ContinueCard key={topic.topic_id} topic={topic} />)}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B96A5]">Seu percurso</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334]">Progresso nas disciplinas</h2>
          </div>
          <Link to="/app/disciplinas" className="text-sm font-semibold text-[#0242D7] hover:underline">Abrir todas</Link>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[92px] animate-pulse rounded-2xl border border-[#E7ECF3] bg-white" />)}
          </div>
        ) : topicsProgress.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topicsProgress.slice(0, 6).map((topic) => (
              <Link
                key={topic.topic_id}
                to="/app/disciplinas/$disciplineId/$topicId"
                params={{ disciplineId: topic.discipline_id, topicId: topic.topic_id }}
                className="surface-card surface-card-hover rounded-2xl p-4 focus-visible:outline-none"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A95A3]">{topic.discipline_name}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#273547]">{topic.topic_name}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[#0242D7]">{topic.progress}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E9EEF5]">
                  <div className="h-full rounded-full bg-[#0242D7]" style={{ width: `${topic.progress}%` }} />
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B96A5]">Acesso rápido</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334]">Onde você quer ir?</h2>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/app/disciplinas" as const, label: "Minhas disciplinas", desc: "Continue suas matérias", icon: "book" as const },
            { to: "/app/catalogo" as const, label: "Catálogo", desc: "Explore outros conteúdos", icon: "book" as const },
            { to: "/app/revisao" as const, label: "Revisão", desc: "Reforce o que está frágil", icon: "target" as const },
            { to: "/app/desempenho" as const, label: "Desempenho", desc: "Acompanhe sua evolução", icon: "chart" as const },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="surface-card surface-card-hover group rounded-2xl p-4 focus-visible:outline-none">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F7FB] text-[#6C7888] transition-colors group-hover:bg-[#EEF4FF] group-hover:text-[#0242D7]">
                <Icon name={item.icon} className="h-[17px] w-[17px]" />
              </span>
              <p className="mt-4 text-sm font-semibold text-[#253447]">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-[#7B8796]">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B96A5]">Minhas disciplinas</h2>
        {loading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl border border-[#E7ECF3] bg-white" />)}
          </div>
        ) : disciplines.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {disciplines.slice(0, 4).map((disc) => (
              <Link
                key={disc.id}
                to="/app/disciplinas/$disciplineId"
                params={{ disciplineId: disc.id }}
                className="surface-card surface-card-hover flex items-center justify-between gap-4 rounded-2xl p-4 focus-visible:outline-none"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#253447]">{disc.discipline_name}</p>
                  <p className="mt-1 text-xs text-[#7B8796]">{disc.course}</p>
                </div>
                <Icon name="arrow" className="h-4 w-4 shrink-0 text-[#91A0AF] transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4"><EmptyState /></div>
        )}
      </div>
    </section>
  );
}
