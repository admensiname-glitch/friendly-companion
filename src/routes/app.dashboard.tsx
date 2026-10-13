import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/dashboard")({
  component: AppDashboard,
});

interface Profile {
  display_name: string | null;
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

interface LearningSignal {
  topic_id: string;
  concept: string;
  severity: number;
  occurrences: number;
  correct_count: number;
  status: "pending" | "improving" | "mastered";
  last_seen: string;
}

interface BrainTopic {
  topic_id: string;
  topic_name: string;
  discipline_name: string;
  severity: number;
  occurrences: number;
  concept: string;
}

interface ResumeTopic {
  topic_id: string;
  discipline_id: string;
  topic_name: string;
  discipline_name: string;
  progress: number;
  last_position: number;
  section_title: string | null;
  last_activity_at: string | null;
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
  const router = useRouter();

  // Warm up the most-used destinations after the dashboard mounts.
  useEffect(() => {
    let cancelled = false;
    const warmRoutes = () => {
      if (cancelled) return;
      void Promise.all([
        router.preloadRoute({ to: "/app/tutor" }),
        router.preloadRoute({ to: "/app/comunidade" }),
        router.preloadRoute({ to: "/app/estude-agora" }),
        router.preloadRoute({ to: "/app/revisao" }),
        router.preloadRoute({ to: "/app/desempenho" }),
        router.preloadRoute({ to: "/app/disciplinas" }),
        router.preloadRoute({ to: "/app/prova" }),
        router.preloadRoute({ to: "/app/perfil" }),
      ]).catch(() => undefined);
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(warmRoutes, { timeout: 1200 })
      : window.setTimeout(warmRoutes, 500);
    return () => {
      cancelled = true;
      if (idleWindow.cancelIdleCallback && idleWindow.requestIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId as number);
      }
    };
  }, [router]);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [disciplines, setDisciplines] = useState<StudentDiscipline[]>([]);
  const [topicsProgress, setTopicsProgress] = useState<DashboardTopic[]>([]);
  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);
  const [todayStudy, setTodayStudy] = useState<TodayStudy | null>(null);
  const [nextExam, setNextExam] = useState<StudentExam | null>(null);
  const [learningSignals, setLearningSignals] = useState<LearningSignal[]>([]);
  const [resumeTopics, setResumeTopics] = useState<ResumeTopic[]>([]);
  const [focusedDisciplineIds, setFocusedDisciplineIds] = useState<string[]>([]);
  const [focusedDisciplineNames, setFocusedDisciplineNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshIdentity = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;
      const { data } = await supabase.from("student_profiles").select("display_name").eq("user_id", userId).maybeSingle();
      if (data) setProfile((current) => current ? { ...current, display_name: data.display_name ?? null } : { display_name: data.display_name ?? null, institution: null, semester: null, daily_study_minutes: null, difficulties: null });
    };
    const onProfileUpdated = () => { void refreshIdentity(); };
    window.addEventListener("ensina-me-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("ensina-me-profile-updated", onProfileUpdated);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;
      setUser(sessionData.session.user as User);

      const today = new Date().toISOString().slice(0, 10);
      const [profileResult, disciplinesResult, topicsResult, recommendationResult, todayResult, focusResult, learningSignalsResult, resumeProgressResult, examsResult] =
        await Promise.all([
          supabase.from("student_profiles").select("display_name, institution, semester, daily_study_minutes, difficulties").eq("user_id", userId).maybeSingle(),
          supabase.from("student_disciplines").select("id, discipline_name, course").eq("user_id", userId),
          supabase.rpc("get_student_dashboard_topics"),
          supabase.rpc("get_student_study_recommendation"),
          supabase.rpc("get_student_today_study"),
          supabase.rpc("get_student_focus_disciplines"),
          supabase
            .from("student_learning_signals")
            .select("topic_id, concept, severity, occurrences, correct_count, status, last_seen")
            .neq("status", "mastered")
            .order("severity", { ascending: false })
            .order("last_seen", { ascending: false })
            .limit(24),
          supabase
            .from("student_topic_progress")
            .select("topic_id, status, last_position, last_learning_activity_at, updated_at")
            .neq("status", "completed")
            .not("last_learning_activity_at", "is", null)
            .order("last_learning_activity_at", { ascending: false })
            .limit(8),
          supabase
            .from("student_exams")
            .select("id, discipline, exam_type, exam_date")
            .eq("user_id", userId)
            .gte("exam_date", today)
            .order("exam_date", { ascending: true })
            .limit(1),
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
      if (!focusResult.error && Array.isArray(focusResult.data)) {
        const focuses = focusResult.data as Array<{ discipline_id: string; discipline_name?: string }>;
        setFocusedDisciplineIds(focuses.map((focus) => focus.discipline_id));
        setFocusedDisciplineNames(
          focuses.map((focus) => focus.discipline_name).filter((name): name is string => Boolean(name)),
        );
      }
      if (!learningSignalsResult.error && learningSignalsResult.data) {
        setLearningSignals(learningSignalsResult.data as LearningSignal[]);
      }

      if (examsResult.data?.[0]) setNextExam(examsResult.data[0] as StudentExam);

      // Reconfirm the profile immediately before revealing the dashboard. This prevents
      // an older initial read from briefly replacing a profile update made moments earlier.
      const { data: latestProfile } = await supabase
        .from("student_profiles")
        .select("display_name, institution, semester, daily_study_minutes, difficulties")
        .eq("user_id", userId)
        .maybeSingle();
      if (latestProfile) setProfile(latestProfile as Profile);

      // The main dashboard can render while resume-position details finish loading.
      setLoading(false);

      if (!resumeProgressResult.error && resumeProgressResult.data) {
        const progressRows = resumeProgressResult.data as Array<{
          topic_id: string;
          status: string;
          last_position: number | null;
          last_learning_activity_at: string | null;
          updated_at: string | null;
        }>;
        const topicIds = [...new Set(progressRows.map((row) => row.topic_id))];

        if (topicIds.length) {
          const [{ data: topicRows }, { data: materialRows }] = await Promise.all([
            supabase
              .from("topics")
              .select("id, name, discipline_id")
              .in("id", topicIds)
              .eq("published", true),
            supabase
              .from("materials")
              .select("id, topic_id")
              .in("topic_id", topicIds)
              .eq("status", "published"),
          ]);

          const disciplineIds = [...new Set((topicRows ?? []).map((topic) => topic.discipline_id))];
          const { data: disciplineRows } = disciplineIds.length
            ? await supabase.from("disciplines").select("id, name").in("id", disciplineIds)
            : { data: [] as Array<{ id: string; name: string }> };

          const materialIds = (materialRows ?? []).map((material) => material.id);
          const { data: sectionRows } = materialIds.length
            ? await supabase
                .from("material_sections")
                .select("material_id, title, position")
                .in("material_id", materialIds)
                .order("position", { ascending: true })
            : { data: [] as Array<{ material_id: string; title: string; position: number }> };

          const topicMap = new Map((topicRows ?? []).map((topic) => [topic.id, topic]));
          const disciplineMap = new Map((disciplineRows ?? []).map((discipline) => [discipline.id, discipline]));
          const materialMap = new Map((materialRows ?? []).map((material) => [material.topic_id, material.id]));
          const sectionsByMaterial = new Map<string, Array<{ title: string; position: number }>>();

          for (const section of sectionRows ?? []) {
            const current = sectionsByMaterial.get(section.material_id) ?? [];
            current.push({ title: section.title, position: section.position });
            sectionsByMaterial.set(section.material_id, current);
          }

          setResumeTopics(
            progressRows
              .map((row) => {
                const topic = topicMap.get(row.topic_id);
                const discipline = topic ? disciplineMap.get(topic.discipline_id) : undefined;
                const materialId = materialMap.get(row.topic_id);
                const sections = materialId ? sectionsByMaterial.get(materialId) ?? [] : [];
                const position = Math.max(0, row.last_position ?? 0);
                const section = sections[position];

                return topic && discipline
                  ? {
                      topic_id: topic.id,
                      discipline_id: discipline.id,
                      topic_name: topic.name,
                      discipline_name: discipline.name,
                      progress: ((topicsResult.data ?? []) as DashboardTopic[]).find((item) => item.topic_id === topic.id)?.progress ?? 0,
                      last_position: position,
                      section_title: section?.title ?? null,
                      last_activity_at: row.last_learning_activity_at ?? row.updated_at,
                    }
                  : null;
              })
              .filter((item): item is ResumeTopic => Boolean(item)),
          );
        }
      }

    };

    void loadData();
  }, []);

