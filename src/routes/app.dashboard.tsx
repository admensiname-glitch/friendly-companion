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
  reason: "assessment" | "review" | "continue" | "start" | "none";
  message: string;
}
interface TodayStudy { minutes: number; }
interface StudentExam { id: string; discipline: string; exam_type: string; exam_date: string | null; }

export const Route = createFileRoute("/app/dashboard")({
  component: AppDashboard,
});

function Icon({
  name,
  className = "",
}: {
  name: "book" | "clock" | "target" | "chart" | "arrow" | "review";
  className?: string;
}) {
  const paths = {
    book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 4.5v17"/><path d="M9 6h7"/></>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
    target: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/></>,
    arrow: <><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></>,
    review: <><path d="M4 6h16"/><path d="M4 12h11"/><path d="M4 18h8"/><path d="m17 15 2 2 3-4"/></>,
  } as const;

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
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

      const [
        profileResult,
        disciplinesResult,
        topicsResult,
        recommendationResult,
        todayResult,
      ] = await Promise.all([
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
        setRecommendation(recommendationResult.data as StudyRecommendation);
      }
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
    () =>
      user?.user_metadata?.full_name?.split(" ")[0] ||
      user?.user_metadata?.name?.split(" ")[0] ||
      "Aluno",
    [user],
  );

  const studyTimeLabel = profile?.daily_study_minutes
    ? profile.daily_study_minutes >= 60
      ? `${Math.floor(profile.daily_study_minutes / 60)}h${profile.daily_study_minutes % 60 ? ` ${profile.daily_study_minutes % 60}min` : ""}`
      : `${profile.daily_study_minutes} min`
    : "—";

  const activeTopics = topicsProgress.filter(
    (topic) =>
      topic.review_count > 0 ||
      topic.status !== "completed" ||
      topic.progress < 100,
  );

  const todayPercent =
    profile?.daily_study_minutes && todayStudy
      ? Math.min(
          100,
          Math.round((todayStudy.minutes / profile.daily_study_minutes) * 100),
        )
      : 0;

  const bestScore = topicsProgress.some((topic) => topic.best_score !== null)
    ? Math.max(
        ...topicsProgress
          .filter((topic) => topic.best_score !== null)
          .map((topic) => topic.best_score as number),
      )
    : null;

  const disciplineProgress = useMemo(() => {
    const map = new Map<
      string,
      {
        discipline_id: string;
        discipline_name: string;
        progress: number;
        topics: number;
        completed: number;
      }
    >();

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
      .map((item) => ({
        ...item,
        progress: item.topics ? Math.round(item.progress / item.topics) : 0,
      }))
      .sort((a, b) => b.progress - a.progress);
  }, [topicsProgress]);

  return (
    <section aria-labelledby="app-dashboard-title" className="max-w-5xl">
      <header className="pb-2">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
          Seu espaço de aprendizagem
        </p>
        <h1
          id="app-dashboard-title"
          className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]"
        >
          Olá, {firstName}.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
          Vamos continuar de onde você parou.
        </p>
      </header>

      <section
        aria-labelledby="today-heading"
        className="mt-8 overflow-hidden rounded-[18px] border border-[#D5E1F2] bg-[#EFF5FF] dark:border-[#2E4563] dark:bg-[#142238]"
      >
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0242D7] dark:text-[#7DB0FF]">
              {recommendation?.reason === "assessment"
                ? "Preparação para avaliação"
                : recommendation?.reason === "review"
                  ? "Revisão necessária"
                  : recommendation?.reason === "continue"
                    ? "Continue de onde parou"
                    : recommendation?.reason === "start"
                      ? "Próximo tópico"
                      : "Próximo passo"}
            </p>
            <h2
              id="today-heading"
              className="mt-2 max-w-2xl text-[22px] font-bold leading-7 tracking-[-0.035em] text-[#172334] dark:text-[#F0F5FA] sm:text-[28px] sm:leading-8"
            >
              {recommendation?.topic_name ??
                activeTopics[0]?.topic_name ??
                "Seu próximo passo começa aqui"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#55677D] dark:text-[#AAB9CB]">
              {recommendation?.discipline_name ??
                activeTopics[0]?.discipline_name ??
                "Escolha uma disciplina para começar."}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5F7187] dark:text-[#B3C0CF]">
              {recommendation?.message ??
                "Aprenda uma ideia, pratique e volte depois para revisar o que ainda não estiver firme."}
            </p>

            {recommendation?.topic_id && recommendation.discipline_id ? (
              <Link
                to="/app/disciplinas/$disciplineId/$topicId"
                params={{
                  disciplineId: recommendation.discipline_id,
                  topicId: recommendation.topic_id,
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-px hover:bg-[#0038B8]"
              >
                Continuar estudando
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/app/disciplinas"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0038B8]"
              >
                Escolher disciplina
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="border-t border-[#D5E1F2] bg-white/55 p-5 dark:border-[#2E4563] dark:bg-[#111C2E]/45 lg:border-l lg:border-t-0">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#7D8B9B] dark:text-[#8797AA]">
              Hoje
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-bold tracking-[-0.04em] text-[#172334] dark:text-[#F0F5FA]">
                {todayStudy?.minutes ?? 0}
              </span>
              <span className="pb-1 text-sm font-semibold text-[#748397] dark:text-[#9DADBF]">
                min
              </span>
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#DCE7F5] dark:bg-[#293B54]">
              <div
                className="h-full rounded-full bg-[#0242D7] dark:bg-[#6EA6FF]"
                style={{ width: `${todayPercent}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-[#7A8796] dark:text-[#96A6B8]">
                Meta diária
              </span>
              <span className="font-bold text-[#4F6278] dark:text-[#B5C2D0]">
                {profile?.daily_study_minutes ? studyTimeLabel : "Defina no perfil"}
              </span>
            </div>

            {nextExam?.exam_date && (
              <div className="mt-6 border-t border-[#DCE5F0] pt-5 dark:border-[#2B3A4F]">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7D8B9B] dark:text-[#8797AA]">
                  Próxima prova
                </p>
                <p className="mt-1 text-sm font-bold text-[#273547] dark:text-[#DDE6EF]">
                  {nextExam.discipline}
                </p>
                <p className="mt-1 text-xs text-[#7A8796] dark:text-[#98A8B9]">
                  {nextExam.exam_type} ·{" "}
                  {new Date(nextExam.exam_date + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-8 grid border-y border-[#DCE5F0] dark:border-[#2B3A4F] sm:grid-cols-4">
        {[
          ["Tópicos", topicsProgress.length.toString(), "no seu percurso"],
          ["Revisões", topicsProgress.reduce((sum, topic) => sum + topic.review_count, 0).toString(), "pontos para retomar"],
          ["Melhor resultado", bestScore === null ? "—" : `${bestScore}%`, "em avaliações"],
          ["Hoje", `${todayStudy?.minutes ?? 0} min`, "de estudo"],
        ].map(([label, value, detail]) => (
          <div
            key={label}
            className="border-b border-[#DCE5F0] px-1 py-4 sm:border-b-0 sm:border-r sm:px-5 sm:py-5 last:border-0 dark:border-[#2B3A4F]"
          >
            <p className="text-xs font-semibold text-[#8792A0] dark:text-[#8FA0B2]">
              {label}
            </p>
            <p className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]">
              {value}
            </p>
            <p className="mt-0.5 text-xs text-[#7B8796] dark:text-[#8797AA]">
              {detail}
            </p>
          </div>
        ))}
      </div>

      {activeTopics.length > 0 && (
        <section className="mt-10" aria-labelledby="continue-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
                Continuar
              </p>
              <h2
                id="continue-heading"
                className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
              >
                De onde você parou
              </h2>
            </div>
            <Link
              to="/app/disciplinas"
              className="text-sm font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]"
            >
              Ver disciplinas
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#E4EAF1] border-y border-[#E4EAF1] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
            {activeTopics.slice(0, 4).map((topic, index) => (
              <Link
                key={topic.topic_id}
                to="/app/disciplinas/$disciplineId/$topicId"
                params={{
                  disciplineId: topic.discipline_id,
                  topicId: topic.topic_id,
                }}
                className="group grid gap-3 px-1 py-4 sm:grid-cols-[34px_minmax(0,1fr)_160px_auto] sm:items-center"
              >
                <span className="text-xs font-bold text-[#99A4B2] dark:text-[#73859A]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-[#273547] dark:text-[#DFE8F1]">
                    {topic.topic_name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#7A8796] dark:text-[#8999AB]">
                    {topic.discipline_name}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-[#8792A0] dark:text-[#8797AA]">
                    <span>Progresso</span>
                    <span>{topic.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#E7EDF4] dark:bg-[#27384F]">
                    <div
                      className="h-full rounded-full bg-[#0242D7] dark:bg-[#6EA6FF]"
                      style={{ width: `${topic.progress}%` }}
                    />
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0242D7] transition-transform group-hover:translate-x-0.5 dark:text-[#7DB0FF]">
                  {topic.review_count > 0
                    ? "Revisar"
                    : topic.progress > 0
                      ? "Continuar"
                      : "Começar"}
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="path-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
              Seu percurso
            </p>
            <h2
              id="path-heading"
              className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
            >
              Disciplinas em andamento
            </h2>
          </div>
          <Link
            to="/app/catalogo"
            className="text-sm font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]"
          >
            Explorar catálogo
          </Link>
        </div>

        {loading ? (
          <div className="mt-3 divide-y divide-[#E4EAF1] border-y border-[#E4EAF1] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse" />
            ))}
          </div>
        ) : disciplineProgress.length > 0 ? (
          <div className="mt-3 divide-y divide-[#E4EAF1] border-y border-[#E4EAF1] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
            {disciplineProgress.map((discipline, index) => (
              <Link
                key={discipline.discipline_id}
                to="/app/disciplinas/$disciplineId"
                params={{ disciplineId: discipline.discipline_id }}
                className="group grid gap-3 px-1 py-4 sm:grid-cols-[34px_minmax(0,1fr)_220px_auto] sm:items-center"
              >
                <span className="text-xs font-bold text-[#99A4B2] dark:text-[#73859A]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[15px] font-bold text-[#273547] dark:text-[#DFE8F1]">
                    {discipline.discipline_name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#7A8796] dark:text-[#8999AB]">
                    {discipline.completed} de {discipline.topics} tópicos concluídos
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-[#8792A0] dark:text-[#8797AA]">
                    <span>Domínio do percurso</span>
                    <span>{discipline.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#E7EDF4] dark:bg-[#27384F]">
                    <div
                      className="h-full rounded-full bg-[#0242D7] dark:bg-[#6EA6FF]"
                      style={{ width: `${discipline.progress}%` }}
                    />
                  </div>
                </div>
                <Icon name="arrow" className="h-4 w-4 text-[#98A4B1] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0242D7] dark:text-[#74879B] dark:group-hover:text-[#7DB0FF]" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="muted-panel mt-3 rounded-xl p-7">
            <p className="text-sm font-semibold text-[#344154] dark:text-[#DCE5EE]">
              Suas disciplinas aparecerão aqui.
            </p>
            <p className="mt-1 text-sm leading-6 text-[#7A8796] dark:text-[#97A7B8]">
              Assim que houver uma disciplina disponível, seu percurso começa aqui.
            </p>
          </div>
        )}
      </section>

      {disciplines.length > 0 && (
        <section className="mt-10" aria-labelledby="quick-heading">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="quick-heading"
              className="text-sm font-bold text-[#273547] dark:text-[#DCE5EE]"
            >
              Acesso rápido
            </h2>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link to="/app/disciplinas" className="font-semibold text-[#0242D7] hover:underline dark:text-[#7DB0FF]">
              Minhas disciplinas
            </Link>
            <Link to="/app/revisao" className="font-semibold text-[#0242D7] hover:underline dark:text-[#7DB0FF]">
              Revisão
            </Link>
            <Link to="/app/desempenho" className="font-semibold text-[#0242D7] hover:underline dark:text-[#7DB0FF]">
              Meu desempenho
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}
