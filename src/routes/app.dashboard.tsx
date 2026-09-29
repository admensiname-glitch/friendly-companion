import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  institution: string | null;
  semester: number | null;
  daily_study_minutes: number | null;
  difficulties: string[] | null;
}

interface StudentDiscipline {
  id: string;
  discipline_name: string;
  course: string;
}

interface User {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
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
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>
      <h2 className="mt-4 font-semibold text-[#0F172A]">
        Disciplinas em preparo
      </h2>
      <p className="mt-2 max-w-sm mx-auto text-sm leading-6 text-[#64748B]">
        As disciplinas do curso ainda não foram cadastradas. Novas disciplinas
        aparecerão aqui automaticamente quando forem disponibilizadas.
      </p>
    </div>
  );
}

// ─── Discipline card ──────────────────────────────────────────────────────────

function DisciplineCard({ id, name, course }: { id: string; name: string; course: string }) {
  return (
    <Link
      to="/app/disciplinas/$disciplineId"
      params={{ disciplineId: id }}
      className="block rounded-xl border border-[#E2E8F0] bg-white p-5 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[#0F172A]">{name}</p>
          <p className="mt-1 text-xs text-[#64748B]">{course}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-medium text-[#0242D7]">
          Pedagogia
        </span>
      </div>
    </Link>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/dashboard")({
  component: AppDashboard,
});

function AppDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [disciplines, setDisciplines] = useState<StudentDiscipline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const userId = sessionData.session.user.id;
      const currentUser = sessionData.session.user as User;
      setUser(currentUser);

      const { data: profileData } = await supabase
        .from("student_profiles")
        .select("institution, semester, daily_study_minutes, difficulties")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      const { data: discData } = await supabase
        .from("student_disciplines")
        .select("id, discipline_name, course")
        .eq("user_id", userId);

      if (discData && discData.length > 0) {
        setDisciplines(discData as StudentDiscipline[]);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  // ── Greeting ──
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.user_metadata?.name?.split(" ")[0] ||
    "Aluno";

  const studyTimeLabel =
    profile?.daily_study_minutes
      ? profile.daily_study_minutes >= 60
        ? `${Math.floor(profile.daily_study_minutes / 60)}h${profile.daily_study_minutes % 60 ? ` ${profile.daily_study_minutes % 60}min` : ""}`
        : `${profile.daily_study_minutes} min`
      : null;

  return (
    <section aria-labelledby="app-dashboard-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Área do aluno
      </p>
      <h1
        id="app-dashboard-title"
        className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
      >
        Olá, {firstName}
      </h1>

      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        O que você precisa estudar hoje?
      </p>

      {/* ── Context info ── */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {profile?.institution && (
          <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 1a5 5 0 1 0 0 10A5 5 0 0 0 8 1z" />
              <path d="M8 4v7M8 4a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1z" />
            </svg>
            <span>{profile.institution}</span>
          </div>
        )}

        {profile?.semester && (
          <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="12" height="11" rx="1" />
              <line x1="2" y1="7" x2="14" y2="7" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
            </svg>
            <span>{profile.semester}º período</span>
          </div>
        )}

        {studyTimeLabel && (
          <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="6" />
              <polyline points="8 4.5 8 8 10.5 10" />
            </svg>
            <span>Meta: {studyTimeLabel}/dia</span>
          </div>
        )}
      </div>

      {/* ── Disciplines ── */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#64748B]">
          Disciplinas do semestre
        </h2>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : disciplines.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {disciplines.map((disc) => (
              <DisciplineCard
                key={disc.id}
                id={disc.id}
                name={disc.discipline_name}
                course={disc.course}
              />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}
