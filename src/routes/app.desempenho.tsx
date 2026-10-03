import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Summary {
  topics_completed: number;
  average_score: number | null;
  best_score: number | null;
  pending_review: number;
  today_minutes: number;
  seven_day_minutes: number;
  micro_questions_attempted: number;
  micro_questions_correct: number;
  micro_accuracy: number | null;
}
interface Evaluation {
  attempt_id: string;
  topic_id: string;
  topic_name: string;
  discipline_name: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  completed_at: string;
}

export const Route = createFileRoute("/app/desempenho")({
  component: PerformancePage,
});

function PerformancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [summaryResult, evaluationsResult] = await Promise.all([
        supabase.rpc("get_student_performance_summary"),
        supabase.rpc("get_student_recent_evaluations", { _limit: 10 }),
      ]);

      if (!summaryResult.error && summaryResult.data) {
        setSummary(summaryResult.data as unknown as Summary);
      }
      if (!evaluationsResult.error) {
        setEvaluations((evaluationsResult.data ?? []) as Evaluation[]);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <section aria-labelledby="performance-title" className="app-native-screen max-w-4xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
          Seu progresso
        </p>
        <h1
          id="performance-title"
          className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]"
        >
          Meu desempenho
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
          Veja o que você já consolidou e o que merece mais uma rodada de prática.
        </p>
      </header>

      {loading ? (
        <div className="mt-6 h-28 animate-pulse border-y border-[#E4EAF1] dark:border-[#2B3A4F]" />
      ) : (
        <>
          <div className="mt-6 grid border-y border-[#DCE5F0] dark:border-[#2B3A4F] sm:grid-cols-4">
            {[
              ["Tópicos concluídos", summary?.topics_completed ?? 0],
              ["Média", summary?.average_score == null ? "—" : summary.average_score + "%"],
              ["Melhor resultado", summary?.best_score == null ? "—" : summary.best_score + "%"],
              ["Revisões", summary?.pending_review ?? 0],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="border-b border-[#DCE5F0] px-1 py-4 sm:border-b-0 sm:border-r sm:px-5 dark:border-[#2B3A4F] last:border-0"
              >
                <p className="text-xs font-semibold text-[#8792A0] dark:text-[#8FA0B2]">
                  {label}
                </p>
                <p className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <section className="mt-8 rounded-[18px] border border-[#E4EAF1] bg-[#F8FAFC] p-5 dark:border-[#2B3A4F] dark:bg-[#111B2A]" aria-labelledby="reading-heading">
            <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">Como ler seu progresso</p>
            <h2 id="reading-heading" className="mt-1 text-lg font-bold tracking-[-0.025em] text-[#172334] dark:text-[#E7EDF5]">
              {summary?.pending_review
                ? "Há conteúdo que merece outra passagem."
                : summary?.micro_accuracy != null && summary.micro_accuracy < 75
                  ? "A prática ainda pode ficar mais firme."
                  : "Seu histórico mostra avanço consistente."}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687688] dark:text-[#AAB7C7]">
              {summary?.pending_review
                ? "Use a Revisão para retomar os pontos sinalizados pelo seu histórico antes de avançar para conteúdos novos."
                : summary?.micro_accuracy != null && summary.micro_accuracy < 75
                  ? "Questões de prática ajudam a transformar compreensão em domínio. Continue praticando e observe onde os erros se repetem."
                  : "Continue alternando estudo, prática e revisão. O objetivo desta página é mostrar o percurso, não apenas um número."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {summary?.pending_review ? (
                <Link to="/app/revisao" className="inline-flex items-center rounded-lg bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0038B8]">Abrir revisão</Link>
              ) : (
                <Link to="/app/estude-agora" className="inline-flex items-center rounded-lg bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0038B8]">Estudar agora</Link>
              )}
            </div>
          </section>

          <section className="mt-10" aria-labelledby="practice-heading">
            <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
              Prática
            </p>
            <div className="mt-1 flex items-end justify-between gap-4">
              <h2
                id="practice-heading"
                className="text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
              >
                O Tutor também aprende com você.
              </h2>
            </div>

            <div className="mt-4 grid border-y border-[#E4EAF1] dark:border-[#2B3A4F] sm:grid-cols-3">
              {[
                ["Microavaliações", summary?.micro_questions_attempted ?? 0],
                ["Acertos", summary?.micro_questions_correct ?? 0],
                ["Aproveitamento", summary?.micro_accuracy == null ? "—" : summary.micro_accuracy + "%"],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="border-b border-[#E4EAF1] py-4 sm:border-b-0 sm:border-r sm:px-5 dark:border-[#2B3A4F] last:border-0"
                >
                  <p className="text-xs text-[#7A8796] dark:text-[#8B9CAF]">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#273547] dark:text-[#DFE8F1]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10" aria-labelledby="time-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
                  Ritmo
                </p>
                <h2
                  id="time-heading"
                  className="mt-1 text-xl font-bold text-[#172334] dark:text-[#E7EDF5]"
                >
                  Seu estudo recente
                </h2>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-8 border-y border-[#E4EAF1] py-5 dark:border-[#2B3A4F]">
              <div>
                <p className="text-xs text-[#7A8796] dark:text-[#8B9CAF]">Hoje</p>
                <p className="mt-1 text-2xl font-bold text-[#273547] dark:text-[#DFE8F1]">
                  {summary?.today_minutes ?? 0} min
                </p>
              </div>
              <div>
                <p className="text-xs text-[#7A8796] dark:text-[#8B9CAF]">Últimos 7 dias</p>
                <p className="mt-1 text-2xl font-bold text-[#273547] dark:text-[#DFE8F1]">
                  {summary?.seven_day_minutes ?? 0} min
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10" aria-labelledby="history-heading">
            <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
              Histórico
            </p>
            <h2
              id="history-heading"
              className="mt-1 text-xl font-bold text-[#172334] dark:text-[#E7EDF5]"
            >
              Avaliações recentes
            </h2>

            {evaluations.length === 0 ? (
              <div className="mt-4 py-7">
                <p className="text-sm font-semibold text-[#344154] dark:text-[#DCE5EE]">
                  Nenhuma avaliação formal concluída ainda.
                </p>
                <p className="mt-1 text-sm text-[#7A8796] dark:text-[#96A6B8]">
                  Quando você concluir uma avaliação, seu resultado aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="mt-4 border-y border-[#E4EAF1] dark:border-[#2B3A4F]">
                {evaluations.map((evaluation, index) => (
                  <div
                    key={evaluation.attempt_id}
                    className="grid gap-4 border-b border-[#E4EAF1] py-5 last:border-b-0 dark:border-[#2B3A4F] sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="text-xl font-bold text-[#0242D7] dark:text-[#7DB0FF]">
                      {Math.round(evaluation.score)}%
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-[#8A96A5] dark:text-[#8797AA]">
                        {evaluation.discipline_name}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#273547] dark:text-[#DFE8F1]">
                        {evaluation.topic_name}
                      </p>
                      <p className="mt-1 text-xs text-[#7A8796] dark:text-[#8B9CAF]">
                        {evaluation.correct_answers} de {evaluation.total_questions} corretas ·{" "}
                        {new Date(evaluation.completed_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#8A96A5] dark:text-[#8797AA]">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