  const firstName = useMemo(() => {
    const profileName = profile?.display_name?.trim();
    const authName = user?.user_metadata?.full_name?.trim() || user?.user_metadata?.name?.trim();
    return (profileName || authName || "").split(/\s+/)[0] || null;
  }, [profile?.display_name, user?.user_metadata?.full_name, user?.user_metadata?.name]);

  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12
    ? `Bom dia, ${firstName}`
    : hour >= 12 && hour < 18
      ? `Boa tarde, ${firstName}`
      : `Boa noite, ${firstName}`;

  const focusedTopics = focusedDisciplineIds.length
    ? topicsProgress.filter((topic) => focusedDisciplineIds.includes(topic.discipline_id))
    : topicsProgress;

  const focusedSignals = focusedDisciplineIds.length
    ? learningSignals.filter((signal) => focusedTopics.some((topic) => topic.topic_id === signal.topic_id))
    : learningSignals;

  const focusedRecommendation =
    focusedDisciplineIds.length > 0 && (!recommendation?.discipline_id || !focusedDisciplineIds.includes(recommendation.discipline_id))
      ? (() => {
          const candidates = focusedTopics
            .filter((topic) => topic.progress < 100 || topic.review_count > 0)
            .sort((a, b) => {
              const aSignal = focusedSignals.find((signal) => signal.topic_id === a.topic_id);
              const bSignal = focusedSignals.find((signal) => signal.topic_id === b.topic_id);
              return (bSignal?.severity ?? 0) - (aSignal?.severity ?? 0) || a.progress - b.progress;
            });
          const topic = candidates[0];
          return topic
            ? {
                topic_id: topic.topic_id,
                discipline_id: topic.discipline_id,
                topic_name: topic.topic_name,
                discipline_name: topic.discipline_name,
                reason: topic.review_count > 0 ? "review" as const : "start" as const,
                message: topic.review_count > 0
                  ? "Você escolheu esta disciplina como foco. Há pontos aqui que pedem revisão."
                  : "Você escolheu esta disciplina como foco. Este é o próximo tópico para avançar.",
              }
            : null;
        })()
      : recommendation;

