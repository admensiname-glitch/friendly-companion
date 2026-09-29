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

interface TopicDetail {
  id: string;
  name: string;
  description: string | null;
  discipline_id: string;
}

// ─── Normalization ─────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TopicSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="h-5 w-48 animate-pulse rounded-md bg-[#E2E8F0]" />
      <div className="h-8 w-72 animate-pulse rounded-md bg-[#E2E8F0]" />
      <div className="h-5 w-40 animate-pulse rounded-md bg-[#E2E8F0]" />
      <div className="mt-8 h-24 w-full animate-pulse rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC]" />
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
      <h2 className="mt-4 font-semibold text-[#0F172A]">Tópico não encontrado</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748B]">
        Este tópico não existe ou ainda não está disponível.
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
      Não foi possível carregar o tópico. Tente novamente.
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/disciplinas/$disciplineId/$topicId")({
  component: TopicDetailPage,
});

function TopicDetailPage() {
  const { disciplineId, topicId } = Route.useParams();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [disciplineName, setDisciplineName] = useState<string | null>(null);
  const [officialDisciplineId, setOfficialDisciplineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setNotFound(false);
      setError(false);
      setTopic(null);
      setDisciplineName(null);
      setOfficialDisciplineId(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;

      // Step 1: Load student's discipline from URL id
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

      const studentDisc = studentDiscData as StudentDiscipline;

      // Step 2: Normalize and look up alias
      const studentNameNorm = normalize(studentDisc.discipline_name);

      const { data: aliasData, error: aliasError } = await supabase
        .from("discipline_aliases")
        .select("discipline_id")
        .eq("normalized_alias", studentNameNorm);

      if (aliasError || !aliasData || aliasData.length !== 1) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const alias = aliasData[0] as DisciplineAlias;

      // Step 3: Verify official discipline exists and is published
      const { data: officialDiscData, error: officialError } = await supabase
        .from("disciplines")
        .select("id, name")
        .eq("id", alias.discipline_id)
        .eq("published", true)
        .maybeSingle();

      if (officialError || !officialDiscData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const official = officialDiscData as OfficialDiscipline;
      setDisciplineName(official.name);
      setOfficialDisciplineId(official.id);

      // Step 4: Fetch the topic using the official discipline id
      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .select("id, name, description, discipline_id")
        .eq("id", topicId)
        .eq("discipline_id", official.id)
        .eq("published", true)
        .maybeSingle();

      if (topicError) {
        setError(true);
        setLoading(false);
        return;
      }

      if (!topicData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTopic(topicData as TopicDetail);
      setLoading(false);
    };

    loadData();
  }, [disciplineId, topicId]);

  return (
    <section aria-labelledby="topic-title">
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
        <Link
          to="/app/disciplinas/$disciplineId"
          params={{ disciplineId }}
          className="hover:text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
        >
          {loading ? "..." : (disciplineName ?? "Disciplina")}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#0F172A]">
          {loading ? "..." : (topic?.name ?? "Tópico")}
        </span>
      </nav>

      {/* ── Header ── */}
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Tópico
      </p>

      {loading && <TopicSkeleton />}

      {!loading && error && <ErrorState />}

      {!loading && notFound && <NotFound />}

      {!loading && !error && !notFound && topic && officialDisciplineId && (
        <>
          <h1
            id="topic-title"
            className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
          >
            {topic.name}
          </h1>

          {disciplineName && (
            <p className="mt-2 text-base text-[#64748B]">
              <span className="font-medium">Disciplina:</span> {disciplineName}
            </p>
          )}

          {topic.description && (
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
              {topic.description}
            </p>
          )}

          {/* ── Content placeholder ── */}
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
            <h3 className="mt-4 font-semibold text-[#0F172A]">
              Conteúdo de aprendizagem
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748B]">
              O conteúdo deste tópico será disponibilizado aqui.
            </p>
          </div>

          {/* ── Navigation links ── */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/app/disciplinas/$disciplineId"
              params={{ disciplineId }}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Voltar para a disciplina
            </Link>
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
