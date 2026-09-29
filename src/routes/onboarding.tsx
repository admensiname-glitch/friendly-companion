import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "institution" | "disciplines" | "availability";

interface ProfileData {
  institution: string;
  semester: number | null;
  dailyStudyMinutes: number;
  disciplines: string[];
  onboardingCompleted: boolean;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Step indicator ───────────────────────────────────────────────────────────

const steps: { id: Step; label: string }[] = [
  { id: "institution", label: "Instituição" },
  { id: "disciplines", label: "Disciplinas" },
  { id: "availability", label: "Disponibilidade" },
];

function StepIndicator({
  current,
}: {
  current: Step;
}) {
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Progresso do onboarding" className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                isCompleted
                  ? "bg-[#0242D7] text-white"
                  : isCurrent
                    ? "bg-[#0242D7] text-white"
                    : "bg-[#E2E8F0] text-[#64748B]"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isCompleted ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 12 12"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              ) : (
                index + 1
              )}
            </div>

            <span
              className={`text-sm font-medium ${
                isCurrent ? "text-[#0F172A]" : "text-[#64748B]"
              }`}
            >
              {step.label}
            </span>

            {index < steps.length - 1 && (
              <div
                className={`h-px w-8 sm:w-12 ${index < currentIndex ? "bg-[#0242D7]" : "bg-[#E2E8F0]"}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Step 1: Institution ──────────────────────────────────────────────────────

interface InstitutionStepProps {
  institution: string;
  semester: number | null;
  onInstitutionChange: (v: string) => void;
  onSemesterChange: (v: number | null) => void;
}

function InstitutionStep({
  institution,
  semester,
  onInstitutionChange,
  onSemesterChange,
}: InstitutionStepProps) {
  return (
    <fieldset className="mt-8 space-y-6">
      <legend className="sr-only">Informações da instituição</legend>

      <div>
        <label
          htmlFor="institution"
          className="text-sm font-medium text-[#0F172A]"
        >
          Em qual instituição você estuda?
        </label>
        <input
          id="institution"
          type="text"
          placeholder="Nome da sua instituição de ensino"
          value={institution}
          onChange={(e) => onInstitutionChange(e.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
        />
        <p className="mt-1.5 text-xs text-[#64748B]">
          Opcional — deixe em branco se preferir.
        </p>
      </div>

      <div>
        <label
          htmlFor="semester"
          className="text-sm font-medium text-[#0F172A]"
        >
          Em qual período você está?
        </label>
        <select
          id="semester"
          value={semester ?? ""}
          onChange={(e) =>
            onSemesterChange(
              e.target.value ? Number(e.target.value) : null,
            )
          }
          className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
        >
          <option value="">Selecione o período</option>
          {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
            <option key={s} value={s}>
              {s}º período
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

// ─── Step 2: Disciplines ──────────────────────────────────────────────────────

interface DisciplinesStepProps {
  disciplines: string[];
  newDiscipline: string;
  onAdd: (d: string) => void;
  onRemove: (d: string) => void;
  onNewChange: (v: string) => void;
}

function DisciplinesStep({
  disciplines,
  newDiscipline,
  onAdd,
  onRemove,
  onNewChange,
}: DisciplinesStepProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && newDiscipline.trim()) {
      e.preventDefault();
      onAdd(newDiscipline.trim());
    }
  };

  return (
    <fieldset className="mt-8 space-y-5">
      <legend className="sr-only">Disciplinas do semestre</legend>

      <div>
        <label
          htmlFor="new-discipline"
          className="text-sm font-medium text-[#0F172A]"
        >
          Quais disciplinas você está cursando?
        </label>
        <p className="mt-1 text-xs text-[#64748B]">
          Pressione Enter ou vírgula para adicionar cada disciplina.
        </p>

        <div className="mt-2 flex gap-2">
          <input
            id="new-discipline"
            type="text"
            placeholder="Ex.: Didática Geral"
            value={newDiscipline}
            onChange={(e) => onNewChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-11 flex-1 rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
          />
          <button
            type="button"
            onClick={() => {
              if (newDiscipline.trim()) onAdd(newDiscipline.trim());
            }}
            className="h-11 shrink-0 rounded-md bg-[#0242D7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
          >
            Adicionar
          </button>
        </div>
      </div>

      {disciplines.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {disciplines.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#CBD5E1] bg-white px-3 py-1.5 text-sm text-[#0F172A]"
            >
              {d}
              <button
                type="button"
                onClick={() => onRemove(d)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#991B1B] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0242D7]"
                aria-label={`Remover ${d}`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 12 12"
                  className="h-2.5 w-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="2" y1="2" x2="10" y2="10" />
                  <line x1="10" y1="2" x2="2" y2="10" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {disciplines.length === 0 && (
        <p className="text-sm text-[#64748B]">
          Nenhuma disciplina adicionada ainda.
        </p>
      )}
    </fieldset>
  );
}

// ─── Step 3: Availability ─────────────────────────────────────────────────────

interface AvailabilityStepProps {
  dailyStudyMinutes: number;
  onChange: (v: number) => void;
}

const timeOptions = [
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
  { value: 240, label: "4 horas" },
];

function AvailabilityStep({
  dailyStudyMinutes,
  onChange,
}: AvailabilityStepProps) {
  return (
    <fieldset className="mt-8 space-y-4">
      <legend className="sr-only">Tempo disponível para estudo</legend>

      <p className="text-sm font-medium text-[#0F172A]">
        Quanto tempo você consegue estudar por dia?
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {timeOptions.map((opt) => {
          const isSelected = dailyStudyMinutes === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={isSelected}
              className={`h-12 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2 ${
                isSelected
                  ? "border-[#0242D7] bg-[#EFF6FF] text-[#0242D7]"
                  : "border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#94A3B8]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      throw redirect({ to: "/login" });
    }

    const userId = data.session.user.id;

    const { data: profile } = await supabase
      .from("student_profiles")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.onboarding_completed) {
      throw redirect({ to: "/app/dashboard" });
    }
  },

  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [step, setStep] = useState<Step>("institution");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  // Form state
  const [institution, setInstitution] = useState("");
  const [semester, setSemester] = useState<number | null>(null);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [newDiscipline, setNewDiscipline] = useState("");
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState(60);

  // Load existing profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const userId = sessionData.session.user.id;

      const { data: profile } = await supabase
        .from("student_profiles")
        .select(
          "institution, semester, daily_study_minutes, difficulties, onboarding_completed",
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        setInstitution(profile.institution ?? "");
        setSemester(profile.semester ?? null);
        setDailyStudyMinutes(profile.daily_study_minutes ?? 60);
      }

      const { data: discs } = await supabase
        .from("student_disciplines")
        .select("discipline_name")
        .eq("user_id", userId);

      if (discs && discs.length > 0) {
        setDisciplines(discs.map((d) => d.discipline_name));
      }
    };

    loadProfile();
  }, []);

  // Auto-save with debounce
  async function saveProgress() {
    if (saveDebounce.current) clearTimeout(saveDebounce.current);

    saveDebounce.current = setTimeout(async () => {
      setStatus("saving");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const userId = sessionData.session.user.id;

      const { error } = await supabase
        .from("student_profiles")
        .upsert(
          {
            user_id: userId,
            institution: institution || null,
            semester,
            daily_study_minutes: dailyStudyMinutes,
            onboarding_completed: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) {
        setStatus("error");
      } else {
        setStatus("saved");
      }
    }, 800);
  }

  // Save on field changes
  useEffect(() => {
    saveProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institution, semester, dailyStudyMinutes]);

  function goNext() {
    if (step === "institution") setStep("disciplines");
    else if (step === "disciplines") setStep("availability");
  }

  function goBack() {
    if (step === "disciplines") setStep("institution");
    else if (step === "availability") setStep("disciplines");
  }

  async function handleFinish() {
    if (isLoading) return;

    setIsLoading(true);
    setMessage("");
    setStatus("saving");

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    const userId = sessionData.session.user.id;

    // Upsert profile and mark completed
    const { error: profileError } = await supabase
      .from("student_profiles")
      .upsert(
        {
          user_id: userId,
          institution: institution || null,
          semester,
          daily_study_minutes: dailyStudyMinutes,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      setMessage("Não foi possível salvar. Tente novamente.");
      setStatus("error");
      setIsLoading(false);
      return;
    }

    // Sync disciplines
    if (disciplines.length > 0) {
      const discRows = disciplines.map((name) => ({
        user_id: userId,
        discipline_name: name,
        course: "Pedagogia",
      }));

      // Delete old, insert new
      await supabase
        .from("student_disciplines")
        .delete()
        .eq("user_id", userId);

      const { error: discError } = await supabase
        .from("student_disciplines")
        .insert(discRows);

      if (discError) {
        setMessage("Disciplinas não puderam ser salvas, mas seu perfil foi criado.");
        // Not fatal — still complete onboarding
      }
    }

    setStatus("saved");
    await navigate({ to: "/app/dashboard" });
  }

  const isLastStep = step === "availability";
  const isFirstStep = step === "institution";

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#0F172A] sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-2xl flex-col justify-center">
        <header className="mb-10">
          <Link
            to="/"
            className="inline-block text-xl font-bold tracking-[-0.03em] text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
            aria-label="Ensina-me, página inicial"
          >
            Ensina-me
          </Link>
        </header>

        <section
          className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-10"
          aria-labelledby="onboarding-title"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
            Configuração inicial
          </p>
          <h1
            id="onboarding-title"
            className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
          >
            Prepare sua área de aprendizagem
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#64748B]">
            Responda algumas perguntas para personalizar sua experiência no
            Ensina-me. Você pode salvar e continuar depois.
          </p>

          <div className="mt-8">
            <StepIndicator current={step} />
          </div>

          {message && (
            <div
              className="mt-5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
              role="alert"
            >
              {message}
            </div>
          )}

          {step === "institution" && (
            <InstitutionStep
              institution={institution}
              semester={semester}
              onInstitutionChange={setInstitution}
              onSemesterChange={setSemester}
            />
          )}

          {step === "disciplines" && (
            <DisciplinesStep
              disciplines={disciplines}
              newDiscipline={newDiscipline}
              onAdd={(d) => {
                if (!disciplines.includes(d)) {
                  setDisciplines((prev) => [...prev, d]);
                }
                setNewDiscipline("");
              }}
              onRemove={(d) =>
                setDisciplines((prev) => prev.filter((x) => x !== d))
              }
              onNewChange={setNewDiscipline}
            />
          )}

          {step === "availability" && (
            <AvailabilityStep
              dailyStudyMinutes={dailyStudyMinutes}
              onChange={setDailyStudyMinutes}
            />
          )}

          <div className="mt-10 flex items-center justify-between gap-4">
            {isFirstStep ? (
              <Link
                to="/app/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-5 text-sm font-semibold text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
              >
                Pular por agora
              </Link>
            ) : (
              <button
                type="button"
                onClick={goBack}
                disabled={isLoading}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Voltar
              </button>
            )}

            <div className="flex items-center gap-3">
              {status === "saving" && (
                <span className="text-xs text-[#64748B]" aria-live="polite">
                  Salvando...
                </span>
              )}
              {status === "saved" && !message && (
                <span className="text-xs text-[#64748B]" aria-live="polite">
                  Salvo
                </span>
              )}

              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isLoading}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#0242D7] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
                >
                  {isLoading ? "Finalizando..." : "Finalizar configuração"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#0242D7] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
                >
                  Continuar
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
