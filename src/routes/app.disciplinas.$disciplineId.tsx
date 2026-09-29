import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentDiscipline {
  id: string;
  discipline_name: string;
  course: string;
}

interface DisciplineAlias {
  discipline_id: string;
}

interface OfficialDiscipline {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748B]">
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

// ─── Catalog not linked ────────────────────────────────────────────────────────

function CatalogNotLinked() {
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
      <h2 className="mt-4 font-semibold text-[#0F172A]">Catálogo não vinculado</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748B]">
        Esta disciplina ainda não está vinculada ao catálogo acadêmico oficial.
      </p>
    </div>
  );
}

// ─── Topics list ───────────────────────────────────────────────────────────────

function TopicsList({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return (
      <div className="mt-6 rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center text-sm text-[#64748B]">
        Tópicos ainda não cadastrados.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-sm font-semibold text-[#0F172A]">Tópicos</h2>
      <div className="space-y-2">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="rounded-lg border border-[#E2E8F0] bg-white p-4"
          >
            <p className="font-medium text-[#0F172A]">{topic.name}</p>
            {topic.description && (
              <p className="mt-1 text-sm text-[#64748B]">{topic.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Content placeholder ────────────────────────────────────────────────────────

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
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748B]">
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
  const [studentDisc, setStudentDisc] = useState<StudentDiscipline | null>(null);
  const [officialDiscName, setOfficialDiscName] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [catalogLinked, setCatalogLinked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setNotFound(false);
      setError(false);
      setCatalogLinked(null);
      setTopics([]);
      setOfficialDiscName(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;

      // Step 1: Load student's discipline
      const { data: studentDiscData, error: studentDiscError } = await supabase
        .from("student_disciplines")
        .select("id, discipline_name, course")
        .eq("id", disciplineId)
        .eq("user_id", userId)
        .maybeSingle();

      if (studentDiscError) {
        setError(true);
        setLoading(false);
        return;
      }

      if (!studentDiscData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setStudentDisc(studentDiscData as StudentDiscipline);

      // Step 2: Normalize the student's discipline name and look up an alias
      const studentNameNorm = normalize(studentDiscData.discipline_name);

      // Look for exactly one matching alias
      const { data: aliasData, error: aliasError } = await supabase
        .from("discipline_aliases")
        .select("discipline_id")
        .eq("normalized_alias", studentNameNorm);

      if (aliasError || !aliasData || aliasData.length === 0) {
        setCatalogLinked(false);
        setLoading(false);
        return;
      }

      // Accept only exactly one match
      if (aliasData.length !== 1) {
        setCatalogLinked(false);
        setLoading(false);
        return;
      }

      const alias = aliasData[0] as DisciplineAlias;

      // Step 3: Verify the referenced discipline exists and is published
      const { data: officialDiscData, error: officialError } = await supabase
        .from("disciplines")
        .select("id, name")
        .eq("id", alias.discipline_id)
        .eq("published", true)
        .maybeSingle();

      if (officialError || !officialDiscData) {
        setCatalogLinked(false);
        setLoading(false);
        return;
      }

      const official = officialDiscData as OfficialDiscipline;
      setOfficialDiscName(official.name);
      setCatalogLinked(true);

      // Step 4: Load published topics from the official discipline
      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("id, name, description, position")
        .eq("discipline_id", official.id)
        .eq("published", true)
        .order("position", { ascending: true });

      if (topicsError) {
        setTopics([]);
        setLoading(false);
        return;
      }

      setTopics((topicsData as Topic[]) ?? []);
      setLoading(false);
    };

    loadData();
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
          {loading ? "..." : (officialDiscName ?? studentDisc?.discipline_name ?? "Disciplina")}
        </span>
      </nav>

      {/* ── Header ── */}
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Disciplina
      </p>

      {loading && <DisciplineSkeleton />}

      {!loading && error && <ErrorState />}

      {!loading && notFound && <NotFound />}

      {!loading && !error && !notFound && studentDisc && (
        <>
          <h1
            id="discipline-title"
            className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
          >
            {officialDiscName ?? studentDisc.discipline_name}
          </h1>

          <p className="mt-2 text-base text-[#64748B]">
            <span className="font-medium">Curso:</span>
            {" "}
            {studentDisc.course}
          </p>

          {catalogLinked === false && <CatalogNotLinked />}

          {catalogLinked === true && (
            <>
              <TopicsList topics={topics} />
              <ContentPlaceholder />
            </>
          )}

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
