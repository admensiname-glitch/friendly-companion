import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  course_id: string | null;
  institution: string | null;
  semester: number | null;
  daily_study_minutes: number | null;
  difficulties: string[] | null;
}

export const Route = createFileRoute("/app/perfil")({ component: ProfilePage });

function ProfilePage() {
  const navigate = useNavigate();
  const logoutPending = useRef(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [courseName, setCourseName] = useState("—");
  const [name, setName] = useState("Aluno");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await navigate({ to: "/login" });
        return;
      }

      const user = sessionData.session.user;
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
      setName(fullName?.split(" ")[0] || "Aluno");
      setEmail(user.email || "");

      const { data } = await supabase
        .from("student_profiles")
        .select("course_id, institution, semester, daily_study_minutes, difficulties")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as ProfileData);
        if (data.course_id) {
          const { data: course } = await supabase.from("courses").select("name").eq("id", data.course_id).maybeSingle();
          if (course?.name) setCourseName(course.name);
        }
      }
      setLoading(false);
    })();
  }, [navigate]);

  const studyTime = useMemo(() => {
    const minutes = profile?.daily_study_minutes ?? 0;
    if (!minutes) return "Não definido";
    if (minutes >= 60) return String(Math.floor(minutes / 60)) + "h" + (minutes % 60 ? " " + String(minutes % 60) + "min" : "");
    return String(minutes) + " min";
  }, [profile?.daily_study_minutes]);

  async function handleLogout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLogoutError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLogoutError("Não foi possível sair. Tente novamente.");
      logoutPending.current = false;
      return;
    }
    await navigate({ to: "/login" });
  }

  if (loading) return <section className="space-y-4"><div className="h-8 w-36 animate-pulse rounded-lg bg-white" /><div className="h-36 animate-pulse rounded-2xl border border-[#E7ECF3] bg-white" /><div className="h-44 animate-pulse rounded-2xl border border-[#E7ECF3] bg-white" /></section>;

  return (
    <section aria-labelledby="profile-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0242D7]">Conta</p>
          <h1 id="profile-title" className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#172334] sm:text-[36px]">Meu perfil</h1>
          <p className="mt-2 text-[15px] leading-6 text-[#687688]">{name}, aqui estão seus dados de aprendizagem e acesso.</p>
        </div>
        <Link to="/app/dashboard" className="w-fit text-sm font-semibold text-[#0242D7] hover:underline">Voltar ao início →</Link>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="surface-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0242D7] text-sm font-extrabold text-white">EM</div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-[-0.02em] text-[#172334]">{name}</h2>
              <p className="mt-0.5 truncate text-sm text-[#718093]">{email || "E-mail não informado"}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Info label="Curso" value={courseName} />
            <Info label="Instituição" value={profile?.institution || "Não informada"} />
            <Info label="Período" value={profile?.semester ? String(profile.semester) + "º período" : "Não definido"} />
            <Info label="Meta diária" value={studyTime} />
          </div>
        </article>

        <article className="surface-card rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8B96A5]">Dificuldades registradas</p>
          {profile?.difficulties?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">{profile.difficulties.map((difficulty) => <span key={difficulty} className="rounded-full border border-[#DCE5F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#526174]">{difficulty}</span>)}</div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#718093]">Nenhuma dificuldade específica foi registrada no onboarding.</p>
          )}
          {logoutError && <p className="mt-5 rounded-xl bg-[#FEF2F2] px-3 py-2.5 text-xs leading-5 text-[#B91C1C]" role="alert">{logoutError}</p>}
          <button type="button" onClick={handleLogout} className="mt-6 inline-flex items-center justify-center rounded-xl border border-[#DCE5F0] px-4 py-2.5 text-sm font-bold text-[#596778] transition-colors hover:border-[#C8D7EB] hover:text-[#0F172A]">Sair da conta</button>
        </article>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#EDF1F5] bg-[#F8FAFC] px-4 py-3.5"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A95A3]">{label}</p><p className="mt-1 text-sm font-semibold text-[#273547]">{value}</p></div>;
}