  const activeTopics = focusedTopics.filter(
    (topic) => topic.review_count > 0 || topic.status !== "completed" || topic.progress < 100,
  );
  const fallbackTopic = topicsProgress.find(
    (topic) => topic.review_count > 0 || (topic.status !== "completed" && topic.progress < 100),
  ) ?? topicsProgress[0] ?? null;

  const focusedResumeTopics = useMemo(
    () =>
      (focusedDisciplineIds.length
        ? resumeTopics.filter((topic) => focusedDisciplineIds.includes(topic.discipline_id))
        : resumeTopics
      ).slice(0, 3),
    [focusedDisciplineIds, resumeTopics],
  );

  const todayPercent =
    profile?.daily_study_minutes && todayStudy
      ? Math.min(100, Math.round((todayStudy.minutes / profile.daily_study_minutes) * 100))
      : 0;

  const bestScore = focusedTopics.some((topic) => topic.best_score !== null)
    ? Math.max(...focusedTopics.filter((topic) => topic.best_score !== null).map((topic) => topic.best_score as number))
    : null;

  const overallProgress = focusedTopics.length
    ? Math.round(focusedTopics.reduce((sum, topic) => sum + topic.progress, 0) / focusedTopics.length)
    : 0;

  const brainTopics = useMemo<BrainTopic[]>(() => {
    if (!focusedSignals.length) return [];

    const topicMap = new Map(
      topicsProgress.map((topic) => [
        topic.topic_id,
        {
          topic_name: topic.topic_name,
          discipline_name: topic.discipline_name,
        },
      ]),
    );

    return focusedSignals
      .filter((signal) => signal.status !== "mastered")
      .map((signal) => {
        const topic = topicMap.get(signal.topic_id);
        return topic
          ? {
              topic_id: signal.topic_id,
              topic_name: topic.topic_name,
              discipline_name: topic.discipline_name,
              severity: signal.severity,
              occurrences: signal.occurrences,
              concept: signal.concept,
            }
          : null;
      })
      .filter((item): item is BrainTopic => item !== null)
      .sort((a, b) => b.severity - a.severity || b.occurrences - a.occurrences);
  }, [learningSignals, topicsProgress]);

