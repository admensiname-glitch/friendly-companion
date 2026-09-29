import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentDiscipline {
  id: string;
  discipline_name: string;
  course: string;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DisciplineSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="h-6 w-32 animate-pulse rounded-md bg-[#E2E8F0]" />
      <div className="h-10 w-80 animate-pulse rounded-md bg-[#E2E8F0]" />
      <div className="h-5 w-24 animate-pulse rounded-md bg-[#E2E8F0]" />
      <div className="h-10 w-40 animate-pulse rounded-md bg-[#E2E8F0]" />
    </div>
  );
}

// ─── Not found ────────────────────────────────────────────────────────────────

function NotFound() {
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="mt-4 font-semibold text-[#0F172A]">Disciplina não encontrada</h2>
      <p className="mt-2 max-w-sm mx-auto text-sm leading-6 text-[#64748B]">
        Esta disciplina não existe ou você não tem acesso a ela.
      </p>
      <Link
        to="/app/disciplinas"
        className="mt-6 inline-block text-sm font-medium text-[#0242D7] hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
      >
        Voltar para disciplinas
      </Link>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState() {
  return (
    <div
      className="mt-6 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
      role="alert"
    >
      Não foi possível carregar a disciplina. Tente novamente.
    </div>
  );
}

// ─── Content placeholder ───────────────────────────────────────────────────────

function ContentPlaceholder() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-10 text-center">
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
      <h3 className="mt-4 font-semibold text-[#0F172A]">Conteúdo de aprendizagem</h3>
      <p className="mt-2 max-w-sm mx-auto text-sm leading-6 text-[#64748B]">
        Os conteúdos desta disciplina serão disponibilizados aqui.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/disciplinas/$disciplineId")({
  component: DisciplineDetailPage,
});

function DisciplineDetailPage() {
  const { disciplineId } = Route.useParams();
  const [discipline, setDiscipline] = useState<StudentDiscipline | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadDiscipline = async () => {
      setLoading(true);
      setNotFound(false);
      setError(false);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;

      const { data, error: fetchError } = await supabase
        .from("student_disciplines")
        .select("id, discipline_name, course")
        .eq("id", disciplineId)
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        setError(true);
        setLoading(false);
        return;
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setDiscipline(data as StudentDiscipline);
      setLoading(false);
    };

    loadDiscipline();
  }, [disciplineId]);

  return (
    <section aria-labelledby="discipline-title">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Navegação" className="flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
        <Link
          to="/app/dashboard"
          className="hover:text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
        >
          Dashboard
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to="/app/disciplinas"
          className="hover:text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
        >
          Disciplinas
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#0F172A]">
          {loading ? "..." : (discipline?.discipline_name ?? "Disciplina")}
        </span>
      </nav>

      {/* ── Header ── */}
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Disciplina
      </p>

      {loading && <DisciplineSkeleton />}

      {!loading && error && <ErrorState />}

      {!loading && notFound && <NotFound />}

      {!loading && !error && !notFound && discipline && (
        <>
          <h1
            id="discipline-title"
            className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
          >
            {discipline.discipline_name}
          </h1>

          <p className="mt-2 text-base text-[#64748B]">
            <span className="font-medium text-[#64748B]">Curso:</span>{" "}
            {discipline.course}
          </p>

          <ContentPlaceholder />

          {/* ── Navigation links ── */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/app/disciplinas"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Voltar para disciplinas
            </Link>
            <Link
              to="/app/dashboard"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Voltar ao dashboard
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
