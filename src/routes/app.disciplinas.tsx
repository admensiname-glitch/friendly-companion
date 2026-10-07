import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Course {
  id: string;
  name: string;
  description?: string | null;
}

interface CourseDiscipline {
  id: string;
  name: string;
  description: string | null;
}

export const Route = createFileRoute("/app/disciplinas")({
  component: DisciplinesPage,
});

function Icon({ name, className = "" }: { name: "book" | "arrow"; className?: string }) {
  const paths = {
    book: (
      <>
        <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
        <path d="M5 4.5v17" />
        <path d="M9 6h7" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
  } as const;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

function CourseRow({ course, onSelect }: { course: Course; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group grid w-full gap-4 border-b border-[#E4EAF1] py-6 text-left last:border-b-0 dark:border-[#2B3A4F] sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:items-center"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]">
        <Icon name="book" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[18px] font-bold text-[#273547] dark:text-[#E0E8F1]">{course.name}</h2>
        <p className="mt-1 text-sm text-[#718093] dark:text-[#95A6B8]">
          {course.description ?? "Explore o curso e encontre as disciplinas disponíveis."}
        </p>
      </div>
      <span className="inline-flex flex-col items-end gap-1 text-right">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[#0242D7] transition-transform group-hover:translate-x-0.5 dark:text-[#7DB0FF]">
          Ver disciplinas
          <Icon name="arrow" className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold text-[#64748B]">Curso no seu perfil</span>
      </span>
    </button>
  );
}

function DisciplinesPage() {
  const matchRoute = useMatchRoute();
  const hasChildRoute = Boolean(matchRoute({ to: "/app/disciplinas/$disciplineId", fuzzy: true }));
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseDisciplines, setCourseDisciplines] = useState<CourseDiscipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [disciplinesLoading, setDisciplinesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: memberships, error: membershipError } = await supabase
        .from("student_courses")
        .select("course_id")
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (membershipError) {
        setError("Não foi possível carregar seus cursos.");
        setCourses([]);
        setLoading(false);
        return;
      }

      const courseIds = (memberships ?? []).map((item) => item.course_id).filter(Boolean);
      if (courseIds.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      const { data, error: courseError } = await supabase
        .from("courses")
        .select("id, name")
        .in("id", courseIds)
        .eq("published", true)
        .order("name", { ascending: true });

      if (cancelled) return;
      if (courseError) setError("Não foi possível carregar seus cursos.");
      else setCourses((data as Course[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      setCourseDisciplines([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setDisciplinesLoading(true);
      const { data, error: fetchError } = await supabase
        .from("disciplines")
        .select("id, name, description")
        .eq("course_id", selectedCourse.id)
        .eq("published", true)
        .order("curriculum_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (cancelled) return;
      if (fetchError) setError("Não foi possível carregar as disciplinas deste curso.");
      else setCourseDisciplines((data as CourseDiscipline[]) ?? []);
      setDisciplinesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedCourse]);

  if (hasChildRoute) return <Outlet />;

  if (selectedCourse) {
    return (
      <section aria-labelledby="course-title" className="app-native-screen max-w-5xl">
        <button
          type="button"
          onClick={() => setSelectedCourse(null)}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#667487] hover:text-[#0242D7] dark:text-[#9AA9BA] dark:hover:text-[#7DB0FF]"
        >
          ← Meus cursos
        </button>
        <header className="mt-6 border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
          <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">Curso</p>
          <h1 id="course-title" className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]">
            {selectedCourse.name}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
            Escolha uma disciplina para entrar no percurso de estudos deste curso.
          </p>
        </header>
        {disciplinesLoading ? (
          <div className="mt-5 divide-y divide-[#E4EAF1] border-y border-[#E4EAF1] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B]" role="alert">{error}</div>
        ) : courseDisciplines.length === 0 ? (
          <div className="mt-8 py-8 text-sm text-[#7A8796]">Este curso ainda não possui disciplinas publicadas.</div>
        ) : (
          <div className="mt-5 border-y border-[#E4EAF1] dark:border-[#2B3A4F]">
            {courseDisciplines.map((discipline, index) => (
              <Link
                key={discipline.id}
                to="/app/disciplinas/$disciplineId"
                params={{ disciplineId: discipline.id }}
                className="group grid gap-3 border-b border-[#E4EAF1] py-5 last:border-b-0 dark:border-[#2B3A4F] sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D7E2EF] text-xs font-bold text-[#728196] dark:border-[#344A63] dark:text-[#8EA1B5]">{index + 1}</span>
                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold text-[#273547] dark:text-[#E0E8F1]">{discipline.name}</h2>
                  {discipline.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#7A8796] dark:text-[#8B9CAF]">{discipline.description}</p>}
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-[#0242D7] dark:text-[#7DB0FF]">Estudar <Icon name="arrow" className="h-4 w-4" /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="courses-title" className="app-native-screen max-w-5xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">Seu percurso</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="courses-title" className="text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]">Meus cursos</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">Estes são os cursos que você escolheu ter no seu perfil. A partir deles, o Ensina-me usa suas disciplinas e seu desempenho para personalizar recomendações.</p>
          </div>
          <Link to="/app/catalogo" className="text-sm font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]">Explorar catálogo</Link>
        </div>
      </header>
      {loading ? (
        <div className="mt-5 divide-y divide-[#E4EAF1] border-y border-[#E4EAF1] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">{[1,2,3].map(item => <div key={item} className="h-24 animate-pulse" />)}</div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B]" role="alert">{error}</div>
      ) : courses.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] p-6 dark:border-[#2B3A4F] dark:bg-[#111B2A]">
          <h2 className="text-lg font-bold text-[#253447] dark:text-[#E0E8F1]">Você ainda não adicionou nenhum curso</h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[#7A8796] dark:text-[#96A6B8]">Explore o catálogo, escolha um curso e adicione-o ao seu perfil. Você pode ter mais de um curso no seu percurso.</p>
          <Link to="/app/catalogo" className="mt-4 inline-flex rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-black text-white">Explorar cursos</Link>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map(course => (
            <CourseRow key={course.id} course={course} onSelect={() => setSelectedCourse(course)} />
          ))}
        </div>
      )}
    </section>
  );
}
