import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Course {
  id: string;
  name: string;
  slug: string;
}
interface Discipline {
  id: string;
  name: string;
  description: string | null;
  course_id: string;
  course_name?: string;
  curriculum_order?: number | null;
  reference_semester?: number | null;
  curriculum_area?: string | null;
}
interface Topic {
  id: string;
  name: string;
  description: string | null;
  position: number;
  discipline_id?: string;
  discipline_name?: string;
  course_name?: string;
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
  const matchRoute = useMatchRoute();
  const hasDisciplineChild = Boolean(matchRoute({ to: "/app/catalogo/$disciplineId" }));
  const [courses, setCourses] = useState<Course[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topicResults, setTopicResults] = useState<Topic[]>([]);
  const [searchingTopics, setSearchingTopics] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id,name,slug")
          .eq("published", true)
          .order("name", { ascending: true });

        if (error) throw error;
        if (cancelled) return;
        setCourses((data ?? []) as Course[]);
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

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    if (!normalized) return courses;
    return courses.filter((course) => course.name.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").includes(normalized));
  }, [courses, query]);

mport { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Course {
  id: string;
  name: string;
  slug: string;
}
interface Discipline {
  id: string;
  name: string;
  description: string | null;
  course_id: string;
  course_name?: string;
  curriculum_order?: number | null;
  reference_semester?: number | null;
  curriculum_area?: string | null;
}
interface Topic {
  id: string;
  name: string;
  description: string | null;
  position: number;
  discipline_id?: string;
  discipline_name?: string;
  course_name?: string;
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
  const matchRoute = useMatchRoute();
  const hasDisciplineChild = Boolean(matchRoute({ to: "/app/catalogo/$disciplineId" }));
  const [courses, setCourses] = useState<Course[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topicResults, setTopicResults] = useState<Topic[]>([]);
  const [searchingTopics, setSearchingTopics] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id,name,slug")
          .eq("published", true)
          .order("name", { ascending: true });

        if (error) throw error;
        if (cancelled) return;
        setCourses((data ?? []) as Course[]);
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

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    if (!normalized) return courses;
    return courses.filter((course) => course.name.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").includes(normalized));
  }, [courses, query]);

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

  if (hasDisciplineChild) {
    return <Outlet />;
  }

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
    <section aria-labelledby="catalog-title" className="app-native-screen max-w-5xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">Catálogo</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="catalog-title" className="text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]">Cursos disponíveis</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">Explore os cursos disponíveis. Depois de escolher um curso, você poderá selecionar as disciplinas que deseja estudar.</p>
          </div>
          <Link to="/app/disciplinas" className="text-sm font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]">Ir para Meus cursos</Link>
        </div>
      </header>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-[#E4EAF1] dark:border-[#2B3A4F]" />)}</div>
      ) : courses.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] p-6 text-sm text-[#667487] dark:border-[#2B3A4F] dark:bg-[#111B2A] dark:text-[#AAB7C7]">Nenhum curso publicado no momento.</div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <Link key={course.id} to="/app/disciplinas" className="group rounded-2xl border border-[#DCE5F0] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#0242D7] hover:shadow-sm dark:border-[#2B3A4F] dark:bg-[#111B2A]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]"><Icon name="book" className="h-5 w-5" /></span>
              <h2 className="mt-5 text-xl font-bold text-[#273547] dark:text-[#E0E8F1]">{course.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#718093] dark:text-[#95A6B8]">Escolher disciplinas para estudar</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0242D7] dark:text-[#7DB0FF]">Escolher curso <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

