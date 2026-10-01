import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface CourseOption {
  id: string;
  name: string;
}

interface DisciplineOption {
  id: string;
  name: string;
}

interface StudentDiscipline {
  id: string;
  discipline_name: string;
}

interface ProfileData {
  course_id: string | null;
  institution: string | null;
  semester: number | null;
  daily_study_minutes: number | null;
  difficulties: string[] | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export const Route = createFileRoute("/app/perfil")({
  component: ProfilePage,
});

function Icon({
  name,
  className = "",
}: {
  name: "back" | "book" | "clock" | "plus" | "close" | "logout" | "check";
  className?: string;
}) {
  const paths = {
    back: (
      <>
        <path d="M19 12H5" />
        <path d="m11 18-6-6 6-6" />
      </>
    ),
    book: (
      <>
        <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
        <path d="M5 4.5v17" />
        <path d="M9 6h7" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 4v16" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
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

function ProfilePage() {
  const navigate = useNavigate();

  const [name, setName] = useState("Aluno");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [disciplineOptions, setDisciplineOptions] = useState<
    DisciplineOption[]
  >([]);
  const [studentDisciplines, setStudentDisciplines] = useState<
    StudentDiscipline[]
  >([]);
  const [newDiscipline, setNewDiscipline] = useState("");
  const [loading, setLoading] = useState(true);
  const [disciplineLoading, setDisciplineLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingCourseRemoval, setPendingCourseRemoval] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  const loadProfileData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      await navigate({ to: "/login" });
      return;
    }

    const user = sessionData.session.user;
    const fullName =
      user.user_metadata?.full_name || user.user_metadata?.name;
    setName(fullName?.split(" ")[0] || "Aluno");
    setEmail(user.email || "");

    const [{ data: courseData }, { data: profileData }, { data: disciplineData }] =
      await Promise.all([
        supabase
          .from("courses")
          .select("id,name")
          .eq("published", true)
          .order("name", { ascending: true }),
        supabase
          .from("student_profiles")
          .select(
            "course_id,institution,semester,daily_study_minutes,difficulties",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("student_disciplines")
          .select("id,discipline_name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
      ]);

    setCourses((courseData ?? []) as CourseOption[]);
    setProfile(
      (profileData as ProfileData | null) ?? {
        course_id: null,
        institution: null,
        semester: null,
        daily_study_minutes: 60,
        difficulties: null,
      },
    );
    setStudentDisciplines((disciplineData ?? []) as StudentDiscipline[]);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    const courseId = profile?.course_id;

    if (!courseId) {
      setDisciplineOptions([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      setDisciplineLoading(true);

      const { data } = await supabase
        .from("disciplines")
        .select("id,name")
        .eq("course_id", courseId)
        .eq("published", true)
        .order("name", { ascending: true });

      if (!cancelled) {
        setDisciplineOptions((data ?? []) as DisciplineOption[]);
        setDisciplineLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.course_id]);

  const courseName =
    courses.find((course) => course.id === profile?.course_id)?.name ??
    "Nenhum curso selecionado";

  const studyTimeLabel = useMemo(() => {
    const minutes = profile?.daily_study_minutes ?? 0;

    if (!minutes) return "Não definida";
    if (minutes >= 60) {
      return (
        String(Math.floor(minutes / 60)) +
        "h" +
        (minutes % 60 ? " " + String(minutes % 60) + "min" : "")
      );
    }

    return String(minutes) + " min";
  }, [profile?.daily_study_minutes]);

  async function saveProfile(next: Partial<ProfileData>) {
    if (!profile) return;

    setSaveState("saving");
    setMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setSaveState("error");
      setMessage("Sua sessão expirou. Faça login novamente.");
      return;
    }

    const nextProfile = {
      ...profile,
      ...next,
    };

    const { error } = await supabase
      .from("student_profiles")
      .upsert(
        {
          user_id: sessionData.session.user.id,
          course_id: nextProfile.course_id,
          institution: nextProfile.institution || null,
          semester: nextProfile.semester,
          daily_study_minutes: nextProfile.daily_study_minutes ?? 60,
          difficulties: nextProfile.difficulties?.length
            ? nextProfile.difficulties
            : null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) {
      setSaveState("error");
      setMessage("Não foi possível salvar as alterações.");
      return;
    }

    setProfile(nextProfile);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1800);
  }

  async function changeCourse(courseId: string) {
    const nextCourseId = courseId || null;

    if (!nextCourseId) {
      setPendingCourseRemoval(true);
      return;
    }

    const { data: newDisciplines } = await supabase
      .from("disciplines")
      .select("id,name")
      .eq("course_id", nextCourseId)
      .eq("published", true)
      .order("name", { ascending: true });

    const availableNames = new Set(
      (newDisciplines ?? []).map((discipline) => discipline.name.toLowerCase()),
    );

    const kept = studentDisciplines.filter((discipline) =>
      availableNames.has(discipline.discipline_name.toLowerCase()),
    );

    const sessionResult = await supabase.auth.getSession();
    if (!sessionResult.data.session || !profile) return;

    setSaveState("saving");
    setMessage(null);

    const userId = sessionResult.data.session.user.id;

    const { error: profileError } = await supabase
      .from("student_profiles")
      .upsert(
        {
          user_id: userId,
          course_id: nextCourseId,
          institution: profile.institution || null,
          semester: profile.semester,
          daily_study_minutes: profile.daily_study_minutes ?? 60,
          difficulties: profile.difficulties?.length
            ? profile.difficulties
            : null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      setSaveState("error");
      setMessage("Não foi possível trocar o curso.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("student_disciplines")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      setSaveState("error");
      setMessage("O curso mudou, mas não foi possível atualizar as disciplinas.");
      await loadProfileData();
      return;
    }

    if (kept.length > 0) {
      const { error: insertError } = await supabase
        .from("student_disciplines")
        .insert(
          kept.map((discipline) => ({
            user_id: userId,
            discipline_name: discipline.discipline_name,
            course: courses.find((course) => course.id === nextCourseId)?.name ??
              "Curso",
          })),
        );

      if (insertError) {
        setSaveState("error");
        setMessage("O curso mudou, mas não foi possível preservar as disciplinas compatíveis.");
        await loadProfileData();
        return;
      }
    }

    setProfile((current) =>
      current ? { ...current, course_id: nextCourseId } : current,
    );
    setStudentDisciplines(kept);
    setSaveState("saved");
    setMessage(null);
    window.setTimeout(() => setSaveState("idle"), 1800);
  }

  async function confirmRemoveCourse() {
    const sessionResult = await supabase.auth.getSession();

    if (!sessionResult.data.session) {
      setSaveState("error");
      setMessage("Sua sessão expirou. Faça login novamente.");
      return;
    }

    const userId = sessionResult.data.session.user.id;
    setSaveState("saving");
    setMessage(null);

    const [{ error: profileError }, { error: disciplineError }] =
      await Promise.all([
        supabase
          .from("student_profiles")
          .update({
            course_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId),
        supabase
          .from("student_disciplines")
          .delete()
          .eq("user_id", userId),
      ]);

    if (profileError || disciplineError) {
      setSaveState("error");
      setMessage("Não foi possível remover o curso agora.");
      return;
    }

    setProfile((current) =>
      current ? { ...current, course_id: null } : current,
    );
    setStudentDisciplines([]);
    setPendingCourseRemoval(false);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1800);
  }

  async function addDiscipline() {
    const selected = disciplineOptions.find(
      (discipline) =>
        discipline.name.toLowerCase() === newDiscipline.trim().toLowerCase(),
    );

    if (!selected) {
      setMessage("Escolha uma disciplina disponível para adicionar.");
      setSaveState("error");
      return;
    }

    if (
      studentDisciplines.some(
        (discipline) =>
          discipline.discipline_name.toLowerCase() ===
          selected.name.toLowerCase(),
      )
    ) {
      setNewDiscipline("");
      return;
    }

    const sessionResult = await supabase.auth.getSession();
    if (!sessionResult.data.session || !profile) return;

    setSaveState("saving");
    setMessage(null);

    const { data, error } = await supabase
      .from("student_disciplines")
      .insert({
        user_id: sessionResult.data.session.user.id,
        discipline_name: selected.name,
        course: courseName,
      })
      .select("id,discipline_name")
      .single();

    if (error) {
      setSaveState("error");
      setMessage("Não foi possível adicionar a disciplina.");
      return;
    }

    setStudentDisciplines((current) => [...current, data as StudentDiscipline]);
    setNewDiscipline("");
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1800);
  }

  async function removeDiscipline(disciplineId: string) {
    setSaveState("saving");
    setMessage(null);

    const { error } = await supabase
      .from("student_disciplines")
      .delete()
      .eq("id", disciplineId);

    if (error) {
      setSaveState("error");
      setMessage("Não foi possível remover a disciplina.");
      return;
    }

    setStudentDisciplines((current) =>
      current.filter((discipline) => discipline.id !== disciplineId),
    );
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1800);
  }

  async function handleLogout() {
    if (logoutPending) return;
    setLogoutPending(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLogoutPending(false);
      setMessage("Não foi possível sair. Tente novamente.");
      return;
    }

    await navigate({ to: "/login" });
  }

  if (loading) {
    return (
      <section className="max-w-3xl space-y-5" aria-label="Carregando perfil">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#E7EDF4] dark:bg-[#1C293B]" />
        <div className="h-28 animate-pulse rounded-xl bg-[#E7EDF4] dark:bg-[#1C293B]" />
        <div className="h-48 animate-pulse rounded-xl bg-[#E7EDF4] dark:bg-[#1C293B]" />
      </section>
    );
  }

  return (
    <section aria-labelledby="profile-title" className="max-w-3xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <Link
          to="/app/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#667487] hover:text-[#0242D7] dark:text-[#9AA9BA] dark:hover:text-[#7DB0FF]"
        >
          <Icon name="back" className="h-4 w-4" />
          Início
        </Link>

        <p className="mt-7 text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
          Conta e preferências
        </p>
        <h1
          id="profile-title"
          className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]"
        >
          Meu perfil
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
          Ajuste seu percurso sempre que sua rotina ou semestre mudar.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0242D7] text-[11px] font-extrabold text-white">
            EM
          </div>
          <div>
            <p className="text-sm font-bold text-[#273547] dark:text-[#E0E8F1]">
              {name}
            </p>
            <p className="text-xs text-[#7A8796] dark:text-[#8B9CAF]">
              {email || "E-mail não informado"}
            </p>
          </div>
        </div>
      </header>

      {message && (
        <div
          className={
            saveState === "error"
              ? "mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B] dark:border-[#71333A] dark:bg-[#321A1F] dark:text-[#FCA5A5]"
              : "mt-5 rounded-xl border border-[#CDE6DA] bg-[#F3FAF6] px-4 py-3 text-sm text-[#176B4D] dark:border-[#27634E] dark:bg-[#132C23] dark:text-[#8ED6B4]"
          }
          role="status"
        >
          {message}
        </div>
      )}

      <section className="mt-7" aria-labelledby="academic-heading">
        <div className="mb-4">
          <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
            Seu contexto acadêmico
          </p>
          <h2
            id="academic-heading"
            className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
          >
            Curso e instituição
          </h2>
        </div>

        <div className="border-y border-[#DCE5F0] dark:border-[#2B3A4F]">
          <label className="block py-5">
            <span className="text-sm font-bold text-[#273547] dark:text-[#DFE8F1]">
              Curso
            </span>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <select
                value={profile?.course_id ?? ""}
                onChange={(event) => void changeCourse(event.target.value)}
                className="min-h-11 flex-1 rounded-lg border border-[#D3DEEA] bg-[#F8FAFC] px-3 text-sm text-[#273547] outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#D8E6FB] dark:border-[#34485E] dark:bg-[#182538] dark:text-[#E2EAF2] dark:focus:border-[#6EA6FF] dark:focus:ring-[#223B5B]"
              >
                <option value="">Nenhum curso selecionado</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>

              {profile?.course_id && (
                <button
                  type="button"
                  onClick={() => setPendingCourseRemoval(true)}
                  className="min-h-11 rounded-lg border border-[#DCE5F0] px-4 text-sm font-bold text-[#64748B] hover:border-[#F0C7C7] hover:text-[#B42318] dark:border-[#34485E] dark:text-[#A6B4C4] dark:hover:border-[#71333A] dark:hover:text-[#F0A3A3]"
                >
                  Remover curso
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-[#7A8796] dark:text-[#8999AB]">
              {courseName === "Nenhum curso selecionado"
                ? "Escolha um curso publicado no Ensina-me."
                : "Troque o curso quando mudar de graduação ou contexto acadêmico."}
            </p>
          </label>

          <div className="grid border-t border-[#E4EAF1] dark:border-[#2B3A4F] sm:grid-cols-2">
            <label className="border-b border-[#E4EAF1] py-5 sm:border-b-0 sm:border-r sm:pr-5 dark:border-[#2B3A4F]">
              <span className="text-sm font-bold text-[#273547] dark:text-[#DFE8F1]">
                Instituição
              </span>
              <input
                type="text"
                value={profile?.institution ?? ""}
                onChange={(event) =>
                  setProfile((current) =>
                    current
                      ? { ...current, institution: event.target.value }
                      : current,
                  )
                }
                onBlur={() =>
                  profile && void saveProfile({ institution: profile.institution })
                }
                placeholder="Opcional"
                className="mt-2 h-11 w-full rounded-lg border border-[#D3DEEA] bg-[#F8FAFC] px-3 text-sm text-[#273547] outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#D8E6FB] dark:border-[#34485E] dark:bg-[#182538] dark:text-[#E2EAF2] dark:focus:border-[#6EA6FF] dark:focus:ring-[#223B5B]"
              />
            </label>

            <label className="border-t border-[#E4EAF1] py-5 sm:border-t-0 sm:pl-5 dark:border-[#2B3A4F]">
              <span className="text-sm font-bold text-[#273547] dark:text-[#DFE8F1]">
                Período
              </span>
              <select
                value={profile?.semester ?? ""}
                onChange={(event) => {
                  const semester = event.target.value
                    ? Number(event.target.value)
                    : null;
                  setProfile((current) =>
                    current ? { ...current, semester } : current,
                  );
                  void saveProfile({ semester });
                }}
                className="mt-2 h-11 w-full rounded-lg border border-[#D3DEEA] bg-[#F8FAFC] px-3 text-sm text-[#273547] outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#D8E6FB] dark:border-[#34485E] dark:bg-[#182538] dark:text-[#E2EAF2] dark:focus:border-[#6EA6FF] dark:focus:ring-[#223B5B]"
              >
                <option value="">Não definido</option>
                {Array.from({ length: 20 }, (_, index) => index + 1).map(
                  (semester) => (
                    <option key={semester} value={semester}>
                      {semester}º período
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="disciplines-heading">
        <div className="mb-4">
          <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
            Seu percurso
          </p>
          <h2
            id="disciplines-heading"
            className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
          >
            Disciplinas
          </h2>
        </div>

        <div className="border-y border-[#DCE5F0] dark:border-[#2B3A4F]">
          {profile?.course_id ? (
            <div className="py-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  list="profile-discipline-options"
                  value={newDiscipline}
                  onChange={(event) => setNewDiscipline(event.target.value)}
                  placeholder={
                    disciplineLoading
                      ? "Carregando disciplinas..."
                      : "Adicionar disciplina..."
                  }
                  disabled={disciplineLoading}
                  className="min-h-11 flex-1 rounded-lg border border-[#D3DEEA] bg-[#F8FAFC] px-3 text-sm text-[#273547] outline-none placeholder:text-[#96A3B3] focus:border-[#0242D7] focus:ring-2 focus:ring-[#D8E6FB] dark:border-[#34485E] dark:bg-[#182538] dark:text-[#E2EAF2] dark:focus:border-[#6EA6FF] dark:focus:ring-[#223B5B]"
                />
                <datalist id="profile-discipline-options">
                  {disciplineOptions.map((discipline) => (
                    <option key={discipline.id} value={discipline.name} />
                  ))}
                </datalist>

                <button
                  type="button"
                  onClick={() => void addDiscipline()}
                  disabled={!newDiscipline.trim() || disciplineLoading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0242D7] px-4 text-sm font-bold text-white hover:bg-[#0038B8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Adicionar
                </button>
              </div>

              {studentDisciplines.length === 0 ? (
                <p className="mt-4 text-sm text-[#7A8796] dark:text-[#96A6B8]">
                  Nenhuma disciplina no seu percurso.
                </p>
              ) : (
                <div className="mt-5 divide-y divide-[#E8EDF2] border-y border-[#E8EDF2] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
                  {studentDisciplines.map((discipline) => (
                    <div
                      key={discipline.id}
                      className="flex items-center justify-between gap-4 py-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0F5FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]">
                          <Icon name="book" className="h-4 w-4" />
                        </span>
                        <p className="truncate text-sm font-semibold text-[#273547] dark:text-[#DFE8F1]">
                          {discipline.discipline_name}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void removeDiscipline(discipline.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8A96A5] hover:bg-[#F4F6F8] hover:text-[#B42318] dark:text-[#8293A6] dark:hover:bg-[#1B2638] dark:hover:text-[#F0A3A3]"
                        aria-label={`Remover ${discipline.discipline_name}`}
                        title={`Remover ${discipline.discipline_name}`}
                      >
                        <Icon name="close" className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-6">
              <p className="text-sm font-semibold text-[#344154] dark:text-[#DCE5EE]">
                Escolha um curso antes de adicionar disciplinas.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="study-heading">
        <div className="mb-4">
          <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
            Sua rotina
          </p>
          <h2
            id="study-heading"
            className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
          >
            Meta diária de estudo
          </h2>
          <p className="mt-1 text-sm text-[#718093] dark:text-[#96A6B8]">
            Escolha um ritmo que faça sentido para sua rotina.
          </p>
        </div>

        <div className="border-y border-[#DCE5F0] dark:border-[#2B3A4F] py-5">
          <div className="flex flex-wrap gap-2">
            {[20, 30, 45, 60, 90, 120].map((minutes) => {
              const active = profile?.daily_study_minutes === minutes;

              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => {
                    setProfile((current) =>
                      current
                        ? { ...current, daily_study_minutes: minutes }
                        : current,
                    );
                    void saveProfile({ daily_study_minutes: minutes });
                  }}
                  className={
                    active
                      ? "rounded-full bg-[#0242D7] px-4 py-2 text-sm font-bold text-white dark:bg-[#5D96F2]"
                      : "rounded-full border border-[#D3DEEA] bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#56667A] hover:border-[#BFD0E4] hover:text-[#0242D7] dark:border-[#34485E] dark:bg-[#182538] dark:text-[#B4C1D0] dark:hover:border-[#4A6280] dark:hover:text-[#7DB0FF]"
                  }
                >
                  {minutes >= 60
                    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`
                    : `${minutes} min`}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Icon
                name="clock"
                className="h-4 w-4 text-[#0242D7] dark:text-[#7DB0FF]"
              />
              <span className="text-sm font-bold text-[#273547] dark:text-[#DFE8F1]">
                Meta atual: {studyTimeLabel}
              </span>
            </div>
            <p className="text-xs text-[#7A8796] dark:text-[#8B9CAF]">
              Você pode mudar quando quiser.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 border-t border-[#DCE5F0] pt-7 dark:border-[#2B3A4F]">
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={logoutPending}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#667487] hover:text-[#0F172A] disabled:opacity-60 dark:text-[#9AA9BA] dark:hover:text-[#E7EDF5]"
        >
          <Icon name="logout" className="h-4 w-4" />
          {logoutPending ? "Saindo..." : "Sair da conta"}
        </button>
      </section>

      {pendingCourseRemoval && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/35 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-course-title"
            className="w-full max-w-md rounded-2xl border border-[#DCE5F0] bg-[#F8FAFC] p-6 shadow-2xl dark:border-[#33485F] dark:bg-[#182538]"
          >
            <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
              Remover contexto acadêmico
            </p>
            <h2
              id="remove-course-title"
              className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
            >
              Remover seu curso?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6F7C8C] dark:text-[#9DAEBF]">
              Isso também remove as disciplinas que estão no seu percurso atual.
              Seu histórico de aprendizagem permanece salvo.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingCourseRemoval(false)}
                className="min-h-10 rounded-lg border border-[#D3DEEA] px-4 text-sm font-bold text-[#56667A] hover:text-[#273547] dark:border-[#34485E] dark:text-[#AEBCCC] dark:hover:text-[#E1E9F2]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoveCourse()}
                className="min-h-10 rounded-lg bg-[#B42318] px-4 text-sm font-bold text-white hover:bg-[#98201A]"
              >
                Remover curso
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
