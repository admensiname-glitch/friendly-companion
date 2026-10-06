import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface StudentDiscipline {
  id: string;
  discipline_name: string;
  course: string;
  created_at: string;
}

interface CourseDiscipline {
  id: string;
  name: string;
  description: string | null;
  course_id: string;
  course_name: string;
  curriculum_order?: number | null;
}

interface CourseGroup {
  name: string;
  disciplines: CourseDiscipline[];
}

function Icon({ name, className = "" }: { name: "book" | "arrow" | "chevron"; className?: string }) {
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
    chevron: <path d="m7 10 5 5 5-5" />,
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

function DisciplineRow({
  discipline,
  selected,
}: {
  discipline: CourseDiscipline;
  selected: boolean;
}) {
  return (
    <Link
      to="/app/disciplinas/$disciplineId"
      params={{ disciplineId: discipline.id }}
      className="group flex items-center gap-4 border-b border-[#E4EAF1] px-4 py-4 last:border-b-0 dark:border-[#2B3A4F]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0F5FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]">
        <Icon name="book" className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[15px] font-bold text-[#273547] dark:text-[#E0E8F1]">
            {discipline.name}
          </h3>
          {selected && (
            <span className="rounded-full bg-[#EAF1FF] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#0242D7] dark:bg-[#172B48] dark:text-[#7DB0FF]">
              Minha disciplina
            </span>
          )}
        </div>
        {discipline.description && (
          <p className="mt-1 line-clamp-1 text-xs text-[#7A8796] dark:text-[#8B9CAF]">
            {discipline.description}
          </p>
        )}
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#0242D7] transition-transform group-hover:translate-x-0.5 dark:text-[#7DB0FF]">
        Estudar
        <Icon name="arrow" className="h-4 w-4" />
      </span>
    </Link>
  );
}

function DisciplinesPage() {
  const matchRoute = useMatchRoute();
  const hasChildRoute = Boolean(matchRoute({ to: "/app/disciplinas/$disciplineId", fuzzy: true }));
  const [studentDisciplines, setStudentDisciplines] = useState<StudentDiscipline[]>([]);
  const [courseDisciplines, setCourseDisciplines] = useState<CourseDiscipline[]>([]);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          if (!cancelled) {
            setError("Sessão não encontrada.");
            setLoading(false);
          }
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("student_disciplines")
          .select("id, discipline_name, course, created_at")
          .eq("user_id", sessionData.session.user.id)
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        const rows = (data as StudentDiscipline[]) ?? [];
        if (cancelled) return;
        setStudentDisciplines(rows);

        const courseNames = [...new Set(rows.map((row) => row.course?.trim()).filter(Boolean))];
        if (courseNames.length === 0) {
          setLoading(false);
          return;
        }

        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("id,name")
          .in("name", courseNames);

        if (coursesError) throw coursesError;

        const courseIds = (courses ?? []).map((course) => course.id);
        if (courseIds.length === 0) {
          setLoading(false);
          return;
        }

        const { data: disciplines, error: disciplinesError } = await supabase
          .from("disciplines")
          .select("id,name,description,course_id,curriculum_order,courses(name)")
          .in("course_id", courseIds)
          .eq("published", true)
          .order("curriculum_order", { ascending: true, nullsFirst: false })
          .order("name", { ascending: true });

        if (disciplinesError) throw disciplinesError;

        if (!cancelled) {
          setCourseDisciplines(
            ((disciplines ?? []) as Array<Omit<CourseDiscipline, "course_name"> & { courses?: { name: string } | null }>)
              .map((discipline) => ({
                ...discipline,
                course_name: discipline.courses?.name ?? "Curso",
              })),
          );
          setLoading(false);
        }
      } catch (caughtError) {
        console.error("Falha ao carregar cursos e disciplinas", caughtError);
        if (!cancelled) {
          setError("Não foi possível carregar seus cursos e disciplinas.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const courseGroups = useMemo<CourseGroup[]>(() => {
    const grouped = new Map<string, CourseDiscipline[]>();

    for (const discipline of courseDisciplines) {
      const current = grouped.get(discipline.course_name) ?? [];
      current.push(discipline);
      grouped.set(discipline.course_name, current);
    }

    for (const studentDiscipline of studentDisciplines) {
      const courseName = studentDiscipline.course?.trim();
      if (courseName && !grouped.has(courseName)) grouped.set(courseName, []);
    }

    return [...grouped.entries()].map(([name, disciplines]) => ({ name, disciplines }));
  }, [courseDisciplines, studentDisciplines]);

  const selectedNames = useMemo(
    () => new Set(studentDisciplines.map((discipline) => discipline.discipline_name.trim().toLowerCase())),
    [studentDisciplines],
  );

  if (hasChildRoute) return <Outlet />;

  return (
    <section aria-labelledby="disciplines-title" className="app-native-screen max-w-5xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">Seu percurso</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="disciplines-title" className="text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]">
              Disciplinas
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
              Primeiro escolha o seu curso. Depois, dentro dele, escolha a disciplina que você está estudando agora.
            </p>
          </div>
          <Link to="/app/catalogo" className="text-sm font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]">
            Explorar catálogo
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="mt-5 divide-y divide-[#E4EAF1] border-y border-[#E4EAF1] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B] dark:border-[#71333A] dark:bg-[#321A1F] dark:text-[#FCA5A5]" role="alert">
          {error}
        </div>
      ) : courseGroups.length === 0 ? (
        <div className="mt-8 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0F5FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]">
            <Icon name="book" className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#253447] dark:text-[#E0E8F1]">Nenhum curso encontrado</h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[#7A8796] dark:text-[#96A6B8]">
            Configure seu curso no seu perfil para começar seu percurso.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {courseGroups.map((course) => {
            const isOpen = openCourse === course.name;

            return (
              <div key={course.name} className="overflow-hidden rounded-2xl border border-[#DCE5F0] bg-white dark:border-[#2B3A4F] dark:bg-[#172437]">
                <button
                  type="button"
                  onClick={() => setOpenCourse(isOpen ? null : course.name)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1D2B3E]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7] dark:bg-[#172B48] dark:text-[#7DB0FF]">
                    <Icon name="book" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-extrabold uppercase tracking-[0.1em] text-[#8A96A5] dark:text-[#8797AA]">Curso</span>
                    <span className="mt-1 block text-lg font-extrabold tracking-[-0.02em] text-[#172334] dark:text-[#E7EDF5]">{course.name}</span>
                    <span className="mt-1 block text-sm text-[#718093] dark:text-[#95A6B8]">
                      {course.disciplines.length > 0 ? course.disciplines.length + " disciplinas disponíveis" : "Nenhuma disciplina publicada encontrada"}
                    </span>
                  </span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F7FB] text-[#64748B] transition-transform dark:bg-[#1E2B3E] dark:text-[#AAB7C7]">
                    <Icon name="chevron" className={"h-5 w-5 transition-transform " + (isOpen ? "rotate-180" : "")} />
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-[#E4EAF1] dark:border-[#2B3A4F]">
                    <div className="px-5 pb-3 pt-5">
                      <p className="text-sm font-bold text-[#273547] dark:text-[#E0E8F1]">Qual disciplina você está estudando agora?</p>
                      <p className="mt-1 text-xs leading-5 text-[#7A8796] dark:text-[#8B9CAF]">
                        Escolha uma matéria para ir direto aos tópicos e continuar seu estudo.
                      </p>
                    </div>
                    {course.disciplines.length > 0 ? (
                      <div className="border-t border-[#E4EAF1] dark:border-[#2B3A4F]">
                        {course.disciplines.map((discipline) => (
                          <DisciplineRow
                            key={discipline.id}
                            discipline={discipline}
                            selected={selectedNames.has(discipline.name.trim().toLowerCase())}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 pb-5 text-sm text-[#7A8796] dark:text-[#96A6B8]">
                        Ainda não há disciplinas publicadas para este curso.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