  const brainCounts = useMemo(() => ({
    mastered: focusedTopics.filter((topic) => topic.progress >= 80).length,
    review: focusedTopics.filter((topic) => topic.progress >= 50 && topic.progress < 80).length,
    difficulty: brainTopics.filter((topic) => topic.severity >= 4).length,
  }), [focusedTopics, brainTopics]);

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

  return (
    <section className="w-full" aria-labelledby="app-dashboard-title">
      <section className="mb-3 px-1 pt-1 sm:mb-5 sm:pt-2" aria-labelledby="dashboard-greeting">
        <h1 id="dashboard-greeting" className="text-[23px] font-black leading-tight tracking-[-0.035em] text-[#172334] dark:text-[#E7EDF5] sm:text-[32px]">
          {!loading && firstName ? greeting.replace(/Aluno/g, firstName) : !loading ? "Boa noite" : ""}
        </h1>
      </section>

      <section className="mt-3 overflow-hidden rounded-[18px] bg-[#0242D7] shadow-[0_10px_26px_rgba(2,66,215,.13)] dark:bg-[#0B3FA8] sm:mt-5 lg:mt-8 lg:rounded-[20px] lg:shadow-[0_18px_42px_rgba(2,66,215,.16)]" aria-labelledby="next-study-title">
        <div className="relative p-4 sm:p-9 lg:min-h-[300px] lg:p-11">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                <Icon name="spark" className="h-3.5 w-3.5" />
              </span>
              O que estudar agora
            </div>

            <h2 id="next-study-title" className="mt-3 max-w-3xl text-[23px] font-black leading-7 tracking-[-0.035em] text-white sm:mt-5 sm:text-[34px] sm:leading-9 lg:text-[40px] lg:leading-[1.08]">
              {loading ? "Carregando seu próximo passo…" : focusedRecommendation?.topic_name ?? activeTopics[0]?.topic_name ?? fallbackTopic?.topic_name ?? "Escolha uma disciplina para começar"}
            </h2>
            <p className="mt-1 text-sm font-bold text-white/80 sm:mt-2 sm:text-base lg:text-lg">
              {loading ? "Preparando seu percurso de aprendizagem." : focusedRecommendation?.discipline_name ?? activeTopics[0]?.discipline_name ?? fallbackTopic?.discipline_name ?? "Explore o catálogo e escolha por onde começar."}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-white/80 sm:mt-4 sm:text-base sm:leading-7 lg:text-[17px] lg:leading-7">
              {focusedRecommendation?.message ?? "Aprenda, pratique e volte depois para revisar o que ainda não estiver firme."}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/75 sm:mt-5 sm:text-xs">
              <span className="rounded-full bg-white/12 px-3 py-1.5 ring-1 ring-inset ring-white/15">
                ⏱️ Estudo sugerido: {focusedRecommendation?.reason === "assessment" ? "30" : focusedRecommendation?.reason === "review" ? "20" : "15"} min
              </span>
              {focusedRecommendation?.reason === "review" && <span className="rounded-full bg-white/12 px-3 py-1.5 ring-1 ring-inset ring-white/15">Baseado nos seus sinais de dificuldade</span>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
              {focusedRecommendation?.topic_id && focusedRecommendation.discipline_id ? (
                <Link
                  to="/app/disciplinas/$disciplineId/$topicId"
                  params={{ disciplineId: focusedRecommendation.discipline_id, topicId: focusedRecommendation.topic_id }}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#0242D7] shadow-sm"
                >
                  {focusedRecommendation.reason === "review" ? "Revisar agora" : "Continuar estudo"}
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              ) : (
                <Link to="/app/disciplinas" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#0242D7]">
                  Escolher disciplina
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              )}
              <Link to="/app/disciplinas" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white/12 px-5 py-3 text-sm font-extrabold text-white ring-1 ring-inset ring-white/30">
                Escolher outra matéria
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link to="/app/prova" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white/12 px-5 py-3 text-sm font-extrabold text-white ring-1 ring-inset ring-white/30">
                Praticar questões
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[20px] border border-[#DCE5F0] bg-white dark:border-[#2B3A4F] dark:bg-[#111B2A]" aria-labelledby="brain-heading">
        <div className="border-b border-[#E6EBF2] px-5 py-5 dark:border-[#2B3A4F] sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0242D7] dark:text-[#78A9FF]">Meu cérebro</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="brain-heading" className="text-[22px] font-black tracking-[-0.035em] text-[#172334] dark:text-[#E7EDF5]">O que seu histórico está mostrando</h2>
              <p className="mt-1 text-sm leading-6 text-[#718096] dark:text-[#9EADBD]">Não é só nota: são sinais do que já está firme e do que ainda precisa de atenção.</p>
            </div>
            <Link to="/app/desempenho" className="text-xs font-black text-[#0242D7] dark:text-[#78A9FF]">Ver meu domínio →</Link>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#E6EBF2] dark:divide-[#2B3A4F]">
          <div className="p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#7A8796]">Domina</p><p className="mt-2 text-2xl font-black text-[#187A59] dark:text-[#7ED4AE]">{brainCounts.mastered}</p><p className="mt-1 text-xs text-[#7A8796]">assuntos</p></div>
          <div className="p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#7A8796]">Revisar</p><p className="mt-2 text-2xl font-black text-[#B86B13] dark:text-[#E8B66C]">{brainCounts.review}</p><p className="mt-1 text-xs text-[#7A8796]">assuntos</p></div>
          <div className="p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#7A8796]">Dificuldade</p><p className="mt-2 text-2xl font-black text-[#B42318] dark:text-[#F28B82]">{brainCounts.difficulty}</p><p className="mt-1 text-xs text-[#7A8796]">assuntos</p></div>
        </div>
        {brainTopics[0] && (
          <div className="m-4 rounded-[15px] bg-[#F7F9FC] p-4 dark:bg-[#172437] sm:m-5">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#B42318] dark:text-[#F28B82]">Seu maior ponto de atenção</p>
            <p className="mt-1 text-base font-black text-[#172334] dark:text-[#E7EDF5]">{brainTopics[0].concept}</p>
            <p className="mt-1 text-xs font-semibold text-[#718096] dark:text-[#9EADBD]">{brainTopics[0].topic_name} · {brainTopics[0].discipline_name}</p>
            <p className="mt-2 text-xs leading-5 text-[#66758A] dark:text-[#AAB7C7]">Sinal registrado {brainTopics[0].occurrences} vez{brainTopics[0].occurrences === 1 ? "" : "es"} com intensidade {brainTopics[0].severity}/5.</p>
          </div>
        )}
      </section>

      <section className="mt-6 sm:mt-10" aria-labelledby="continue-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#0242D7] dark:text-[#78A9FF]">Seu percurso</p>
            <h2 id="continue-heading" className="mt-1 text-[21px] font-black tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]">Continuar de onde você parou</h2>
          </div>
          <Link to="/app/disciplinas" className="text-xs font-black text-[#0242D7] dark:text-[#78A9FF]">Pesquisar qualquer disciplina</Link>
        </div>
        <div className="mt-4 space-y-3">
          {focusedResumeTopics.length > 0 ? (
            focusedResumeTopics.map((topic) => (
              <Link key={topic.topic_id} to="/app/disciplinas/$disciplineId/$topicId" params={{ disciplineId: topic.discipline_id, topicId: topic.topic_id }} className="app-card group flex items-center gap-4 p-4 sm:p-5 transition-transform hover:-translate-y-px">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1A2D49] dark:text-[#78A9FF]"><Icon name="book" className="h-[19px] w-[19px]" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#273547] dark:text-[#E1E9F2]">{topic.topic_name}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#8A96A5] dark:text-[#8B9CAE]">{topic.discipline_name}</p>
                  <p className="mt-2 truncate text-xs font-bold text-[#0242D7] dark:text-[#78A9FF]">{topic.section_title ? <>Parou em: <span className="font-black">{topic.section_title}</span></> : `Parou na parte ${topic.last_position + 1}`}</p>
                  <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E9EEF5] dark:bg-[#293A50]"><div className="h-full rounded-full bg-[#0242D7] dark:bg-[#6EA6FF]" style={{ width: `${topic.progress}%` }} /></div><span className="text-[10px] font-black text-[#718096] dark:text-[#98A9BB]">{topic.progress}%</span></div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0242D7] px-3 py-2 text-xs font-black text-white">Continuar <Icon name="arrow" className="h-3.5 w-3.5" /></span>
              </Link>
            ))
          ) : (
            <div className="app-card p-5">
              <p className="text-sm font-black text-[#334155] dark:text-[#DCE5EE]">{disciplines.length ? "Você ainda não começou nenhum tópico." : "Escolha uma disciplina para começar."}</p>
              <Link to="/app/disciplinas" className="mt-3 inline-flex text-sm font-black text-[#0242D7] dark:text-[#78A9FF]">{disciplines.length ? "Começar a estudar" : "Explorar disciplinas"} <Icon name="arrow" className="ml-1 h-4 w-4" /></Link>
            </div>
          )}
        </div>
      </section>
      <section className="mt-10" aria-labelledby="disciplines-heading">
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

      <section className="mt-10 overflow-hidden rounded-[16px] border border-[#DCE5F0] bg-white dark:border-[#2B3A4F] dark:bg-[#111B2A]" aria-label="Foco de estudo">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7A8796]">Foco de estudo</p>
            <p className="mt-0.5 truncate text-sm font-black text-[#273547] dark:text-[#E1E9F2]">
              {focusedDisciplineNames.length
                ? focusedDisciplineNames.slice(0, 3).join(", ") + (focusedDisciplineNames.length > 3 ? " +" + (focusedDisciplineNames.length - 3) : "")
                : "Nenhuma disciplina escolhida"}
            </p>
          </div>
          <Link to="/app/disciplinas" className="shrink-0 rounded-xl bg-[#EEF4FF] px-3.5 py-2 text-xs font-black text-[#0242D7] dark:bg-[#1B3156] dark:text-[#8DB8FF]">
            {focusedDisciplineNames.length ? "Gerenciar focos" : "Escolher disciplinas"}
          </Link>
        </div>
      </section>

      <section className="mt-6 pb-3 sm:mt-10">
        <div className="grid grid-cols-3 gap-2">
          <Link to="/app/estude-agora" className="app-card flex min-h-[82px] flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1A2D49] dark:text-[#78A9FF]"><Icon name="spark" className="h-4 w-4" /></span>
            <span className="text-[11px] font-black text-[#475569] dark:text-[#C6D1DE]">O que estudar agora</span>
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
