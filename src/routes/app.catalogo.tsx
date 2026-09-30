import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Discipline {
  id: string;
  name: string;
  description: string | null;
  course_id: string;
  course_name?: string;
}

interface Topic {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

export const Route = createFileRoute("/app/catalogo")({
  component: CatalogPage,
});

function CatalogPage() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("disciplines")
          .select("id, name, description, course_id, courses(name)")
          .eq("published", true)
          .order("name", { ascending: true });

        if (error) throw error;

        if (cancelled) return;

        const rows = (data ?? []) as Array<Discipline & { courses?: { name: string } | null }>;
        setDisciplines(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            course_id: row.course_id,
            course_name: row.courses?.name ?? "Curso",
          })),
        );
      } catch (error) {
        console.error("Falha ao carregar catálogo", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDiscipline) {
      setTopics([]);
      setTopicsError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      setTopicsLoading(true);
      setTopicsError(null);

      try {
        const { data, error } = await supabase
          .from("topics")
          .select("id, name, description, position")
          .eq("discipline_id", selectedDiscipline.id)
          .eq("published", true)
          .order("position", { ascending: true });

        if (error) throw error;

        if (!cancelled) setTopics((data ?? []) as Topic[]);
      } catch (error) {
        console.error("Falha ao carregar tópicos do catálogo", error);
        if (!cancelled) setTopicsError("Não foi possível carregar os tópicos desta disciplina.");
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDiscipline]);

  const filteredDisciplines = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "");

    if (!normalizedQuery) return disciplines;

    return disciplines.filter((discipline) => {
      const haystack = (discipline.name + " " + (discipline.course_name ?? ""))
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "");

      return haystack.includes(normalizedQuery);
    });
  }, [disciplines, query]);

  if (selectedDiscipline) {
    return (
      <section aria-labelledby="catalog-discipline-title">
        <button
          type="button"
          onClick={() => setSelectedDiscipline(null)}
          className="text-sm font-medium text-[#64748B] hover:text-[#0242D7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
        >
          ← Catálogo
        </button>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">Disciplina</p>
          <h1
            id="catalog-discipline-title"
            className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#0F172A]"
          >
            {selectedDiscipline.name}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#64748B]">
            {selectedDiscipline.description ?? "Explore os tópicos publicados desta disciplina."}
          </p>
        </div>

        {topicsLoading ? (
          <div className="mt-8 space-y-3" aria-busy="true">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]"
              />
            ))}
          </div>
        ) : topicsError ? (
          <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8">
            <p className="font-semibold text-[#0F172A]">{topicsError}</p>
            <button
              type="button"
              onClick={() => setSelectedDiscipline({ ...selectedDiscipline })}
              className="mt-4 text-sm font-semibold text-[#0242D7] hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : topics.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8">
            <p className="font-semibold text-[#0F172A]">Esta disciplina ainda não possui tópicos publicados.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                to="/app/disciplinas/$disciplineId/$topicId"
                params={{ disciplineId: selectedDiscipline.id, topicId: topic.id }}
                className="block rounded-xl border border-[#E2E8F0] bg-white p-5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
              >
                <p className="font-semibold text-[#0F172A]">{topic.name}</p>
                {topic.description && (
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">{topic.description}</p>
                )}
                <span className="mt-3 inline-block text-sm font-semibold text-[#0242D7]">
                  Estudar tópico →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="catalog-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Conhecimento global
      </p>
      <h1
        id="catalog-title"
        className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
      >
        Catálogo de disciplinas
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        Explore conteúdos publicados pelo Ensina-me, mesmo que eles ainda não façam parte das suas disciplinas atuais.
      </p>

      <div className="mt-6 max-w-xl">
        <label htmlFor="catalog-search" className="text-sm font-medium text-[#334155]">
          Buscar disciplina
        </label>
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: alfabetização, didática..."
          className="mt-2 w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#334155] outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/20"
        />
      </div>

      {loading ? (
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]"
            />
          ))}
        </div>
      ) : disciplines.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
          <p className="font-semibold text-[#0F172A]">Nenhuma disciplina publicada ainda.</p>
        </div>
      ) : filteredDisciplines.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
          <p className="font-semibold text-[#0F172A]">Nenhuma disciplina encontrada.</p>
          <p className="mt-2 text-sm text-[#64748B]">Tente outro termo de busca.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {filteredDisciplines.map((discipline) => (
            <button
              key={discipline.id}
              type="button"
              onClick={() => setSelectedDiscipline(discipline)}
              className="block w-full rounded-xl border border-[#E2E8F0] bg-white p-6 text-left hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
                {discipline.course_name}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#0F172A]">{discipline.name}</h2>
              {discipline.description && (
                <p className="mt-2 text-sm leading-6 text-[#64748B]">{discipline.description}</p>
              )}
              <span className="mt-4 inline-block text-sm font-semibold text-[#0242D7]">Explorar →</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
