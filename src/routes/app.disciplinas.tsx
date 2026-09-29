import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentDiscipline {
  id: string;
  discipline_name: string;
  course: string;
  created_at: string;
}

// ─── Loading skeletons ─────────────────────────────────────────────────────────

function DisciplineSkeletons() {
  return (
    <div className="mt-6 space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF]">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 text-[#0242D7]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>
      <h2 className="mt-4 font-semibold text-[#0F172A]">
        Nenhuma disciplina encontrada
      </h2>
      <p className="mt-2 max-w-sm mx-auto text-sm leading-6 text-[#64748B]">
        Adicione suas disciplinas na configuração inicial para vê-las aqui.
      </p>
    </div>
  );
}

// ─── Discipline card ───────────────────────────────────────────────────────────

function DisciplineCard({ discipline }: { discipline: StudentDiscipline }) {
  return (
    <Link
      to="/app/disciplinas/$disciplineId"
      params={{ disciplineId: discipline.id }}
      className="block w-full rounded-xl border border-[#E2E8F0] bg-white p-5 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[#0F172A]">
            {discipline.discipline_name}
          </p>
          {discipline.course && (
            <p className="mt-1 text-xs text-[#64748B]">
              {discipline.course}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-medium text-[#0242D7]">
          Pedagogia
        </span>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/disciplinas")({
  component: DisciplinesPage,
});

function DisciplinesPage() {
  const [disciplines, setDisciplines] = useState<StudentDiscipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDisciplines = async () => {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Sessão não encontrada.");
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;

      const { data, error: fetchError } = await supabase
        .from("student_disciplines")
        .select("id, discipline_name, course, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError("Não foi possível carregar suas disciplinas.");
        setLoading(false);
        return;
      }

      setDisciplines((data as StudentDiscipline[]) ?? []);
      setLoading(false);
    };

    loadDisciplines();
  }, []);

  return (
    <section aria-labelledby="disciplines-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Área do aluno
      </p>
      <h1
        id="disciplines-title"
        className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
      >
        Minhas disciplinas
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        Escolha uma disciplina para continuar seus estudos.
      </p>

      {loading && <DisciplineSkeletons />}

      {!loading && error && (
        <div
          className="mt-6 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && disciplines.length === 0 && <EmptyState />}

      {!loading && !error && disciplines.length > 0 && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {disciplines.map((disc) => (
            <DisciplineCard key={disc.id} discipline={disc} />
          ))}
        </div>
      )}
    </section>
  );
}
