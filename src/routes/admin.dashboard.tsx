import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  courses_published: number;
  disciplines_published: number;
  topics_published: number;
  materials_published: number;
  application_exercises: number;
  evaluations: number;
  answers: number;
  evaluation_attempts: number;
  pending_difficulties: number;
}

const metrics: Array<{ key: keyof AdminStats; label: string }> = [
  { key: "courses_published", label: "Cursos publicados" },
  { key: "disciplines_published", label: "Disciplinas publicadas" },
  { key: "topics_published", label: "Tópicos publicados" },
  { key: "materials_published", label: "Materiais publicados" },
  { key: "application_exercises", label: "Exercícios de aplicação" },
  { key: "evaluations", label: "Avaliações formais" },
  { key: "answers", label: "Respostas registradas" },
  { key: "evaluation_attempts", label: "Tentativas de avaliação" },
  { key: "pending_difficulties", label: "Pontos aguardando revisão" },
];

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data, error: rpcError } = await supabase.rpc("get_admin_dashboard_stats");
      if (rpcError || !data) {
        setError(true);
        return;
      }
      setStats(data as AdminStats);
    })();
  }, []);

  return (
    <section aria-labelledby="admin-dashboard-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Área administrativa
      </p>
      <h1
        id="admin-dashboard-title"
        className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
      >
        Dashboard administrativo
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        Visão operacional do catálogo, dos materiais, das atividades e dos sinais de aprendizagem.
      </p>

      {error && (
        <div
          className="mt-6 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
          role="alert"
        >
          Não foi possível carregar as métricas administrativas.
        </div>
      )}

      {!error && !stats && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.slice(0, 8).map((metric) => (
            <div
              key={metric.key}
              className="h-28 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {stats && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="rounded-xl border border-[#E2E8F0] bg-white p-5"
            >
              <p className="text-sm text-[#64748B]">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                {stats[metric.key]}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
          Próxima camada
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#0F172A]">
          Curadoria e gestão de conteúdo
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#475569]">
          O painel já separa catálogo, aprendizagem e sinais de revisão. A gestão editorial poderá usar esses dados para revisar fontes, materiais, exercícios e avaliações antes da publicação.
        </p>
      </div>
    </section>
  );
}
