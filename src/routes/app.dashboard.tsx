import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/dashboard")({
  component: AppDashboard,
});

interface Profile {
  institution: string | null;
  semester: number | null;
  daily_study_minutes: number | null;
  difficulties: string[] | null;
}

interface StudentDiscipline {
  id: string;
  discipline_name: string;
  course: string;
}

interface User {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}

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
  reason: "assessment" | "review" | "continue" | "start" | "none";
  message: string;
}

interface TodayStudy {
  minutes: number;
}

interface StudentExam {
  id: string;
  discipline: string;
  exam_type: string;
  exam_date: string | null;
}

function Icon({
  name,
  className = "",
}: {
  name: "spark" | "arrow" | "book" | "review" | "target" | "clock" | "chart" | "chevron";
  className?: string;
}) {
  const paths = {
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 4 .7 2 2 .7-.2.7-2 .7-2-.7.7-2z" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 4.5v17" /><path d="M9 6h7" /></>,
    review: <><path d="M4 6h16" /><path d="M4 12h11" /><path d="M4 18h8" /><path d="m17 15 2 2 3-4" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
  } as const;

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}

function ProgressRing({ value, size = 76 }: { value: number; size?: number }) {
  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#0242D7 ${value * 3.6}deg, #E8EEF6 0deg)`,
      }}
      aria-label={`Progresso de ${value}%`}
      role="img"
    >
      <div
        className="absolute inset-[6px] flex items-center justify-center rounded-full bg-white dark:bg-[#172437]"
      >
        <span className="text-sm font-black text-[#172334] dark:text-[#E7EDF5]">{value}%</span>
      </div>
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

      const [profileResult, disciplinesResult, topicsResult, recommendationResult, todayResult] =
        await Promise.all([
          supabase.from("student_profiles").select("institution, semester, daily_study_minutes, difficulties").eq("user_id", userId).maybeSingle(),
          supabase.from("student_disciplines").select("id, discipline_name, course").eq("user_id", userId),
          supabase.rpc("get_student_dashboard_topics"),
          supabase.rpc("get_student_study_recommendation"),
          supabase.rpc("get_student_today_study"),
        ]);

      if (profileResult.data) setProfile(profileResult.data as Profile);
      if (disciplinesResult.data) setDisciplines(disciplinesResult.data as StudentDiscipline[]);
      if (!topicsResult.error) setTopicsProgress((topicsResult.data ?? []) as DashboardTopic[]);
      if (!recommendationResult.error && recommendationResult.data) {
        setRecommendation(recommendationResult.data as unknown as StudyRecommendation);
      }
      if (!todayResult.error && todayResult.data) {
        setTodayStudy(todayResult.data as unknown as TodayStudy);
      }

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

  const activeTopics = topicsProgress.filter(
    (topic) => topic.review_count > 0 || topic.status !== "completed" || topic.progress < 100,
  );

  const todayPercent =
    profile?.daily_study_minutes && todayStudy
      ? Math.min(100, Math.round((todayStudy.minutes / profile.daily_study_minutes) * 100))
      : 0;

  const bestScore = topicsProgress.some((topic) => topic.best_score !== null)
    ? Math.max(...topicsProgress.filter((topic) => topic.best_score !== null).map((topic) => topic.best_score as number))
    : null;

  const overallProgress = topicsProgress.length
    ? Math.round(topicsProgress.reduce((sum, topic) => sum + topic.progress, 0) / topicsProgress.length)
    : 0;

  const disciplineProgress = useMemo(() => {
    const map = new Map<string, { discipline_id: string; discipline_name: string; progress: number; topics: number; completed: number }>();

    for (const topic of topicsProgress) {
      const current = map.get(topic.discipline_id) ?? {
        discipline_id: topic.discipline_id,
        discipline_name: topic.discipline_name,
        progress: 0,
        topics: 0,
        completed: 0,
      };
      current.progress += topic.progress;
      current.topics += 1;
      current.completed += topic.progress >= 100 ? 1 : 0;
      map.set(topic.discipline_id, current);
    }

    return Array.from(map.values())
      .map((item) => ({ ...item, progress: item.topics ? Math.round(item.progress / item.topics) : 0 }))
      .sort((a, b) => b.progress - a.progress);
  }, [topicsProgress]);

  const recommendationLabel = {
    assessment: "Preparação para avaliação",
    review: "Revisão necessária",
    continue: "Continue de onde parou",
    start: "Seu próximo passo",
    none: "Percurso em dia",
  }[recommendation?.reason ?? "start"];

  return (
    <section className="w-full" aria-labelledby="app-dashboard-title">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0242D7] dark:text-[#78A9FF]">Início</p>
          <h1 id="app-dashboard-title" className="mt-1.5 text-[28px] font-black tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[38px]">
            Olá, {firstName}! 👋
          </h1>
          <p className="mt-1 text-sm leading-6 text-[#718096] dark:text-[#9EADBD]">
            Seu professor indicou o Ensina-me para acompanhar sua jornada de aprendizagem — vamos continuar de onde você parou.
          </p>
        </div>
        <Link to="/app/desempenho" className="app-icon-button hidden sm:inline-flex" aria-label="Ver meu desempenho">
          <Icon name="chart" className="h-[18px] w-[18px]" />
        </Link>
      </header>

      <section className="mt-4 rounded-[20px] border border-[#DCE7F8] bg-white p-4 shadow-sm dark:border-[#263A55] dark:bg-[#142238]" aria-label="Como usar o Ensina-me">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1A2D49] dark:text-[#78A9FF]">
            <Icon name="book" className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-black text-[#172334] dark:text-[#E7EDF5]">Seu professor trouxe você até aqui.</p>
            <p className="mt-1 text-xs leading-5 text-[#718096] dark:text-[#9EADBD]">Use o Ensina-me para estudar o conteúdo, praticar, entender seus erros e revisar antes da próxima aula ou avaliação.</p>
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[24px] bg-[#0242D7] shadow-[0_18px_42px_rgba(2,66,215,.16)] dark:bg-[#0B3FA8]" aria-labelledby="next-study-title">
        <div className="relative p-5 sm:p-7">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                <Icon name="spark" className="h-3.5 w-3.5" />
              </span>
              {recommendationLabel}
            </div>

            <h2 id="next-study-title" className="mt-4 max-w-xl text-[23px] font-black leading-7 tracking-[-0.035em] text-white sm:text-[29px]">
              {recommendation?.topic_name ?? activeTopics[0]?.topic_name ?? "Seu próximo passo começa aqui"}
            </h2>
            <p className="mt-1 text-sm font-bold text-white/75">
              {recommendation?.discipline_name ?? activeTopics[0]?.discipline_name ?? "Escolha uma disciplina para começar."}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
              {recommendation?.message ?? "Aprenda, pratique e volte depois para revisar o que ainda não estiver firme."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {recommendation?.topic_id && recommendation.discipline_id ? (
                <Link
                  to="/app/disciplinas/$disciplineId/$topicId"
                  params={{ disciplineId: recommendation.discipline_id, topicId: recommendation.topic_id }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#0242D7] shadow-sm"
                >
                  {recommendation.reason === "review" ? "Revisar agora" : "Continuar estudo"}
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              ) : (
                <Link to="/app/disciplinas" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#0242D7]">
                  Escolher disciplina
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              )}
              <Link to="/app/prova" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/12 px-4 py-2.5 text-sm font-extrabold text-white ring-1 ring-inset ring-white/25">
                Praticar questões
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumo do seu aprendizado">
        {[
          { label: "Progresso", value: `${overallProgress}%`, icon: "target" as const },
          { label: "Hoje", value: `${todayStudy?.minutes ?? 0} min`, icon: "clock" as const },
          { label: "Revisões", value: topicsProgress.reduce((sum, topic) => sum + topic.review_count, 0).toString(), icon: "review" as const },
          { label: "Melhor nota", value: bestScore === null ? "—" : `${bestScore}%`, icon: "chart" as const },
        ].map((item) => (
          <div key={item.label} className="app-card flex min-h-[96px] flex-col justify-between p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1A2D49] dark:text-[#78A9FF]">
                <Icon name={item.icon} className="h-3.5 w-3.5" />
              </span>
              <span className="text-[10px] font-extrabold text-[#9AA5B3] dark:text-[#8091A5]">{item.label}</span>
            </div>
            <p className="mt-2 text-[21px] font-black tracking-[-0.04em] text-[#172334] dark:text-[#E7EDF5]">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-7" aria-labelledby="continue-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#0242D7] dark:text-[#78A9FF]">Seu percurso</p>
            <h2 id="continue-heading" className="mt-1 text-[21px] font-black tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]">
              Continuar estudando
            </h2>
          </div>
          <Link to="/app/disciplinas" className="text-xs font-black text-[#0242D7] dark:text-[#78A9FF]">Ver tudo</Link>
        </div>

        <div className="mt-3 space-y-2.5">
          {activeTopics.length > 0 ? (
            activeTopics.slice(0, 3).map((topic) => (
              <Link
                key={topic.topic_id}
                to="/app/disciplinas/$disciplineId/$topicId"
                params={{ disciplineId: topic.discipline_id, topicId: topic.topic_id }}
                className="app-card group flex items-center gap-3 p-3.5 transition-transform hover:-translate-y-px"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1A2D49] dark:text-[#78A9FF]">
                  <Icon name="book" className="h-[19px] w-[19px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#273547] dark:text-[#E1E9F2]">{topic.topic_name}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#8A96A5] dark:text-[#8B9CAE]">{topic.discipline_name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E9EEF5] dark:bg-[#293A50]">
                      <div className="h-full rounded-full bg-[#0242D7] dark:bg-[#6EA6FF]" style={{ width: `${topic.progress}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-[#718096] dark:text-[#98A9BB]">{topic.progress}%</span>
                  </div>
                </div>
                <Icon name="chevron" className="h-4 w-4 shrink-0 text-[#A0AAB7] transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))
          ) : (
            <div className="app-card p-5">
              <p className="text-sm font-black text-[#334155] dark:text-[#DCE5EE]">
                {disciplines.length ? "Seu percurso está sendo preparado." : "Adicione uma disciplina para começar."}
              </p>
              <Link to="/app/disciplinas" className="mt-3 inline-flex text-sm font-black text-[#0242D7] dark:text-[#78A9FF]">
                {disciplines.length ? "Ver disciplinas" : "Explorar disciplinas"} <Icon name="arrow" className="ml-1 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2" aria-label="Resumo diário">
        <div className="app-card flex items-center gap-4 p-4">
          <ProgressRing value={todayPercent} size={70} />
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#8A96A5] dark:text-[#8B9CAE]">Meta de hoje</p>
            <p className="mt-1 text-lg font-black text-[#172334] dark:text-[#E7EDF5]">
              {todayStudy?.minutes ?? 0} de {profile?.daily_study_minutes ?? "—"} min
            </p>
            <p className="mt-0.5 text-xs font-semibold text-[#7A8796] dark:text-[#91A1B2]">
              {todayPercent >= 100 ? "Meta concluída. Muito bem!" : "Um pouco por dia faz diferença."}
            </p>
          </div>
        </div>

        <div className="app-card flex items-center gap-4 p-4">
          <span className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full bg-[#FFF5E8] text-[#B86B13] dark:bg-[#302516] dark:text-[#E8B66C]">
            <Icon name="target" className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#8A96A5] dark:text-[#8B9CAE]">Próxima avaliação</p>
            {nextExam?.exam_date ? (
              <>
                <p className="mt-1 truncate text-lg font-black text-[#172334] dark:text-[#E7EDF5]">{nextExam.discipline}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#7A8796] dark:text-[#91A1B2]">
                  {nextExam.exam_type} · {new Date(nextExam.exam_date + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-lg font-black text-[#172334] dark:text-[#E7EDF5]">Nenhuma cadastrada</p>
                <p className="mt-0.5 text-xs font-semibold text-[#7A8796] dark:text-[#91A1B2]">Você pode estudar no seu ritmo.</p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="disciplines-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#0242D7] dark:text-[#78A9FF]">Organização</p>
            <h2 id="disciplines-heading" className="mt-1 text-[21px] font-black tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]">
              Minhas disciplinas
            </h2>
          </div>
          <Link to="/app/catalogo" className="text-xs font-black text-[#0242D7] dark:text-[#78A9FF]">Catálogo</Link>
        </div>

        {loading ? (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {[1, 2].map((item) => <div key={item} className="app-card h-20 animate-pulse" />)}
          </div>
        ) : disciplineProgress.length > 0 ? (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {disciplineProgress.slice(0, 4).map((discipline) => (
              <Link
                key={discipline.discipline_id}
                to="/app/disciplinas/$disciplineId"
                params={{ disciplineId: discipline.discipline_id }}
                className="app-card group flex items-center gap-3 p-4"
              >
                <ProgressRing value={discipline.progress} size={54} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#273547] dark:text-[#E1E9F2]">{discipline.discipline_name}</p>
                  <p className="mt-1 text-xs font-semibold text-[#8995A5] dark:text-[#8B9CAE]">{discipline.completed} de {discipline.topics} tópicos concluídos</p>
                </div>
                <Icon name="chevron" className="h-4 w-4 shrink-0 text-[#A0AAB7] group-hover:text-[#0242D7] dark:group-hover:text-[#78A9FF]" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="app-card mt-3 p-5">
            <p className="text-sm font-black text-[#334155] dark:text-[#DCE5EE]">
              {disciplines.length > 0 ? "Os tópicos das suas disciplinas aparecerão aqui." : "Suas disciplinas aparecerão aqui."}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#7A8796] dark:text-[#91A1B2]">
              Assim que houver conteúdo disponível, seu percurso será organizado automaticamente.
            </p>
          </div>
        )}
      </section>

      <section className="mt-7 pb-3">
        <div className="grid grid-cols-3 gap-2">
          <Link to="/app/estude-agora" className="app-card flex min-h-[82px] flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1A2D49] dark:text-[#78A9FF]"><Icon name="spark" className="h-4 w-4" /></span>
            <span className="text-[11px] font-black text-[#475569] dark:text-[#C6D1DE]">Estudar agora</span>
          </Link>
          <Link to="/app/prova" className="app-card flex min-h-[82px] flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F8F4] text-[#16804A] dark:bg-[#153025] dark:text-[#70D3A1]"><Icon name="book" className="h-4 w-4" /></span>
            <span className="text-[11px] font-black text-[#475569] dark:text-[#C6D1DE]">Praticar</span>
          </Link>
          <Link to="/app/revisao" className="app-card flex min-h-[82px] flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF5E8] text-[#B86B13] dark:bg-[#302516] dark:text-[#E8B66C]"><Icon name="review" className="h-4 w-4" /></span>
            <span className="text-[11px] font-black text-[#475569] dark:text-[#C6D1DE]">Revisar</span>
          </Link>
        </div>
      </section>
    </section>
  );
}
