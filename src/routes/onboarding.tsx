import {
  Link,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { BrandLogo, BrandMark } from "@/components/brand-logo";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "institution" | "disciplines" | "exams" | "final";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

interface ExamData {
  id: string;
  discipline: string;
  examType: string;
  examDate: string;
}

interface ProfileData {
  course: string;
  institution: string;
  semester: number | null;
  dailyStudyMinutes: number;
  difficulties: string;
}

interface CourseOption {
  id: string;
  name: string;
}

interface DisciplineOption {
  id: string;
  name: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface TechnicalError {
  operation: string;
  error: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const steps: { id: Step; label: string }[] = [
  { id: "institution", label: "Curso e instituição" },
  { id: "disciplines", label: "Disciplinas" },
  { id: "exams", label: "Avaliações" },
  { id: "final", label: "Disponibilidade" },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Progresso do onboarding" className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
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
                className={`h-px w-6 sm:w-10 ${
                  index < currentIndex ? "bg-[#0242D7]" : "bg-[#E2E8F0]"
                }`}
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
  course: string;
  courseOptions: CourseOption[];
  courseLoading: boolean;
  institution: string;
  semester: number | null;
  onCourseChange: (v: string) => void;
  onInstitutionChange: (v: string) => void;
  onSemesterChange: (v: number | null) => void;
}

function InstitutionStep({
  course,
  courseOptions,
  courseLoading,
  institution,
  semester,
  onCourseChange,
  onInstitutionChange,
  onSemesterChange,
}: InstitutionStepProps) {
  return (
    <fieldset className="mt-8 space-y-6">
      <legend className="sr-only">Informações acadêmicas</legend>

      <div>
        <label htmlFor="course" className="text-sm font-medium text-[#0F172A]">Qual é o seu curso?</label>
        <input id="course" type="search" list="course-options" autoComplete="off" placeholder="Busque seu curso..." value={course} onChange={(e) => onCourseChange(e.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]" />
        <datalist id="course-options">
          {courseOptions.map((option) => <option key={option.id} value={option.name} />)}
        </datalist>
        {course.trim() && !courseOptions.some((option) => normalize(option.name) === normalize(course)) && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0242D7]" role="status">
            Esse curso ainda não está disponível. Em breve <BrandMark className="h-5 w-6" />
          </p>
        )}
        {courseLoading && <p className="mt-1.5 text-xs text-[#64748B]">Carregando cursos...</p>}
        {!courseLoading && courseOptions.length > 0 && !course.trim() && <p className="mt-1.5 text-xs text-[#64748B]">Busque entre os cursos disponíveis no Ensina-me.</p>}
      </div>      <div>
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
            onSemesterChange(e.target.value ? Number(e.target.value) : null)
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
  disciplineOptions: DisciplineOption[];
  disciplineLoading: boolean;
  newDiscipline: string;
  onAdd: (d: string) => void;
  onRemove: (d: string) => void;
  onNewChange: (v: string) => void;
}

function DisciplinesStep({
  disciplines,
  disciplineOptions,
  disciplineLoading,
  newDiscipline,
  onAdd,
  onRemove,
  onNewChange,
}: DisciplinesStepProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onNewChange("");
    }
  };

  return (
    <fieldset className="mt-8 space-y-5">
      <legend className="sr-only">Disciplinas do semestre</legend>

      <div>
        <label htmlFor="new-discipline" className="text-sm font-medium text-[#0F172A]">
          Quais disciplinas você está cursando?
        </label>
        <p className="mt-1 text-xs text-[#64748B]">Busque uma disciplina do curso selecionado.</p>
        <input
          id="new-discipline"
          type="search"
          list="discipline-options"
          autoComplete="off"
          placeholder="Busque uma disciplina..."
          value={newDiscipline}
          onChange={(e) => onNewChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
        />
        <datalist id="discipline-options">
          {disciplineOptions.map((option) => <option key={option.id} value={option.name} />)}
        </datalist>
        {newDiscipline.trim() && !disciplineOptions.some((option) => normalize(option.name) === normalize(newDiscipline)) && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0242D7]" role="status">
            Essa disciplina ainda não está disponível. Em breve <BrandMark className="h-5 w-6" />
          </p>
        )}
        {disciplineLoading && <p className="mt-1.5 text-xs text-[#64748B]">Carregando disciplinas...</p>}
        {!disciplineLoading && disciplineOptions.length === 0 && <p className="mt-1.5 text-xs text-[#64748B]">Ainda não há disciplinas publicadas para este curso.</p>}
        {disciplineOptions.some((option) => normalize(option.name) === normalize(newDiscipline)) && (
          <button
            type="button"
            onClick={() => onAdd(disciplineOptions.find((option) => normalize(option.name) === normalize(newDiscipline))!.name)}
            className="mt-3 h-10 w-full rounded-xl bg-[#0242D7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] sm:w-auto sm:px-5"
          >
            Adicionar disciplina
          </button>
        )}
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

// ─── Step 3: Exams ─────────────────────────────────────────────────────────────

interface ExamsStepProps {
  exams: ExamData[];
  disciplines: string[];
  newDiscipline: string;
  newExamType: string;
  newExamDate: string;
  onAddExam: () => void;
  onRemoveExam: (id: string) => void;
  onNewDisciplineChange: (v: string) => void;
  onNewExamTypeChange: (v: string) => void;
  onNewExamDateChange: (v: string) => void;
}

const examTypes = [
  "Prova",
  "Trabalho",
  "Apresentação",
  "Seminário",
  "Prova final",
  "Avaliação parcial",
  "Outro",
];

function ExamsStep({
  exams,
  disciplines,
  newDiscipline,
  newExamType,
  newExamDate,
  onAddExam,
  onRemoveExam,
  onNewDisciplineChange,
  onNewExamTypeChange,
  onNewExamDateChange,
}: ExamsStepProps) {
  const canAdd =
    newDiscipline.trim() && newExamType.trim() && newExamDate.trim();

  return (
    <fieldset className="mt-8 space-y-5">
      <legend className="sr-only">Avaliações do semestre</legend>

      <div>
        <label
          htmlFor="exam-discipline"
          className="text-sm font-medium text-[#0F172A]"
        >
          Disciplina
        </label>
        <select
          id="exam-discipline"
          value={newDiscipline}
          onChange={(e) => onNewDisciplineChange(e.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
        >
          <option value="">Selecione a disciplina</option>
          {disciplines.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
          {newDiscipline && !disciplines.includes(newDiscipline) && (
            <option value={newDiscipline}>{newDiscipline}</option>
          )}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="exam-type" className="text-sm font-medium text-[#0F172A]">
            Tipo de avaliação
          </label>
          <select
            id="exam-type"
            value={newExamType}
            onChange={(e) => onNewExamTypeChange(e.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
          >
            <option value="">Selecione o tipo</option>
            {examTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="exam-date" className="text-sm font-medium text-[#0F172A]">
            Data
          </label>
          <input
            id="exam-date"
            type="date"
            value={newExamDate}
            onChange={(e) => onNewExamDateChange(e.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onAddExam}
        disabled={!canAdd}
        className="h-10 w-full rounded-md border border-dashed border-[#CBD5E1] text-sm font-medium text-[#64748B] transition-colors hover:border-[#0242D7] hover:text-[#0242D7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + Adicionar avaliação
      </button>

      {exams.length > 0 && (
        <div className="space-y-2">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0F172A]">
                  {exam.discipline}
                </p>
                <p className="text-xs text-[#64748B]">
                  {exam.examType}
                  {exam.examDate && ` — ${exam.examDate}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveExam(exam.id)}
                className="ml-3 shrink-0 text-[#64748B] transition-colors hover:text-[#991B1B] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0242D7]"
                aria-label="Remover avaliação"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="3" x2="13" y2="13" />
                  <line x1="13" y1="3" x2="3" y2="13" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {exams.length === 0 && (
        <p className="text-sm text-[#64748B]">
          Nenhuma avaliação adicionada. Você pode pular esta etapa.
        </p>
      )}
    </fieldset>
  );
}

// ─── Step 4: Difficulties & Availability ─────────────────────────────────────

interface FinalStepProps {
  difficulties: string;
  dailyStudyMinutes: number;
  onDifficultiesChange: (v: string) => void;
  onMinutesChange: (v: number) => void;
}

const timeOptions = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
  { value: 240, label: "4 horas" },
];

function FinalStep({
  difficulties,
  dailyStudyMinutes,
  onDifficultiesChange,
  onMinutesChange,
}: FinalStepProps) {
  return (
    <fieldset className="mt-8 space-y-6">
      <legend className="sr-only">Dificuldades e disponibilidade</legend>

      <div>
        <label
          htmlFor="difficulties"
          className="text-sm font-medium text-[#0F172A]"
        >
          Em quais assuntos você sente mais dificuldade?
        </label>
        <textarea
          id="difficulties"
          rows={4}
          placeholder="Ex.: estatística, metodologias de pesquisa, filosofia da educação..."
          value={difficulties}
          onChange={(e) => onDifficultiesChange(e.target.value)}
          className="mt-2 w-full resize-none rounded-md border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]"
        />
        <p className="mt-1.5 text-xs text-[#64748B]">
          Opcional — deixe em branco se preferir.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-[#0F172A]">
          Quanto tempo você consegue estudar por dia?
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {timeOptions.map((opt) => {
            const isSelected = dailyStudyMinutes === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onMinutesChange(opt.value)}
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
      </div>
    </fieldset>
  );
}

// ─── Review summary ───────────────────────────────────────────────────────────

interface ReviewSummaryProps {
  profile: ProfileData;
  disciplines: string[];
  exams: ExamData[];
}

function ReviewSummary({ profile, disciplines, exams }: ReviewSummaryProps) {
  const difficultyList = profile.difficulties
    ? profile.difficulties.split(",").map((d) => d.trim()).filter(Boolean)
    : [];

  return (
    <div className="mt-8 space-y-5">
      <h2 className="text-sm font-semibold text-[#0F172A]">
        Resumo das suas informações
      </h2>

      <dl className="space-y-4">
        <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
            Curso
          </dt>
          <dd className="mt-1 text-sm text-[#0F172A]">
            {profile.course || "Não informado"}
          </dd>
        </div>

        <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
            Instituição
          </dt>
          <dd className="mt-1 text-sm text-[#0F172A]">
            {profile.institution || "Não informada"}
            {profile.semester && ` — ${profile.semester}º período`}
          </dd>
        </div>

        <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
            Disciplinas ({disciplines.length})
          </dt>
          <dd className="mt-1 text-sm text-[#0F172A]">
            {disciplines.length > 0
              ? disciplines.join(", ")
              : "Nenhuma disciplina adicionada"}
          </dd>
        </div>

        {exams.length > 0 && (
          <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Avaliações ({exams.length})
            </dt>
            <dd className="mt-1 space-y-1">
              {exams.map((exam) => (
                <p key={exam.id} className="text-sm text-[#0F172A]">
                  {exam.discipline} — {exam.examType}
                  {exam.examDate && ` (${exam.examDate})`}
                </p>
              ))}
            </dd>
          </div>
        )}

        <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
            Tempo de estudo diário
          </dt>
          <dd className="mt-1 text-sm text-[#0F172A]">
            {profile.dailyStudyMinutes} minutos
          </dd>
        </div>

        <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
            Dificuldades relatadas
          </dt>
          <dd className="mt-1 text-sm text-[#0F172A]">
            {difficultyList.length > 0
              ? difficultyList.join(", ")
              : "Não foram informadas"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

// ─── Technical error details (colapsável) ─────────────────────────────────────

interface TechnicalErrorDetailsProps {
  techError: TechnicalError | null;
}

function TechnicalErrorDetails({ techError }: TechnicalErrorDetailsProps) {
  if (!techError) return null;

  return (
    <details className="mt-4 rounded-md border border-[#FECACA] bg-[#FFF5F5] px-4 py-3">
      <summary className="cursor-pointer text-xs font-mono font-medium text-[#991B1B]">
        Detalhes técnicos (desenvolvimento)
      </summary>
      <div className="mt-3 space-y-1 font-mono text-xs text-[#991B1B]">
        <p>
          <span className="font-semibold">Operação:</span> {techError.operation}
        </p>
        {techError.error && (
          <>
            <p>
              <span className="font-semibold">Mensagem:</span>{" "}
              {techError.error.message}
            </p>
            {techError.error.code && (
              <p>
                <span className="font-semibold">Código:</span>{" "}
                {techError.error.code}
              </p>
            )}
            {techError.error.details && (
              <p>
                <span className="font-semibold">Detalhes:</span>{" "}
                {techError.error.details}
              </p>
            )}
            {techError.error.hint && (
              <p>
                <span className="font-semibold">Dica:</span>{" "}
                {techError.error.hint}
              </p>
            )}
          </>
        )}
      </div>
    </details>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" }] }),
  ssr: false,
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // ── Step ──
  const [step, setStep] = useState<Step>("institution");
  const stepIndex = steps.findIndex((s) => s.id === step);

  // ── Profile data ──
  const [course, setCourse] = useState("");
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [courseLoading, setCourseLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [disciplineOptions, setDisciplineOptions] = useState<DisciplineOption[]>([]);
  const [disciplineLoading, setDisciplineLoading] = useState(false);
  const [institution, setInstitution] = useState("");
  const [semester, setSemester] = useState<number | null>(null);
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState(60);
  const [difficulties, setDifficulties] = useState("");

  // ── Disciplines ──
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [newDiscipline, setNewDiscipline] = useState("");

  // ── Exams ──
  const [exams, setExams] = useState<ExamData[]>([]);
  const [newExamDiscipline, setNewExamDiscipline] = useState("");
  const [newExamType, setNewExamType] = useState("");
  const [newExamDate, setNewExamDate] = useState("");

  // ── UI state ──
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [technicalError, setTechnicalError] = useState<TechnicalError | null>(null);

  // ── Load existing data on mount ──
  useEffect(() => {
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await navigate({ to: "/login", replace: true });
        return;
      }

      const userId = sessionData.session.user.id;

      const { data: courses } = await supabase
        .from("courses")
        .select("id, name")
        .eq("published", true)
        .order("name", { ascending: true });

      setCourseOptions((courses ?? []) as CourseOption[]);
      setCourseLoading(false);

      const { data: profile } = await supabase
        .from("student_profiles")
        .select(
          "course_id, institution, semester, daily_study_minutes, difficulties, onboarding_completed",
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        await navigate({ to: "/app/dashboard", replace: true });
        return;
      }

      if (profile) {
        if (profile.course_id) {
          setSelectedCourseId(profile.course_id);
          const profileCourse = (courses ?? []).find((item) => item.id === profile.course_id);
          if (profileCourse) setCourse(profileCourse.name);
        }
        setInstitution(profile.institution ?? "");
        setSemester(profile.semester ?? null);
        setDailyStudyMinutes(profile.daily_study_minutes ?? 60);
        setDifficulties(
          Array.isArray(profile.difficulties)
            ? profile.difficulties.join(", ")
            : (profile.difficulties ?? ""),
        );
      }

      const { data: discs } = await supabase
        .from("student_disciplines")
        .select("discipline_name, course")
        .eq("user_id", userId);

      if (discs && discs.length > 0) {
        setDisciplines(discs.map((d) => d.discipline_name));
        const existingCourse = discs.find((d) => typeof d.course === "string" && d.course.trim())?.course;
        if (existingCourse) {
          setCourse(existingCourse);
          const matchingCourse = (courses ?? []).find((item) => normalize(item.name) === normalize(existingCourse));
          if (matchingCourse) setSelectedCourseId(matchingCourse.id);
        }
      }

      const { data: existingExams } = await supabase
        .from("student_exams")
        .select("id, discipline, exam_type, exam_date")
        .eq("user_id", userId);

      if (existingExams && existingExams.length > 0) {
        setExams(
          existingExams.map((e) => ({
            id: e.id,
            discipline: e.discipline,
            examType: e.exam_type,
            examDate: e.exam_date ?? "",
          })),
        );
      }

      setAuthChecking(false);
    };

    void loadProfile();
  }, [navigate]);

  // ── Load published disciplines for selected course ──
  useEffect(() => {
    if (!selectedCourseId) {
      setDisciplineOptions([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      setDisciplineLoading(true);
      const { data } = await supabase
        .from("disciplines")
        .select("id, name")
        .eq("course_id", selectedCourseId)
        .eq("published", true)
        .order("name", { ascending: true });
      if (!cancelled) {
        setDisciplineOptions((data ?? []) as DisciplineOption[]);
        setDisciplineLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCourseId]);
  // ── Auto-save profile fields with debounce ──
  type SaveProfileOverrides = Partial<{
    courseId: string | null;
    institution: string;
    semester: number | null;
    dailyStudyMinutes: number;
    difficulties: string;
  }>;

  function saveProfile(overrides: SaveProfileOverrides = {}) {
    if (saveDebounce.current) clearTimeout(saveDebounce.current);

    saveDebounce.current = setTimeout(async () => {
      setStatus("saving");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setStatus("error");
        return;
      }

      const userId = sessionData.session.user.id;
      const nextCourseId =
        overrides.courseId !== undefined ? overrides.courseId : selectedCourseId;
      const nextInstitution =
        overrides.institution !== undefined ? overrides.institution : institution;
      const nextSemester =
        overrides.semester !== undefined ? overrides.semester : semester;
      const nextDailyStudyMinutes =
        overrides.dailyStudyMinutes !== undefined
          ? overrides.dailyStudyMinutes
          : dailyStudyMinutes;
      const nextDifficulties =
        overrides.difficulties !== undefined ? overrides.difficulties : difficulties;

      const difficultiesArray = nextDifficulties
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from("student_profiles")
        .upsert(
          {
            user_id: userId,
            course_id: nextCourseId,
            institution: nextInstitution || null,
            semester: nextSemester,
            daily_study_minutes: nextDailyStudyMinutes,
            difficulties:
              difficultiesArray.length > 0 ? difficultiesArray : null,
            onboarding_completed: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      setStatus(error ? "error" : "saved");
    }, 800);
  }

  // ── Save disciplines ──
  async function saveDisciplines(userId: string): Promise<{ error: TechnicalError["error"] }> {
    // Delete existing
    const { error: deleteError } = await supabase
      .from("student_disciplines")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      return {
        error: {
          message: deleteError.message,
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint,
        },
      };
    }

    if (disciplines.length === 0) {
      return { error: null };
    }

    const discRows = disciplines.map((name) => ({
      user_id: userId,
      discipline_name: name,
      course: course.trim() || "Não informado",
    }));

    const { error: insertError } = await supabase
      .from("student_disciplines")
      .insert(discRows);

    if (insertError) {
      return {
        error: {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        },
      };
    }

    return { error: null };
  }

  // ── Save exams ──
  async function saveExams(userId: string): Promise<{ error: TechnicalError["error"] }> {
    const { error: deleteError } = await supabase
      .from("student_exams")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      return {
        error: {
          message: deleteError.message,
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint,
        },
      };
    }

    if (exams.length === 0) {
      return { error: null };
    }

    const examRows = exams.map((e) => ({
      user_id: userId,
      discipline: e.discipline,
      exam_type: e.examType,
      exam_date: e.examDate || null,
    }));

    const { error: insertError } = await supabase
      .from("student_exams")
      .insert(examRows);

    if (insertError) {
      return {
        error: {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        },
      };
    }

    return { error: null };
  }

  // ── Navigation ──
  function goNext() {
    if (step === "institution") {
      const selectedCourse = courseOptions.find(
        (option) => normalize(option.name) === normalize(course),
      );

      if (!selectedCourse) {
        setMessage("Selecione um curso disponível para continuar.");
        setStatus("error");
        return;
      }

      setSelectedCourseId(selectedCourse.id);
      saveProfile({ courseId: selectedCourse.id });
      setMessage("");
      setStatus("saved");
      setStep("disciplines");
    } else if (step === "disciplines") {
      saveProfile();
      setMessage("");
      setStep("exams");
    } else if (step === "exams") {
      saveProfile();
      setMessage("");
      setStep("final");
    }
  }

  function goBack() {
    saveProfile();

    if (step === "disciplines") setStep("institution");
    else if (step === "exams") setStep("disciplines");
    else if (step === "final") setStep("exams");
  }

  // ── Add/remove exam ──
  function handleAddExam() {
    if (!newExamDiscipline.trim() || !newExamType.trim()) return;

    const newExam: ExamData = {
      id: crypto.randomUUID(),
      discipline: newExamDiscipline,
      examType: newExamType,
      examDate: newExamDate,
    };

    setExams((prev) => [...prev, newExam]);
    setNewExamDiscipline("");
    setNewExamType("");
    setNewExamDate("");
  }

  function handleRemoveExam(id: string) {
    setExams((prev) => prev.filter((e) => e.id !== id));
  }

  // ── Finish ──
  async function handleFinish() {
    if (isLoading) return;

    setIsLoading(true);
    setMessage("");
    setTechnicalError(null);
    setStatus("saving");

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setMessage("Sessão expirada. Faça login novamente.");
      setStatus("error");
      setIsLoading(false);
      return;
    }

    const userId = sessionData.session.user.id;

    // Step 1: Save profile with onboarding_completed = false
    const difficultiesArray = difficulties
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    const { error: profileError } = await supabase
      .from("student_profiles")
      .upsert(
        {
          user_id: userId,
          course_id: selectedCourseId,
          institution: institution || null,
          semester,
          daily_study_minutes: dailyStudyMinutes,
          difficulties: difficultiesArray.length > 0 ? difficultiesArray : null,
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      setMessage("Não foi possível salvar seu perfil. Tente novamente.");
      setTechnicalError({ operation: "Salvar perfil", error: {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
      }});
      setStatus("error");
      setIsLoading(false);
      return;
    }

    // Step 2: Save disciplines (delete + insert, capture both errors)
    const discResult = await saveDisciplines(userId);
    if (discResult.error) {
      setMessage("Não foi possível salvar suas disciplinas. Tente novamente.");
      setTechnicalError({ operation: "Salvar disciplinas", error: discResult.error });
      setStatus("error");
      setIsLoading(false);
      return;
    }

    // Step 3: Save exams (delete + insert, capture both errors)
    const examResult = await saveExams(userId);
    if (examResult.error) {
      setMessage("Não foi possível salvar suas avaliações. Tente novamente.");
      setTechnicalError({ operation: "Salvar avaliações", error: examResult.error });
      setStatus("error");
      setIsLoading(false);
      return;
    }

    // Step 4: All operations succeeded — mark onboarding as completed
    const { error: completeError } = await supabase
      .from("student_profiles")
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (completeError) {
      setMessage("Não foi possível finalizar a configuração. Tente novamente.");
      setTechnicalError({ operation: "Finalizar onboarding", error: {
        message: completeError.message,
        code: completeError.code,
        details: completeError.details,
        hint: completeError.hint,
      }});
      setStatus("error");
      setIsLoading(false);
      return;
    }

    setStatus("saved");
    await navigate({ to: "/app/dashboard" });
  }

  const isFirstStep = step === "institution";
  const isLastStep = step === "final";

  const currentProfile: ProfileData = {
    course,
    institution,
    semester,
    dailyStudyMinutes,
    difficulties,
  };

  if (authChecking) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#0F172A]">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center">
          <p className="text-sm font-medium text-[#64748B]">Preparando sua configuração...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#0F172A] sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-2xl flex-col justify-center">
        <header className="mb-10">
          <Link
            to="/"
            className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
            aria-label="Ensina-me, página inicial"
          >
            <BrandLogo compact />
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

          <p className="mt-4 text-sm font-medium text-[#64748B]">
            Etapa {stepIndex + 1} de {steps.length}
          </p>

          {message && (
            <div
              className="mt-5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
              role="alert"
            >
              <p>{message}</p>
              <TechnicalErrorDetails techError={technicalError} />
            </div>
          )}

          {step === "institution" && (
            <InstitutionStep
              course={course}
              institution={institution}
              semester={semester}
              onCourseChange={(v) => {
                setCourse(v);
                const match = courseOptions.find((option) => normalize(option.name) === normalize(v));
                setSelectedCourseId(match?.id ?? null);
                setDisciplines([]);
                setNewDiscipline("");
                setStatus("idle");
                saveProfile({ courseId: match?.id ?? null });
              }}
              courseOptions={courseOptions}
              courseLoading={courseLoading}
              onInstitutionChange={(v) => {
                setInstitution(v);
                setStatus("idle");
                saveProfile({ institution: v });
              }}
              onSemesterChange={(v) => {
                setSemester(v);
                setStatus("idle");
                saveProfile({ semester: v });
              }}
            />
          )}

          {step === "disciplines" && (
            <DisciplinesStep
              disciplines={disciplines}
              disciplineOptions={disciplineOptions}
              disciplineLoading={disciplineLoading}
              newDiscipline={newDiscipline}
              onAdd={(d) => {
                if (!disciplines.includes(d)) {
                  setDisciplines((prev) => [...prev, d]);
                }
                setNewDiscipline("");
              }}
              onRemove={(d) => setDisciplines((prev) => prev.filter((x) => x !== d))}
              onNewChange={setNewDiscipline}
            />
          )}

          {step === "exams" && (
            <ExamsStep
              exams={exams}
              disciplines={disciplines}
              newDiscipline={newExamDiscipline}
              newExamType={newExamType}
              newExamDate={newExamDate}
              onAddExam={handleAddExam}
              onRemoveExam={handleRemoveExam}
              onNewDisciplineChange={setNewExamDiscipline}
              onNewExamTypeChange={setNewExamType}
              onNewExamDateChange={setNewExamDate}
            />
          )}

          {step === "final" && (
            <>
              <FinalStep
                difficulties={difficulties}
                dailyStudyMinutes={dailyStudyMinutes}
                onDifficultiesChange={(v) => {
                  setDifficulties(v);
                  setStatus("idle");
                  saveProfile({ difficulties: v });
                }}
                onMinutesChange={(v) => {
                  setDailyStudyMinutes(v);
                  setStatus("idle");
                  saveProfile({ dailyStudyMinutes: v });
                }}
              />
              <ReviewSummary
                profile={currentProfile}
                disciplines={disciplines}
                exams={exams}
              />
            </>
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
