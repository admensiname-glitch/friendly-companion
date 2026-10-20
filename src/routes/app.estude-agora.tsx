import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Odometer } from "@/components/motion/odometer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Recommendation {
  topic_id: string | null;
  discipline_id?: string | null;
  topic_name?: string | null;
  discipline_name?: string | null;
  reason?: "assessment" | "review" | "continue" | "start" | "none";
  message?: string | null;
  exam_date?: string | null;
  exam_type?: string | null;
}
interface TodayStudy { minutes: number; }

export const Route = createFileRoute("/app/estude-agora")({ component: StudyNowPage });

function Icon({ name, className = "" }: { name: "spark" | "arrow" | "review"; className?: string }) {
  const paths = {
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 4 .7 2 2 .7-.2.7-2-.7-2 .7z" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    review: <><path d="M4 6h16" /><path d="M4 12h11" /><path d="M4 18h8" /><path d="m17 15 2 2 3-4" /></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function reasonLabel(reason: Recommendation["reason"]) {
  if (reason === "assessment") return "Preparação para avaliação";
  if (reason === "review") return "Uma revisão ficou pronta";
  if (reason === "continue") return "Continue de onde parou";
  if (reason === "start") return "Um novo tópico espera por você";
  return "Próximo passo";
}

function primaryActionLabel(reason: Recommendation["reason"]) {
  if (reason === "assessment") return "Preparar este tópico";
  if (reason === "review") return "Revisar este tópico";
  if (reason === "continue") return "Continuar estudo";
  if (reason === "start") return "Começar tópico";
  return "Estudar agora";
}

function StudyNowPage() {
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [todayStudy, setTodayStudy] = useState<TodayStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await navigate({ to: "/login" });
        return;
      }

      const [recommendationResult, todayResult] = await Promise.all([
        supabase.rpc("get_student_study_recommendation"),
        supabase.rpc("get_student_today_study"),
      ]);

      if (cancelled) return;
      if (recommendationResult.error) {
        setError(true);
      } else {
        setRecommendation((recommendationResult.data ?? null) as Recommendation | null);
      }
      if (!todayResult.error && todayResult.data) {
        setTodayStudy(todayResult.data as unknown as TodayStudy);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  const canStudy = Boolean(recommendation?.topic_id && recommendation?.discipline_id);

  return (
    <section aria-labelledby="study-now-title" className="app-native-screen mx-auto max-w-3xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">Seu próximo passo</p>
        <h1 id="study-now-title" className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]">
          Estudar agora
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
          Em vez de escolher o que estudar, deixe o seu histórico indicar o próximo passo.
        </p>
      </header>

      {loading ? (
        <div className="mt-8 h-72 animate-pulse rounded-[20px] border border-[#E4EAF1] bg-white dark:border-[#2B3A4F] dark:bg-[#111B2A]" />
      ) : error ? (
        <div className="mt-8 rounded-[20px] border border-[#FECACA] bg-[#FEF2F2] p-6 text-sm text-[#991B1B] dark:border-[#71333A] dark:bg-[#321A1F] dark:text-[#FCA5A5]" role="alert">
          Não foi possível calcular seu próximo passo agora. Você pode continuar pelas disciplinas ou tentar novamente.
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/app/disciplinas" className="inline-flex items-center gap-2 rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0038B8]">Ver disciplinas</Link>
            <Link to="/app/revisao" className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F0] bg-white px-4 py-2.5 text-sm font-bold text-[#556273] hover:text-[#0242D7] dark:border-[#334155] dark:bg-[#172033] dark:text-[#C5D0DE]">Abrir revisão</Link>
          </div>
        </div>
      ) : canStudy ? (
        <section className="mt-8 overflow-hidden rounded-[20px] border border-[#D5E1F2] bg-[#EFF5FF] dark:border-[#2E4563] dark:bg-[#142238]">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-[#0242D7] dark:text-[#7DB0FF]">
              <Icon name={recommendation?.reason === "review" ? "review" : "spark"} className="h-4 w-4" />
              {reasonLabel(recommendation?.reason)}
            </div>
            <p className="mt-5 text-sm font-semibold text-[#5D6D80] dark:text-[#AAB9CB]">
              {recommendation?.discipline_name}
            </p>
            {recommendation?.reason === "assessment" && recommendation.exam_date && (
              <p className="mt-2 text-xs font-bold text-[#718096] dark:text-[#96A6B8]">
                {recommendation.exam_type ?? "Avaliação"} · {new Date(recommendation.exam_date + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            )}
            <h2 className="mt-1 text-[26px] font-bold tracking-[-0.04em] text-[#172334] dark:text-[#F0F5FA] sm:text-[32px]">
              {recommendation?.topic_name}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5F7187] dark:text-[#B3C0CF]">
              {recommendation?.message ?? "Este é o próximo passo indicado pelo seu percurso de aprendizagem."}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/app/disciplinas/$disciplineId/$topicId"
                params={{ disciplineId: recommendation!.discipline_id!, topicId: recommendation!.topic_id! }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(2,66,215,0.16)] hover:bg-[#0038B8]"
              >
                {primaryActionLabel(recommendation?.reason)}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <a
                href={`/app/disciplinas/${recommendation!.discipline_id}/${recommendation!.topic_id}#pratica`}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D5E1F2] bg-white px-4 py-2.5 text-sm font-bold text-[#556273] hover:text-[#0242D7] dark:border-[#3B506D] dark:bg-[#17253A] dark:text-[#C5D0DE]"
              >
                Praticar questões
              </a>
              <Link to="/app/revisao" className="inline-flex items-center gap-2 rounded-xl border border-[#D5E1F2] bg-white px-4 py-2.5 text-sm font-bold text-[#556273] hover:text-[#0242D7] dark:border-[#3B506D] dark:bg-[#17253A] dark:text-[#C5D0DE]">
                Ver revisão
              </Link>
              <a
                href={`/app/comunidade?share_text=${encodeURIComponent(`Estou estudando “${recommendation?.topic_name ?? "um tópico"}” no Ensina-me. Minha próxima meta é consolidar este conteúdo na prática.`)}${recommendation?.discipline_id ? `&discipline_id=${encodeURIComponent(recommendation.discipline_id)}` : ""}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D5E1F2] bg-white px-4 py-2.5 text-sm font-bold text-[#556273] hover:text-[#0242D7] dark:border-[#3B506D] dark:bg-[#17253A] dark:text-[#C5D0DE]"
              >
                Compartilhar na comunidade
              </a>
            </div>
          </div>

          <div className="border-t border-[#D5E1F2] bg-white/55 px-6 py-5 dark:border-[#2E4563] dark:bg-[#111C2E]/45 sm:px-8">
            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-[#DCE5F0] bg-white p-3 dark:border-[#2B3A4F] dark:bg-[#172033]"><p className="text-xs font-bold text-[#0242D7] dark:text-[#78A9FF]">15 min</p><p className="mt-1 text-xs text-[#7A8796] dark:text-[#AAB7C7]">Sessão rápida: conteúdo + prática</p></div>
              <div className="rounded-xl border border-[#DCE5F0] bg-white p-3 dark:border-[#2B3A4F] dark:bg-[#172033]"><p className="text-xs font-bold text-[#0242D7] dark:text-[#78A9FF]">30 min</p><p className="mt-1 text-xs text-[#7A8796] dark:text-[#AAB7C7]">Sessão completa: estudar + praticar + revisar</p></div>
              <div className="rounded-xl border border-[#DCE5F0] bg-white p-3 dark:border-[#2B3A4F] dark:bg-[#172033]"><p className="text-xs font-bold text-[#0242D7] dark:text-[#78A9FF]">Meta de hoje</p><p className="mt-1 text-xs text-[#7A8796] dark:text-[#AAB7C7]">Acumule minutos e acompanhe seu ritmo</p></div>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <div>
                <p className="text-xs text-[#7A8796] dark:text-[#96A6B8]">Estudo hoje</p>
                <p className="mt-1 text-lg font-bold text-[#273547] dark:text-[#E0E8F1]"><Odometer value={todayStudy?.minutes ?? 0} suffix=" min" /></p>
              </div>
              <p className="max-w-xl text-xs leading-5 text-[#7A8796] dark:text-[#96A6B8]">
                A recomendação considera os sinais de aprendizagem registrados pelo Ensina-me. Ela pode mudar conforme você pratica.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-8 rounded-[20px] border border-[#E4EAF1] bg-white p-7 dark:border-[#2B3A4F] dark:bg-[#111B2A] sm:p-9">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1B2A40] dark:text-[#7DB0FF]">
            <Icon name="spark" className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]">Seu percurso ainda precisa de um ponto de partida.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#687688] dark:text-[#AAB7C7]">
            Escolha uma disciplina para começar. Depois que você estudar e praticar, o Ensina-me passa a indicar os próximos passos com base no seu histórico.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/app/disciplinas" className="inline-flex items-center gap-2 rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0038B8]">Escolher disciplina <Icon name="arrow" className="h-4 w-4" /></Link>
            <Link to="/app/catalogo" className="inline-flex items-center rounded-xl border border-[#DCE5F0] bg-white px-4 py-2.5 text-sm font-bold text-[#556273] hover:text-[#0242D7] dark:border-[#334155] dark:bg-[#172033] dark:text-[#C5D0DE]">Explorar catálogo</Link>
          </div>
        </section>
      )}
    </section>
  );
}
