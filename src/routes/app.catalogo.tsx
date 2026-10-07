import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Course {
  id: string;
  name: string;
  slug: string;
}

export const Route = createFileRoute("/app/catalogo")({
  component: CatalogPage,
});

function Icon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 4.5v17" />
      <path d="M9 6h7" />
    </svg>
  );
}

function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id,name,slug")
        .eq("published", true)
        .order("name", { ascending: true });
      if (!cancelled) {
        setCourses((data ?? []) as Course[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredCourses = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((course) => course.name.toLowerCase().includes(term));
  }, [courses, query]);

  return (
    <section aria-labelledby="catalog-title" className="max-w-6xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">Catálogo</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="catalog-title" className="text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]">
              Cursos disponíveis
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
              Aqui você encontra os cursos disponíveis no Ensina-me. Escolha um curso e, dentro dele, selecione as disciplinas que deseja estudar.
            </p>
          </div>
          <Link to="/app/disciplinas" className="text-sm font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]">
            Ir para Meus cursos
          </Link>
        </div>
      </header>

      <div className="mt-6 max-w-xl">
        <label htmlFor="course-search" className="sr-only">Buscar curso</label>
        <input
          id="course-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar curso..."
          className="w-full rounded-xl border border-[#DCE5F0] bg-white px-4 py-3 text-sm text-[#273547] outline-none focus:border-[#0242D7] dark:border-[#2B3A4F] dark:bg-[#111B2A] dark:text-[#E7EDF5]"
        />
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl border border-[#E4EAF1] dark:border-[#2B3A4F]" />)}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] p-6 text-sm text-[#667487] dark:border-[#2B3A4F] dark:bg-[#111B2A] dark:text-[#AAB7C7]">
          {courses.length === 0 ? "Nenhum curso publicado no momento." : "Nenhum curso encontrado para essa busca."}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <Link
              key={course.id}
              to="/app/disciplinas"
              className="group rounded-2xl border border-[#DCE5F0] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#0242D7] hover:shadow-sm dark:border-[#2B3A4F] dark:bg-[#111B2A]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-xl font-bold text-[#273547] dark:text-[#E0E8F1]">{course.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#718093] dark:text-[#95A6B8]">Escolher disciplinas para estudar</p>
              <span className="mt-5 inline-flex text-sm font-bold text-[#0242D7] dark:text-[#7DB0FF]">Escolher curso →</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
