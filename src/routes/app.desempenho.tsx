import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Summary {
  topics_completed: number;
  average_score: number | null;
  best_score: number | null;
  pending_review: number;
  today_minutes: number;
  seven_day_minutes: number;
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
      const [summaryResult, evaluationResult] = await Promise.all([
        supabase.rpc("get_student_performance_summary"),
        supabase.rpc("get_student_recent_evaluations", { _limit: 10 }),
      ]);

      if (!summaryResult.error && summaryResult.data) {
        setSummary(summaryResult.data as Summary);
      }

      if (!evaluationResult.error) {
        setEvaluations((evaluationResult.data ?? []) as Evaluation[]);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <section aria-labelledby="performance-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Seu desempenho
      </p>
      <h1
        id="performance-title"
        className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
      >
        Aprendizagem em acompanhamento
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        Veja evidências do seu percurso, avaliações e pontos que ainda pedem revisão.
      </p>

      {loading ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Tópicos concluídos" value={summary?.topics_completed ?? 0} />
            <Metric
              label="Média das avaliações"
              value={summary?.average_score !== null && summary?.average_score !== undefined ? summary.average_score + "%" : "—"}
            />
            <Metric
              label="Melhor avaliação"
              value={summary?.best_score !== null && summary?.best_score !== undefined ? summary.best_score + "%" : "—"}
            />
            <Metric label="Revisões pendentes" value={summary?.pending_review ?? 0} />
            <Metric label="Estudo hoje" value={(summary?.today_minutes ?? 0) + " min"} />
            <Metric label="Estudo nos últimos 7 dias" value={(summary?.seven_day_minutes ?? 0) + " min"} />
          </div>

          <div className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#64748B]">
              Avaliações recentes
            </h2>

            {evaluations.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-sm text-[#64748B]">
                Nenhuma avaliação formal concluída ainda.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {evaluations.map((evaluation) => (
                  <Link
                    key={evaluation.attempt_id}
                    to="/app/catalogo/$disciplineId"
                    params={{ disciplineId: evaluation.topic_id }}
                    className="block rounded-xl border border-[#E2E8F0] bg-white p-5 hover:shadow-sm"
                    onClick={(event) => event.preventDefault()}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#64748B]">{evaluation.discipline_name}</p>
                        <h3 className="mt-1 font-semibold text-[#0F172A]">{evaluation.topic_name}</h3>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {evaluation.correct_answers} de {evaluation.total_questions} respostas corretas ·{" "}
                          {new Date(evaluation.completed_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-[#0242D7]">{evaluation.score}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
      <p className="text-sm text-[#64748B]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}
