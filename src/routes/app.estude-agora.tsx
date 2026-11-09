import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlanStep {
  step: string;
  title: string;
  description: string;
  minutes?: number;
}
interface ProgressSummary {
  latest_score?: number | null;
  best_score?: number | null;
  exercises_completed?: number;
  attempts_count?: number;
  pending_difficulties?: number;
  open_signals?: number;
  next_exam_date?: string | null;
  days_to_exam?: number | null;
}
interface Recommendation {
  topic_id: string | null;
  discipline_id?: string | null;
  topic_name?: string | null;
  discipline_name?: string | null;
  reason?: "assessment" | "performance" | "difficulty" | "review" | "continue" | "start" | "none";
  message?: string | null;
  exam_date?: string | null;
  exam_type?: string | null;
  focus_count?: number;
  estimated_minutes?: number;
  plan?: PlanStep[];
  progress?: ProgressSummary;
}
interface TodayStudy { minutes: number; }
interface FocusDiscipline { discipline_id: string; discipline_name: string; }
interface DisciplineOption { id: string; name: string; }

export const Route = createFileRoute("/app/estude-agora")({ component: StudyNowPage });

function Icon({ name, className = "" }: { name: "spark" | "arrow" | "review" | "check"; className?: string }) {
  const paths = {
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 4 .7 2 2 .7-.2.7-2-.7-2 .7z" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    review: <><path d="M4 6h16" /><path d="M4 12h11" /><path d="M4 18h8" /><path d="m17 15 2 2 3-4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function reasonLabel(reason: Recommendation["reason"]) {
  if (reason === "assessment") return "Prioridade: avaliação próxima";
  if (reason === "performance") return "Prioridade: fortalecer seu desempenho";
  if (reason === "difficulty") return "Prioridade: superar uma dificuldade";
  if (reason === "review") return "Momento de revisar";
  if (reason === "continue") return "Continue de onde parou";
  if (reason === "start") return "Próximo tópico do seu percurso";
  return "Seu plano de aprendizagem";
}

function primaryActionLabel(reason: Recommendation["reason"]) {
  if (reason === "review" || reason === "difficulty" || reason === "performance") return "Retomar este tópico";
  if (reason === "continue") return "Continuar estudo";
  if (reason === "start") return "Começar tópico";
  return "Estudar este tópico";
}

function StudyNowPage() {
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [todayStudy, setTodayStudy] = useState<TodayStudy | null>(null);
  const [focusDisciplines, setFocusDisciplines] = useState<FocusDiscipline[]>([]);
  const [disciplineOptions, setDisciplineOptions] = useState<DisciplineOption[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingFocus, setSavingFocus] = useState(false);
  const [error, setError] = useState(false);
  const [focusError, setFocusError] = useState("");

  const loadRecommendation = useCallback(async () => {
    const [recommendationResult, todayResult, focusResult] = await Promise.all([
      supabase.rpc("get_student_study_recommendation"),
      supabase.rpc("get_student_today_study"),
      supabase.rpc("get_student_focus_disciplines"),
    ]);
    if (recommendationResult.error) setError(true);
    else {
      setError(false);
      setRecommendation((recommendationResult.data ?? null) as Recommendation | null);
    }
    if (!todayResult.error && todayResult.data) setTodayStudy(todayResult.data as TodayStudy);
    if (!focusResult.error && Array.isArray(focusResult.data)) {
      setFocusDisciplines(focusResult.data as FocusDiscipline[]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await navigate({ to: "/login" });
        return;
      }

      const { data: profile } = await supabase
        .from("student_profiles")
        .select("course_id")
        .eq("user_id", sessionData.session.user.id)
        .maybeSingle();

      if (profile?.course_id) {
        const { data: disciplines } = await supabase
          .from("disciplines")
          .select("id,name")
          .eq("course_id", profile.course_id)
          .eq("published", true)
          .order("name");
        if (!cancelled) setDisciplineOptions((disciplines ?? []) as DisciplineOption[]);
      }

      await loadRecommendation();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate, loadRecommendation]);

  const addFocus = async () => {
    if (!selectedDiscipline || savingFocus) return;
    setSavingFocus(true);
    setFocusError("");
    const { error: saveError } = await supabase.rpc("set_student_focus_discipline", {
      _discipline_id: selectedDiscipline,
    });
    if (saveError) setFocusError("Não foi possível atualizar suas prioridades. Tente novamente.");
    else {
      setSelectedDiscipline("");
      await loadRecommendation();
    }
    setSavingFocus(false);
  };

  const removeFocus = async (disciplineId: string) => {
    if (savingFocus) return;
    setSavingFocus(true);
    setFocusError("");
    const { error: removeError } = await supabase.rpc("remove_student_focus_discipline", {
      _discipline_id: disciplineId,
    });
    if (removeError) setFocusError("Não foi possível remover esta prioridade. Tente novamente.");
    else await loadRecommendation();
    setSavingFocus(false);
  };

  const canStudy = Boolean(recommendation?.topic_id && recommendation?.discipline_id);
  const plan = recommendation?.plan ?? [];
  const progress = recommendation?.progress;

  return (
    <section aria-labelledby="study-now-title" className="app-native-screen mx-auto max-w-4xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">Seu orientador de aprendizagem</p>
        <h1 id="study-now-title" className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]">
          Estudar agora
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
          Um próximo passo definido pelo seu progresso, pelas suas dificuldades e pelas matérias que você quer priorizar.
        </p>
      </header>

      <section aria-labelledby="focus-title" className="mt-7 rounded-2xl border border-[#DCE5F0] bg-white p-5 dark:border-[#2B3A4F] dark:bg-[#111B2A]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="focus-title" className="text-base font-bold text-[#172334] dark:text-[#E7EDF5]">Suas disciplinas prioritárias</h2>
            <p className="mt-1 text-sm text-[#687688] dark:text-[#AAB7C7]">Escolha as matérias que quer desenvolver. Seu histórico continua salvo ao trocar o foco.</p>
          </div>
          <span className="text-xs font-semibold text-[#7A8796] dark:text-[#AAB7C7]">{focusDisciplines.length} selecionada(s)</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {focusDisciplines.map((discipline) => (
            <span key={discipline.discipline_id} className="inline-flex items-center gap-2 rounded-full bg-[#EAF1FC] px-3 py-2 text-sm font-semibold text-[#0242D7] dark:bg-[#172B48] dark:text-[#9ABEFF]">
              {discipline.discipline_name}
              <button type="button" onClick={() => void removeFocus(discipline.discipline_id)} disabled={savingFocus} aria-label={`Remover ${discipline.discipline_name} das prioridades`} className="rounded-full px-1 text-base leading-none hover:bg-[#D5E4FA] disabled:opacity-50 dark:hover:bg-[#263D5C]">×</button>
            </span>
          ))}
          {focusDisciplines.length === 0 && (
            <p className="text-sm text-[#7A8796] dark:text-[#AAB7C7]">Nenhuma matéria escolhida ainda. Selecione uma para personalizar suas recomendações.</p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <select value={selectedDiscipline} onChange={(event) => setSelectedDiscipline(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#DCE5F0] bg-white px-3 text-sm text-[#273547] outline-none focus:border-[#0242D7] dark:border-[#334155] dark:bg-[#172033] dark:text-[#E0E8F1]">
            <option value="">Adicionar disciplina...</option>
            {disciplineOptions.filter((item) => !focusDisciplines.some((focus) => focus.discipline_id === item.id)).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <button type="button" onClick={() => void addFocus()} disabled={!selectedDiscipline || savingFocus} className="min-h-11 rounded-xl bg-[#0242D7] px-4 text-sm font-bold text-white hover:bg-[#0038B8] disabled:cursor-not-allowed disabled:opacity-50">
            {savingFocus ? "Salvando..." : "Adicionar"}
          </button>
        </div>
        {focusError && <p role="alert" className="mt-2 text-sm text-[#B42318]">{focusError}</p>}
      </section>

      {loading ? (
        <div className="mt-8 h-72 animate-pulse rounded-[20px] border border-[#E4EAF1] bg-white dark:border-[#2B3A4F] dark:bg-[#111B2A]" />
      ) : error ? (
        <div className="mt-8 rounded-[20px] border border-[#FECACA] bg-[#FEF2F2] p-6 text-sm text-[#991B1B] dark:border-[#71333A] dark:bg-[#321A1F] dark:text-[#FCA5A5]" role="alert">
          Não foi possível analisar seu percurso agora. Tente novamente.
          <button type="button" onClick={() => { setLoading(true); void loadRecommendation().finally(() => setLoading(false)); }} className="ml-3 font-bold underline">Tentar novamente</button>
        </div>
      ) : canStudy ? (
        <section className="mt-7 overflow-hidden rounded-[20px] border border-[#D5E1F2] bg-[#EFF5FF] dark:border-[#2E4563] dark:bg-[#142238]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-[#0242D7] dark:text-[#7DB0FF]">
                <Icon name={recommendation?.reason === "review" ? "review" : "spark"} className="h-4 w-4" />
                {reasonLabel(recommendation?.reason)}
              </div>
              <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-[#53657B] dark:bg-[#1B2D45] dark:text-[#C5D0DE]">
                Sessão sugerida · {recommendation?.estimated_minutes ?? 28} min
              </span>
            </div>
            <p className="mt-5 text-sm font-semibold text-[#5D6D80] dark:text-[#AAB9CB]">{recommendation?.discipline_name}</p>
            <h2 className="mt-1 text-[26px] font-bold tracking-[-0.04em] text-[#172334] dark:text-[#F0F5FA] sm:text-[32px]">{recommendation?.topic_name}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5F7187] dark:text-[#B3C0CF]">{recommendation?.message}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/app/disciplinas/$disciplineId/$topicId" params={{ disciplineId: recommendation!.discipline_id!, topicId: recommendation!.topic_id! }} className="inline-flex items-center gap-2 rounded-xl bg-[#0242D7] px-5 py-3 text-sm font-bold text-white shadow-[0_6px_18px_rgba(2,66,215,0.16)] hover:bg-[#0038B8]">
                {primaryActionLabel(recommendation?.reason)} <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link to="/app/revisao" className="inline-flex items-center rounded-xl border border-[#D5E1F2] bg-white px-4 py-3 text-sm font-bold text-[#556273] hover:text-[#0242D7] dark:border-[#3B506D] dark:bg-[#17253A] dark:text-[#C5D0DE]">Central de revisão</Link>
            </div>
          </div>

          {progress && (
            <div className="grid grid-cols-2 gap-px border-t border-[#D5E1F2] bg-[#D5E1F2] dark:border-[#2E4563] dark:bg-[#2E4563] sm:grid-cols-4">
              <div className="bg-white/75 p-4 dark:bg-[#111C2E]/80"><p className="text-xs text-[#718096] dark:text-[#AAB7C7]">Último resultado</p><p className="mt-1 text-xl font-bold text-[#172334] dark:text-[#E7EDF5]">{progress.latest_score == null ? "—" : `${Math.round(progress.latest_score)}%`}</p></div>
              <div className="bg-white/75 p-4 dark:bg-[#111C2E]/80"><p className="text-xs text-[#718096] dark:text-[#AAB7C7]">Questões concluídas</p><p className="mt-1 text-xl font-bold text-[#172334] dark:text-[#E7EDF5]">{progress.exercises_completed ?? 0}</p></div>
              <div className="bg-white/75 p-4 dark:bg-[#111C2E]/80"><p className="text-xs text-[#718096] dark:text-[#AAB7C7]">Dificuldades abertas</p><p className="mt-1 text-xl font-bold text-[#172334] dark:text-[#E7EDF5]">{(progress.pending_difficulties ?? 0) + (progress.open_signals ?? 0)}</p></div>
              <div className="bg-white/75 p-4 dark:bg-[#111C2E]/80"><p className="text-xs text-[#718096] dark:text-[#AAB7C7]">Estudo hoje</p><p className="mt-1 text-xl font-bold text-[#172334] dark:text-[#E7EDF5]">{todayStudy?.minutes ?? 0} min</p></div>
            </div>
          )}

          <div className="border-t border-[#D5E1F2] bg-white/55 px-6 py-6 dark:border-[#2E4563] dark:bg-[#111C2E]/45 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-[#172334] dark:text-[#E7EDF5]">Sua sessão de aprendizagem</h3>
                <p className="mt-1 text-sm text-[#687688] dark:text-[#AAB7C7]">Siga esta sequência para transformar estudo em domínio.</p>
              </div>
              <span className="text-xs font-semibold text-[#7A8796] dark:text-[#AAB7C7]">{plan.length} etapas</span>
            </div>
            <ol className="mt-5 space-y-3">
              {plan.map((step, index) => {
                const topicPath = `/app/disciplinas/${recommendation!.discipline_id}/${recommendation!.topic_id}`;
                const stepHref = step.step === "review" ? "/app/revisao" : step.step === "practice" || step.step === "feedback" ? `${topicPath}#pratica` : topicPath;
                return (
                  <li key={step.step}>
                    <a href={stepHref} className="flex gap-3 rounded-xl border border-[#DCE5F0] bg-white p-4 transition-colors hover:border-[#AFC7EF] hover:bg-[#F8FAFF] dark:border-[#2B3A4F] dark:bg-[#172033] dark:hover:border-[#3D5C88] dark:hover:bg-[#1B2A40]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF1FC] text-sm font-bold text-[#0242D7] dark:bg-[#1B2D45] dark:text-[#9ABEFF]">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-[#273547] dark:text-[#E0E8F1]">{step.title}</h4>
                          {step.minutes != null && <span className="text-xs font-semibold text-[#7A8796] dark:text-[#AAB7C7]">{step.minutes} min</span>}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[#687688] dark:text-[#AAB7C7]">{step.description}</p>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#0242D7] dark:text-[#9ABEFF]">Ir para esta etapa <Icon name="arrow" className="h-3 w-3" /></span>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ) : (
        <section className="mt-7 rounded-[20px] border border-[#E4EAF1] bg-white p-7 dark:border-[#2B3A4F] dark:bg-[#111B2A] sm:p-9">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1B2A40] dark:text-[#7DB0FF]"><Icon name="spark" className="h-5 w-5" /></div>
          <h2 className="mt-5 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]">Vamos montar seu próximo passo.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#687688] dark:text-[#AAB7C7]">
            Adicione uma ou mais disciplinas prioritárias acima. O Ensina-me usará seu progresso, suas avaliações, as dificuldades registradas e as revisões pendentes para indicar o que estudar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/app/disciplinas" className="inline-flex items-center gap-2 rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0038B8]">Ver disciplinas <Icon name="arrow" className="h-4 w-4" /></Link>
            <Link to="/app/catalogo" className="inline-flex items-center rounded-xl border border-[#DCE5F0] bg-white px-4 py-2.5 text-sm font-bold text-[#556273] hover:text-[#0242D7] dark:border-[#334155] dark:bg-[#172033] dark:text-[#C5D0DE]">Explorar catálogo</Link>
          </div>
        </section>
      )}
    </section>
  );
}
