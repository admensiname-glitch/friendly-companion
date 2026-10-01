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

function Icon({ name, className = "" }: { name: "search" | "book" | "arrow" | "back" | "spark"; className?: string }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 4.5v17" /><path d="M9 6h7" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 4 .7 2 2 .7-.2.7-2 .7-2-.7 2-.7z" /></>,
  } as const;

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}

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
          .select("id,name,description,course_id,courses(name)")
          .eq("published", true)
          .order("name", { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const rows = (data ?? []) as Array<
          Discipline & { courses?: { name: string } | null }
        >;

        setDisciplines(
          rows.map((row) => ({
            ...row,
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
          .select("id,name,description,position")
          .eq("discipline_id", selectedDiscipline.id)
          .eq("published", true)
          .order("position", { ascending: true });

        if (error) throw error;
        if (!cancelled) setTopics((data ?? []) as Topic[]);
      } catch (error) {
        console.error("Falha ao carregar tópicos do catálogo", error);
        if (!cancelled) {
          setTopicsError("Não foi possível carregar os tópicos desta disciplina.");
        }
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDiscipline]);

  const filteredDisciplines = useMemo(() => {
    const normalized = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (!normalized) return disciplines;

    return disciplines.filter((discipline) =>
      (discipline.name + " " + (discipline.course_name ?? ""))
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(normalized),
    );
  }, [disciplines, query]);

  if (selectedDiscipline) {
    return (
      <section aria-labelledby="catalog-discipline-title" className="max-w-4xl">
        <button
          type="button"
          onClick={() => setSelectedDiscipline(null)}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#667487] hover:text-[#0242D7] dark:text-[#9AA9BA] dark:hover:text-[#7DB0FF]"
        >
          <Icon name="back" className="h-4 w-4" />
          Catálogo
        </button>

        <header className="mt-6 border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
          <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
            {selectedDiscipline.course_name}
          </p>
          <h1
            id="catalog-discipline-title"
            className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[38px]"
          >
            {selectedDiscipline.name}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
            {selectedDiscipline.description ??
              "Explore os tópicos publicados desta disciplina."}
          </p>
        </header>

        <div className="mt-8">
          <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
            Percurso
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]">
            Tópicos para explorar
          </h2>
        </div>

        {topicsLoading ? (
          <div className="mt-4 divide-y divide-[#E4EAF1] border-y border-[#E4EAF1] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-20 animate-pulse" />
            ))}
          </div>
        ) : topicsError ? (
          <div className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B] dark:border-[#71333A] dark:bg-[#321A1F] dark:text-[#FCA5A5]">
            {topicsError}
          </div>
        ) : topics.length === 0 ? (
          <div className="mt-5 py-7 text-sm text-[#7A8796] dark:text-[#96A6B8]">
            Esta disciplina ainda não possui tópicos publicados.
          </div>
        ) : (
          <div className="mt-4 border-y border-[#E4EAF1] dark:border-[#2B3A4F]">
            {topics.map((topic, index) => (
              <Link
                key={topic.id}
                to="/app/disciplinas/$disciplineId/$topicId"
                params={{
                  disciplineId: selectedDiscipline.id,
                  topicId: topic.id,
                }}
                className="group grid gap-3 border-b border-[#E4EAF1] py-5 last:border-b-0 dark:border-[#2B3A4F] sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D7E2EF] text-xs font-bold text-[#728196] dark:border-[#344A63] dark:text-[#8EA1B5]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-[#273547] dark:text-[#DFE8F1]">
                    {topic.name}
                  </h3>
                  {topic.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7A8796] dark:text-[#8B9CAF]">
                      {topic.description}
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0242D7] transition-transform group-hover:translate-x-0.5 dark:text-[#7DB0FF]">
                  Abrir
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="catalog-title" className="max-w-5xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
          Biblioteca de aprendizagem
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              id="catalog-title"
              className="text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]"
            >
              Catálogo
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
              Explore conteúdos publicados pelo Ensina-me, inclusive fora das suas disciplinas atuais.
            </p>
          </div>
          <span className="text-sm font-semibold text-[#7B8795] dark:text-[#8FA0B2]">
            {disciplines.length} disciplinas
          </span>
        </div>
      </header>

      <label
        htmlFor="catalog-search"
        className="mt-5 flex max-w-2xl items-center gap-3 border-b border-[#BFD0E4] bg-transparent py-3 text-[#0242D7] dark:border-[#38506C]"
      >
        <Icon name="search" className="h-5 w-5 shrink-0" />
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por disciplina ou curso..."
          className="min-w-0 flex-1 bg-transparent text-sm text-[#243245] outline-none placeholder:text-[#96A3B3] dark:text-[#E1E9F2]"
        />
      </label>

      {loading ? (
        <div className="mt-6 divide-y divide-[#E4EAF1] border-y border-[#E4EAF1] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 animate-pulse" />
          ))}
        </div>
      ) : filteredDisciplines.length === 0 ? (
        <div className="mt-7 py-8">
          <p className="text-sm font-semibold text-[#344154] dark:text-[#DCE5EE]">
            {disciplines.length === 0
              ? "Nenhuma disciplina publicada ainda."
              : "Nenhuma disciplina encontrada."}
          </p>
          <p className="mt-1 text-sm text-[#7A8796] dark:text-[#96A6B8]">
            {disciplines.length > 0 ? "Tente outro termo de busca." : ""}
          </p>
        </div>
      ) : (
        <div className="mt-5 border-y border-[#E4EAF1] dark:border-[#2B3A4F]">
          {filteredDisciplines.map((discipline, index) => (
            <button
              key={discipline.id}
              type="button"
              onClick={() => setSelectedDiscipline(discipline)}
              className="group grid w-full gap-3 border-b border-[#E4EAF1] py-5 text-left last:border-b-0 dark:border-[#2B3A4F] sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D7E2EF] text-xs font-bold text-[#728196] dark:border-[#344A63] dark:text-[#8EA1B5]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#8A96A5] dark:text-[#8797AA]">
                  {discipline.course_name}
                </p>
                <h2 className="mt-1 text-[16px] font-bold text-[#273547] dark:text-[#E0E8F1]">
                  {discipline.name}
                </h2>
                <p className="mt-1 line-clamp-1 text-xs text-[#7A8796] dark:text-[#8B9CAF]">
                  {discipline.description ?? "Conteúdos organizados por tópicos."}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0242D7] transition-transform group-hover:translate-x-0.5 dark:text-[#7DB0FF]">
                Explorar
                <Icon name="arrow" className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-9 border-t border-[#E4EAF1] pt-6 dark:border-[#2B3A4F]">
        <Link
          to="/app/estude-agora"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]"
        >
          <Icon name="spark" className="h-4 w-4" />
          Estude agora com uma recomendação do Tutor
        </Link>
      </div>
    </section>
  );
}
