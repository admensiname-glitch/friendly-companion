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

interface Material {
  id: string;
  topic_id: string;
  title: string;
  introduction: string | null;
  status: string;
}

interface MaterialSection {
  id: string;
  material_id: string;
  title: string;
  content: string;
  position: number;
}

interface Source {
  id: string;
  title: string;
  authors: { name: string }[];
  publication_date: string | null;
  doi: string | null;
  canonical_url: string | null;
}

interface MaterialCitation {
  id: string;
  material_id: string;
  source_id: string;
  citation_label: string | null;
  locator: string | null;
  source?: Source;
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

// ─── Content placeholder (no material yet) ─────────────────────────────────────

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
        O conteúdo deste tópico será disponibilizado aqui.
      </p>
    </div>
  );
}

// ─── Material section ────────────────────────────────────────────────────────

function MaterialSectionItem({ section }: { section: MaterialSection }) {
  return (
    <section aria-labelledby={`section-${section.id}`} className="mt-8">
      <h3
        id={`section-${section.id}`}
        className="text-xl font-semibold text-[#0F172A]"
      >
        {section.title}
      </h3>
      <div className="mt-3 space-y-3 text-base leading-7 text-[#334155]">
        {section.content.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}

// ─── Sources section ──────────────────────────────────────────────────────────

function SourcesSection({ citations }: { citations: MaterialCitation[] }) {
  // Collect unique sources
  const uniqueSources = citations.filter((c) => c.source).reduce<(MaterialCitation & { source: Source })[]>((acc, cit) => {
    if (cit.source && !acc.some((s) => s.source.id === cit.source!.id)) {
      acc.push(cit as MaterialCitation & { source: Source });
    }
    return acc;
  }, []);

  if (uniqueSources.length === 0) return null;

  return (
    <section aria-labelledby="sources-heading" className="mt-12">
      <h2
        id="sources-heading"
        className="text-lg font-semibold text-[#0F172A]"
      >
        Fontes utilizadas
      </h2>
      <div className="mt-4 space-y-4">
        {uniqueSources.map((cit) => {
          const src = cit.source;
          const year = src.publication_date ? new Date(src.publication_date).getFullYear().toString() : null;
          return (
            <div key={src.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <p className="text-sm font-medium text-[#0F172A]">{src.title}</p>
              {src.authors && src.authors.length > 0 && (
                <p className="mt-1 text-sm text-[#64748B]">
                  {src.authors.map((a) => a.name).join("; ")}
                  {year ? ` (${year})` : ""}
                </p>
              )}
              {cit.locator && (
                <p className="mt-1 text-xs text-[#94A3B8]">{cit.locator}</p>
              )}
              {src.canonical_url && (
                <a
                  href={src.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-[#0242D7] hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
                >
                  Ver fonte original →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
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
  const [material, setMaterial] = useState<Material | null>(null);
  const [sections, setSections] = useState<MaterialSection[]>([]);
  const [citations, setCitations] = useState<MaterialCitation[]>([]);
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
      setMaterial(null);
      setSections([]);
      setCitations([]);

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

      // Step 5: Fetch published material using the resolved topic.id (NOT topicId from URL)
      const { data: materialData, error: materialError } = await supabase
        .from("materials")
        .select("id, topic_id, title, introduction, status")
        .eq("topic_id", (topicData as TopicDetail).id)
        .eq("status", "published")
        .maybeSingle();

      if (!materialError && materialData) {
        const mat = materialData as Material;
        setMaterial(mat);

        // Step 6: Fetch sections ordered by position
        const { data: sectionsData } = await supabase
          .from("material_sections")
          .select("id, material_id, title, content, position")
          .eq("material_id", mat.id)
          .order("position", { ascending: true });

        setSections((sectionsData as MaterialSection[]) ?? []);

        // Step 7: Fetch citations with source data
        const { data: citationsData } = await supabase
          .from("material_citations")
          .select("id, material_id, source_id, citation_label, locator")
          .eq("material_id", mat.id);

        const rawCitations = (citationsData ?? []) as MaterialCitation[];

        // Step 8: Enrich citations with source info
        if (rawCitations.length > 0) {
          const sourceIds = rawCitations.map((c) => c.source_id);
          const { data: sourcesData } = await supabase
            .from("sources")
            .select("id, title, authors, publication_date, doi, canonical_url")
            .in("id", sourceIds);

          const sourcesMap: Record<string, Source> = {};
          (sourcesData ?? []).forEach((src) => {
            sourcesMap[src.id] = src as Source;
          });

          const enrichedCitations = rawCitations.map((cit) => ({
            ...cit,
            source: sourcesMap[cit.source_id],
          }));

          setCitations(enrichedCitations);
        }
      }

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

          {/* ── Material or placeholder ── */}
          {material ? (
            <article aria-labelledby="material-heading" className="mt-8">
              <h2
                id="material-heading"
                className="text-2xl font-bold text-[#0F172A]"
              >
                {material.title}
              </h2>

              {material.introduction && (
                <p className="mt-3 max-w-2xl text-base leading-7 italic text-[#475569]">
                  {material.introduction}
                </p>
              )}

              {/* Sections */}
              {sections.map((section) => (
                <MaterialSectionItem key={section.id} section={section} />
              ))}

              {/* Sources */}
              <SourcesSection citations={citations} />
            </article>
          ) : (
            <ContentPlaceholder />
          )}

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
