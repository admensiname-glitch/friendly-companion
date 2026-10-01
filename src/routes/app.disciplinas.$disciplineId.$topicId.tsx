import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentDiscipline {
  id: string;
  discipline_name: string;
  course: string;
}

interface DisciplineAlias {
  discipline_id: string;
}

interface OfficialDiscipline {
  id: string;
  name: string;
}

interface TopicDetail {
  id: string;
  name: string;
  description: string | null;
  discipline_id: string;
}

interface Material {
  id: string;
  topic_id: string;
  title: string;
  introduction: string | null;
  status: string;
}

interface MaterialSection {
  id: string;
  material_id: string;
  title: string;
  content: string;
  position: number;
  section_type: "concept" | "explanation" | "deepening" | "examples" | "common_mistakes" | "review";
}

interface Source {
  id: string;
  title: string;
  authors: { name: string }[];
  publication_date: string | null;
  doi: string | null;
  canonical_url: string | null;
}

interface MaterialCitation {
  id: string;
  material_id: string;
  source_id: string;
  citation_label: string | null;
  locator: string | null;
  source?: Source;
}

interface ExerciseOption {
  id: string;
  content: string;
  is_correct: boolean;
  feedback_correct: string | null;
  feedback_incorrect: string | null;
  position: number;
}

interface ExerciseQuestion {
  id: string;
  exercise_id: string;
  question_text: string;
  question_type: string;
  position: number;
  feedback_hint: string | null;
  difficulty_tag: string[];
  options?: ExerciseOption[];
}

interface Exercise {
  id: string;
  topic_id: string;
  title: string;
  exercise_type: string;
  content: string;
  difficulty: string;
  source_id: string | null;
  position: number;
  published: boolean;
  questions?: ExerciseQuestion[];
}

interface EvaluationResult {
  attempt_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  band: "novice" | "developing" | "proficient" | "mastered";
}

interface TopicDifficulty {
  difficulty_tag: string;
  count: number;
  review_status: string;
  correct_count: number;
}

const DOMAIN_LABELS: Record<EvaluationResult["band"], string> = {
  novice: "Em desenvolvimento inicial",
  developing: "Em desenvolvimento",
  proficient: "Proficiente",
  mastered: "Domínio consolidado",
};

// ─── Normalization ─────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ─── Render paragraph breaks ───────────────────────────────────────────────────

function renderParagraphs(text: string | null | undefined): React.ReactNode[] {
  if (!text) return [];

  const step1 = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const step2 = step1
    .replace(/\\n\\n/g, "\u0002PARA\u0002")
    .replace(/\\n/g, "\u0003LINE\u0003");

  const paragraphs = step2.split("\u0002PARA\u0002");

  return paragraphs
    .map((para, pi) => {
      const lines = para.split("\u0003LINE\u0003").filter((l) => l.trim().length > 0);
      if (lines.length === 0) return null;

      if (lines.length === 1) {
        return (
          <p key={`${pi}-0`} className={pi > 0 ? "mt-3" : ""}>
            {lines[0]}
          </p>
        );
      }

      return (
        <p key={`${pi}-0`} className={pi > 0 ? "mt-3" : ""}>
          {lines.map((line, li) => (
            <span key={li}>
              {line}
              {li < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      );
    })
    .filter(Boolean) as React.ReactNode[];
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TopicSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="h-5 w-48 animate-pulse rounded-md bg-[#E2E8F0]" />
      <div className="h-8 w-72 animate-pulse rounded-md bg-[#E2E8F0]" />
      <div className="h-5 w-40 animate-pulse rounded-md bg-[#E2E8F0]" />
      <div className="mt-8 h-24 w-full animate-pulse rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC]" />
    </div>
  );
}

// ─── Not found ────────────────────────────────────────────────────────────────

function NotFound() {
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="mt-4 font-semibold text-[#0F172A]">Tópico não encontrado</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748B]">
        Este tópico não existe ou ainda não está disponível.
      </p>
      <Link
        to="/app/disciplinas"
        className="mt-6 inline-block text-sm font-medium text-[#0242D7] hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
      >
        Voltar para disciplinas
      </Link>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState() {
  return (
    <div
      className="mt-6 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
      role="alert"
    >
      Não foi possível carregar o tópico. Tente novamente.
    </div>
  );
}

// ─── Content placeholder ────────────────────────────────────────────────────────

function ContentPlaceholder() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-10 text-center">
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
      <h3 className="mt-4 font-semibold text-[#0F172A]">Conteúdo de aprendizagem</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748B]">
        O conteúdo deste tópico será disponibilizado aqui.
      </p>
    </div>
  );
}

// ─── Material section ──────────────────────────────────────────────────────────

function MaterialSectionItem({
  section,
  completed,
  onComplete,
}: {
  section: MaterialSection;
  completed: boolean;
  onComplete: () => void;
}) {
  const labels: Record<MaterialSection["section_type"], string> = {
    concept: "Ideia central",
    explanation: "Entenda",
    deepening: "Aprofunde",
    examples: "Na prática",
    common_mistakes: "Atenção",
    review: "Revisão rápida",
  };
  const initiallyExpanded = section.position <= 7 || section.section_type === "review";
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <section
      aria-labelledby={`section-${section.id}`}
      className={`scroll-mt-20 mt-6 rounded-2xl border border-[#E7ECF3] bg-white p-4 sm:mt-8 sm:p-6 transition-colors ${
        completed ? "border-[#BBF7D0]" : "border-[#E2E8F0]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0242D7]">
            {labels[section.section_type]}
          </p>
          <h3
            id={`section-${section.id}`}
            className="mt-2 text-[20px] font-bold tracking-[-0.025em] text-[#172334]"
          >
            {section.title}
          </h3>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={`section-content-${section.id}`}
            className="min-h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold sm:w-auto sm:rounded-full sm:py-1.5 text-[#475569] hover:border-[#BFDBFE] hover:text-[#0242D7]"
          >
            {expanded ? "Recolher" : "Ler conteúdo"}
          </button>

          <button
            type="button"
            onClick={onComplete}
            disabled={completed}
            aria-pressed={completed}
            className={
              completed
                ? "rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1.5 text-xs font-semibold text-[#166534]"
                : "shrink-0 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:border-[#BFDBFE] hover:text-[#0242D7]"
            }
          >
            {completed ? "Estudado ✓" : "Marcar como estudado"}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          id={`section-content-${section.id}`}
          className="mt-4 max-w-3xl space-y-3 text-[15px] leading-7 text-[#465468]"
        >
          {renderParagraphs(section.content)}
        </div>
      )}
    </section>
  );
}

// ─── Sources section ──────────────────────────────────────────────────────────

function SourcesSection({ citations }: { citations: MaterialCitation[] }) {
  const seen = new Set<string>();
  const uniqueSources: MaterialCitation[] = [];

  for (const cit of citations) {
    if (cit.source_id && !seen.has(cit.source_id)) {
      seen.add(cit.source_id);
      uniqueSources.push(cit);
    }
  }

  if (uniqueSources.length === 0) return null;

  return (
    <section aria-labelledby="sources-heading" className="mt-12">
      <h2 id="sources-heading" className="text-lg font-semibold text-[#0F172A]">
        Fontes utilizadas
      </h2>
      <div className="mt-4 space-y-4">
        {uniqueSources.map((cit) => {
          const src = cit.source;
          if (!src) return null;

          const year = src.publication_date
            ? new Date(src.publication_date).getFullYear().toString()
            : null;

          const authorsText = (() => {
            if (!src.authors || src.authors.length === 0) return null;
            const names = src.authors.map((a: unknown) => {
              if (typeof a === "string") return a;
              if (typeof a === "object" && a !== null && "name" in a) {
                return (a as { name: string }).name;
              }
              return String(a);
            });
            return names.join("; ");
          })();

          return (
            <div
              key={src.id}
              className="muted-panel rounded-2xl p-4 sm:p-5"
            >
              <p className="text-sm font-medium text-[#0F172A]">{src.title}</p>
              {authorsText && (
                <p className="mt-1 text-sm text-[#64748B]">{authorsText}</p>
              )}
              {cit.locator && (
                <p className="mt-1 text-xs text-[#94A3B8]">{cit.locator}</p>
              )}
              {src.canonical_url && (
                <a
                  href={src.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-[#0242D7] hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
                >
                  Ver fonte original →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface TutorMicroAssessment {
  id: string;
  question: string;
  options: string[];
  difficulty: "introductory" | "intermediate" | "advanced";
  concept_tags: string[];
}

interface TutorMicroResult {
  is_correct: boolean;
  selected_option_index: number;
  correct_option_index: number;
  explanation: string;
  attempted: number | null;
  correct: number | null;
  accuracy: number | null;
  consecutive_correct: number;
  consecutive_incorrect: number;
  next_difficulty: "introductory" | "intermediate" | "advanced";
  mastery_level: "emerging" | "consolidating" | "proficient" | "mastered";
  next_review_at: string | null;
  next_action: "simplify" | "practice" | "review" | "explore" | null;
  next_message: string | null;
  next_micro_assessment: TutorMicroAssessment | null;
}

function renderTutorInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function renderTutorContent(text: string): React.ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={index} className="h-2" />;
    }

    if (trimmed === "---") {
      return <hr key={index} className="my-3 border-[#E2E8F0]" />;
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={index} className="mt-2 font-semibold text-[#0F172A]">
          {renderTutorInline(trimmed.slice(4))}
        </h4>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={index} className="mt-2 text-base font-semibold text-[#0F172A]">
          {renderTutorInline(trimmed.slice(3))}
        </h3>
      );
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      return (
        <div key={index} className="flex gap-2">
          <span aria-hidden="true" className="text-[#0242D7]">•</span>
          <span>{renderTutorInline(trimmed.slice(2))}</span>
        </div>
      );
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.+)$/);
      return match ? (
        <div key={index} className="flex gap-2">
          <span className="font-semibold text-[#0242D7]">{match[1]}.</span>
          <span>{renderTutorInline(match[2])}</span>
        </div>
      ) : null;
    }

    return (
      <p key={index} className={index > 0 ? "mt-2" : ""}>
        {renderTutorInline(trimmed)}
      </p>
    );
  });
}

function TutorMicroAssessmentCard({
  assessment,
  onAnswered,
}: {
  assessment: TutorMicroAssessment;
  onAnswered: (result: TutorMicroResult) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<TutorMicroResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function answer() {
    if (selected === null || submitting || result) return;

    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("ai-tutor", {
      body: {
        action: "answer_microassessment",
        micro_assessment_id: assessment.id,
        selected_option_index: selected,
      },
    });

    setSubmitting(false);

    if (error || !data?.explanation) {
      return;
    }

    const nextAssessment =
      data.next_micro_assessment && typeof data.next_micro_assessment === "object"
        ? (data.next_micro_assessment as TutorMicroAssessment)
        : null;

    const nextResult: TutorMicroResult = {
      is_correct: Boolean(data.is_correct),
      selected_option_index: Number(data.selected_option_index),
      correct_option_index: Number(data.correct_option_index),
      explanation: String(data.explanation),
      attempted: data.attempted == null ? null : Number(data.attempted),
      correct: data.correct == null ? null : Number(data.correct),
      accuracy: data.accuracy == null ? null : Number(data.accuracy),
      consecutive_correct: Number(data.consecutive_correct ?? 0),
      consecutive_incorrect: Number(data.consecutive_incorrect ?? 0),
      next_difficulty:
        data.next_difficulty === "introductory" ||
        data.next_difficulty === "advanced"
          ? data.next_difficulty
          : "intermediate",
      mastery_level:
        data.mastery_level === "mastered" ||
        data.mastery_level === "proficient" ||
        data.mastery_level === "consolidating"
          ? data.mastery_level
          : "emerging",
      next_review_at: typeof data.next_review_at === "string" ? data.next_review_at : null,
      next_action:
        data.next_action === "simplify" ||
        data.next_action === "practice" ||
        data.next_action === "review" ||
        data.next_action === "explore"
          ? data.next_action
          : null,
      next_message: typeof data.next_message === "string" ? data.next_message : null,
      next_micro_assessment: nextAssessment,
    };

    setResult(nextResult);
    onAnswered(nextResult);
  }

  const difficultyLabel = {
    introductory: "Inicial",
    intermediate: "Intermediária",
    advanced: "Avançada",
  }[assessment.difficulty];

  return (
    <div className="mt-5 rounded-xl border border-[#BFDBFE] bg-[#F8FBFF] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0242D7]">
            Microavaliação
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            Nível {difficultyLabel}
            {assessment.concept_tags.length > 0
              ? " · " + assessment.concept_tags.join(" · ")
              : ""}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#64748B]">
          1 questão
        </span>
      </div>

      <p className="mt-4 text-base font-semibold leading-7 text-[#0F172A]">
        {assessment.question}
      </p>

      <div className="mt-4 space-y-2">
        {assessment.options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrect = result?.correct_option_index === index;
          const isWrongSelection = result && isSelected && !result.is_correct;

          let className =
            "w-full rounded-lg border px-4 py-3 text-left text-sm leading-6 transition-colors";

          if (result && isCorrect) {
            className += " border-[#16A34A] bg-[#F0FDF4] text-[#166534]";
          } else if (result && isWrongSelection) {
            className += " border-[#DC2626] bg-[#FEF2F2] text-[#991B1B]";
          } else if (isSelected) {
            className += " border-[#0242D7] bg-[#EFF6FF] text-[#0242D7]";
          } else {
            className += " border-[#E2E8F0] bg-white text-[#334155] hover:border-[#BFDBFE]";
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              disabled={Boolean(result) || submitting}
              className={className}
              aria-pressed={isSelected}
            >
              <span className="mr-2 font-semibold">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {!result && (
        <button
          type="button"
          onClick={() => void answer()}
          disabled={selected === null || submitting}
          className="mt-4 rounded-md bg-[#0242D7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0038B8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Corrigindo…" : "Responder"}
        </button>
      )}

      {result && (
        <div
          className={
            result.is_correct
              ? "mt-4 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-sm leading-6 text-[#166534]"
              : "mt-4 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-4 text-sm leading-6 text-[#9A3412]"
          }
          role="status"
        >
          <p className="font-semibold">
            {result.is_correct ? "Muito bem. Você acertou." : "Ainda não. Vamos entender o raciocínio."}
          </p>
          <p className="mt-1">
            {result.explanation}
          </p>
          {result.attempted !== null && result.correct !== null && (
            <p className="mt-3 text-xs font-medium opacity-80">
              Seu desempenho nas microavaliações deste tópico: {result.correct}/{result.attempted}
              {result.accuracy !== null ? " · " + result.accuracy + "% de aproveitamento" : ""}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B]">
            <span>
              Sequência:{" "}
              <strong className="text-[#334155]">
                {result.is_correct
                  ? result.consecutive_correct + " acerto" + (result.consecutive_correct === 1 ? "" : "s")
                  : result.consecutive_incorrect + " erro" + (result.consecutive_incorrect === 1 ? "" : "s")}
              </strong>
            </span>
            <span>
              Próxima dificuldade:{" "}
              <strong className="text-[#334155]">
                {result.next_difficulty === "introductory"
                  ? "inicial"
                  : result.next_difficulty === "intermediate"
                    ? "intermediária"
                    : "avançada"}
              </strong>
            </span>
            {result.next_review_at && (
              <span>
                Revisão prevista:{" "}
                <strong className="text-[#334155]">
                  {new Date(result.next_review_at).toLocaleDateString("pt-BR")}
                </strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TutorSection({ topicId, topicName }: { topicId: string; topicName: string }) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recommendedAction, setRecommendedAction] = useState<"simplify" | "practice" | "review" | "explore" | null>(null);
  const [microAssessment, setMicroAssessment] = useState<TutorMicroAssessment | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = [
    {
      label: "Explique mais simples",
      message: `Explique este tópico de forma mais simples, como se eu estivesse vendo o assunto pela primeira vez. Preserve a precisão acadêmica.`,
    },
    {
      label: "Dê um exemplo",
      message: `Dê um exemplo prático deste tópico e explique por que o exemplo está correto.`,
    },
    {
      label: "Teste meu conhecimento",
      message: `Faça uma questão de nível intermediário sobre este tópico. Não mostre a resposta ainda; espere eu tentar.`,
    },
    {
      label: "Compare conceitos",
      message: `Compare os conceitos mais importantes deste tópico em uma explicação curta e clara, destacando as diferenças essenciais.`,
    },
  ];

  useEffect(() => {
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;

      const { data: conversation } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("topic_id", topicId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!conversation) return;

      setConversationId(conversation.id);

      const { data: history } = await supabase
        .from("ai_messages")
        .select("id, role, content")
        .eq("conversation_id", conversation.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(30);

      setMessages((history ?? []) as TutorMessage[]);

      const { data: pendingAssessment } = await supabase
        .from("ai_micro_assessments")
        .select("id, question_text, options, difficulty, concept_tags")
        .eq("user_id", userId)
        .eq("topic_id", topicId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingAssessment) {
        setMicroAssessment({
          id: pendingAssessment.id,
          question: pendingAssessment.question_text,
          options: Array.isArray(pendingAssessment.options)
            ? pendingAssessment.options.filter((value): value is string => typeof value === "string")
            : [],
          difficulty:
            pendingAssessment.difficulty === "introductory" ||
            pendingAssessment.difficulty === "advanced"
              ? pendingAssessment.difficulty
              : "intermediate",
          concept_tags: Array.isArray(pendingAssessment.concept_tags)
            ? pendingAssessment.concept_tags
            : [],
        });
      }
    })();
  }, [topicId]);

  useEffect(() => {
    if (opened) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages, loading, opened]);

  async function sendMessage(prefilledMessage?: string) {
    const message = (prefilledMessage ?? input).trim();
    if (!message || loading) return;

    setLoading(true);
    setInput("");
    setErrorMessage(null);
    setRecommendedAction(null);

    const localId = "local-" + Date.now();
    setMessages((current) => [
      ...current,
      { id: localId, role: "user", content: message },
    ]);

    const { data, error } = await supabase.functions.invoke("ai-tutor", {
      body: {
        topic_id: topicId,
        conversation_id: conversationId,
        message,
      },
    });

    setLoading(false);

    if (error || !data?.message) {
      let messageText = data?.error;

      if (!messageText && error) {
        try {
          const response = (error as { context?: Response }).context;
          if (response) {
            const payload = (await response.clone().json()) as { error?: string };
            messageText = payload.error;
          }
        } catch {
          // Keep the generic message below when the function error has no JSON body.
        }
      }

      setMessages((current) =>
        current.filter((item) => item.id !== localId),
      );
      setInput(message);
      setErrorMessage(
        messageText ?? "Não foi possível responder agora. Tente novamente.",
      );
      return;
    }

    setConversationId(data.conversation_id ?? conversationId);
    if (data.micro_assessment) {
      setMicroAssessment({
        id: data.micro_assessment.id,
        question: data.micro_assessment.question,
        options: data.micro_assessment.options,
        difficulty: data.micro_assessment.difficulty,
        concept_tags: data.micro_assessment.concept_tags,
      });
    }
    setRecommendedAction(
      data.learning_action === "simplify" ||
      data.learning_action === "practice" ||
      data.learning_action === "review" ||
      data.learning_action === "explore"
        ? data.learning_action
        : null,
    );
    setMessages((current) => [
      ...current,
      {
        id: "assistant-" + Date.now(),
        role: "assistant",
        content: data.message,
      },
    ]);
  }

  return (
    <section aria-labelledby="tutor-heading" className="mt-12">
      <div className="border-t border-[#E2E8F0] pt-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
              Tutor Ensina-me
            </p>
            <h2 id="tutor-heading" className="mt-2 text-2xl font-semibold text-[#0F172A]">
              Tire dúvidas sobre este tópico
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
              O tutor usa o conteúdo deste tópico para explicar, fazer perguntas e ajudar você a raciocinar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpened((value) => !value)}
            className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#0242D7]"
            aria-expanded={opened}
          >
            {opened ? "Fechar tutor" : "Abrir tutor"}
          </button>
        </div>

        {opened && (
          <div className="mt-5 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <div
              className="max-h-[28rem] space-y-4 overflow-y-auto p-5"
              aria-live="polite"
              aria-busy={loading}
            >
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm leading-6 text-[#991B1B]"
                >
                  {errorMessage}
                </div>
              )}

              {messages.length === 0 && (
                <div className="rounded-lg bg-[#F8FAFC] p-4 text-sm leading-6 text-[#475569]">
                  <strong className="text-[#0F172A]">{topicName}</strong>
                  <br />
                  Comece com uma dúvida, peça uma explicação em linguagem mais simples ou peça um exemplo.
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] rounded-xl bg-[#0242D7] px-4 py-3 text-sm leading-6 text-white"
                      : "max-w-[90%] rounded-xl bg-[#F8FAFC] px-4 py-3 text-sm leading-6 text-[#334155]"
                  }
                >
                  {message.role === "assistant"
                    ? <div className="space-y-1">{renderTutorContent(message.content)}</div>
                    : message.content}
                </div>
              ))}

              {loading && (
                <div className="max-w-[90%] rounded-xl bg-[#F8FAFC] px-4 py-3 text-sm text-[#64748B]">
                  Pensando com base no tópico…
                </div>
              )}

              {microAssessment && (
                <TutorMicroAssessmentCard
                  key={microAssessment.id}
                  assessment={microAssessment}
                  onAnswered={(result) => {
                    if (result.next_message) {
                      setMessages((current) => [
                        ...current,
                        {
                          id: "adaptive-" + Date.now(),
                          role: "assistant",
                          content: result.next_message!,
                        },
                      ]);
                    }

                    if (result.next_micro_assessment) {
                      setMicroAssessment(result.next_micro_assessment);
                      setRecommendedAction(null);
                    } else {
                      setMicroAssessment(null);
                      setRecommendedAction(result.next_action);
                    }
                  }}
                />
              )}

              <div ref={messageEndRef} aria-hidden="true" />
            </div>

            <div className="border-t border-[#E2E8F0] p-4">
              {recommendedAction && (
                <div className="mb-3 rounded-lg border border-[#DBEAFE] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0242D7]">
                    Próximo passo
                  </p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[#475569]">
                      {recommendedAction === "simplify"
                        ? "Vamos reconstruir esse conceito de um jeito mais simples."
                        : recommendedAction === "practice"
                          ? "Agora vale testar se você realmente consegue aplicar a ideia."
                          : recommendedAction === "review"
                            ? "Uma revisão rápida pode consolidar o que você acabou de estudar."
                            : "Continue explorando o tópico e conectando os conceitos."}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void sendMessage(
                          recommendedAction === "simplify"
                            ? "Explique novamente de forma mais simples e use um exemplo correto."
                            : recommendedAction === "practice"
                              ? "Faça uma questão de nível intermediário e espere minha resposta antes de corrigir."
                              : recommendedAction === "review"
                                ? "Faça uma revisão rápida dos conceitos essenciais deste tópico."
                                : "Faça uma pergunta orientadora que me ajude a aprofundar este tópico.",
                        )
                      }
                      disabled={loading}
                      className="rounded-md border border-[#BFDBFE] bg-white px-3 py-1.5 text-xs font-semibold text-[#0242D7] hover:bg-[#EFF6FF] disabled:opacity-50"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-3 flex flex-wrap gap-2" aria-label="Atalhos do Tutor">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => void sendMessage(prompt.message)}
                    disabled={loading}
                    className="rounded-full border border-[#BFDBFE] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#0242D7] transition-colors hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
              <textarea
                aria-label="Mensagem para o tutor Ensina-me"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={3}
                maxLength={4000}
                placeholder="Ex.: explique a diferença entre alfabetização e letramento."
                className="w-full resize-none rounded-lg border border-[#E2E8F0] px-4 py-3 text-sm text-[#334155] outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/20"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-[#94A3B8]">
                  {input.length}/4000 · Enter envia · Shift+Enter cria uma nova linha
                </p>
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={loading || input.trim().length === 0}
                  className="rounded-md bg-[#0242D7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0038B8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Exercise option ─────────────────────────────────────────────────────────

function ExerciseOptionItem({
  option,
  isSelected,
  isRevealed,
  onSelect,
}: {
  option: ExerciseOption;
  isSelected: boolean;
  isRevealed: boolean;
  onSelect: () => void;
}) {
  let optionClass =
    "w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer";

  if (isSelected && !isRevealed) {
    optionClass += " border-[#0242D7] bg-[#EFF6FF] text-[#0242D7]";
  } else if (isRevealed && option.is_correct) {
    optionClass += " border-[#16A34A] bg-[#F0FDF4] text-[#15803D]";
  } else if (isRevealed && isSelected && !option.is_correct) {
    optionClass += " border-[#DC2626] bg-[#FEF2F2] text-[#991B1B]";
  } else {
    optionClass += " border-[#E2E8F0] bg-white text-[#334155] hover:border-[#CBD5E1]";
  }

  return (
    <button
      type="button"
      className={optionClass}
      onClick={onSelect}
      disabled={isRevealed}
    >
      {option.content}
    </button>
  );
}

function StudySessionCard({ topicId }: { topicId: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startedAt) return;
    const update = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const format = (value: number) =>
    [Math.floor(value / 3600), Math.floor((value % 3600) / 60), value % 60]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");

  async function start() {
    setLoading(true);
    const { data, error } = await supabase.rpc("start_study_session", {
      _topic_id: topicId,
    });
    setLoading(false);
    if (error || !data) {
      console.error("[Ensina-me] Erro ao iniciar sessão:", error);
      return;
    }
    const payload = data as { session_id?: string; started_at?: string };
    if (!payload.session_id || !payload.started_at) return;
    setSessionId(payload.session_id);
    setStartedAt(new Date(payload.started_at).getTime());
  }

  async function finish() {
    if (!sessionId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("finish_study_session", {
      _session_id: sessionId,
    });
    setLoading(false);
    if (error || !data) {
      console.error("[Ensina-me] Erro ao finalizar sessão:", error);
      return;
    }
    setSessionId(null);
    setStartedAt(null);
    setSeconds(Number((data as { duration_seconds?: number }).duration_seconds ?? seconds));
  }

  return (
    <section aria-label="Sessão de estudo" className="mt-6 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:mt-8 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">Sessão de estudo</p>
          <p className="mt-1 text-sm text-[#64748B]">
            Estude com foco e registre seu tempo neste tópico.
          </p>
        </div>
        {sessionId ? (
          <button
            type="button"
            onClick={finish}
            disabled={loading}
            className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#0242D7]"
          >
            {loading ? "Salvando..." : "Encerrar sessão"}
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={loading}
            className="rounded-md bg-[#0242D7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0038B8]"
          >
            {loading ? "Iniciando..." : "Começar sessão"}
          </button>
        )}
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight text-[#0F172A]">
        {format(seconds)}
      </div>
    </section>
  );
}

// ─── Exercise question ────────────────────────────────────────────────────────

function ExerciseQuestionItem({
  question,
  selectedOptionId,
  revealedOptionId,
  openText,
  onSelectOption,
  onRevealAnswer,
}: {
  question: ExerciseQuestion;
  selectedOptionId: string | null;
  revealedOptionId: string | null;
  openText: string;
  onSelectOption: (optionId: string) => void;
  onRevealAnswer: () => void;
}) {
  const isMultipleChoice = question.question_type === "multiple_choice";
  const hasSelected = selectedOptionId !== null;
  const selectedOption = question.options?.find((o) => o.id === selectedOptionId);
  const isRevealed = revealedOptionId !== null;

  return (
    <div className="mt-6">
      <p className="text-base font-medium text-[#0F172A]">
        {question.question_text}
      </p>

      {isMultipleChoice && question.options && (
        <div className="mt-3 space-y-2">
          {question.options.map((option) => (
            <ExerciseOptionItem
              key={option.id}
              option={option}
              isSelected={selectedOptionId === option.id}
              isRevealed={isRevealed}
              onSelect={() => onSelectOption(option.id)}
            />
          ))}
        </div>
      )}

      {!isMultipleChoice && (
        <div className="mt-3">
          <textarea
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#0242D7] focus:outline-none focus:ring-2 focus:ring-[#0242D7] focus:ring-offset-1"
            rows={4}
            placeholder="Digite sua resposta aqui..."
            value={openText}
            onChange={() => {}}
            disabled
          />
          <p className="mt-2 text-xs text-[#94A3B8]">
            A correção de respostas abertas será disponibilizada em breve.
          </p>
        </div>
      )}

      {hasSelected && !isRevealed && (
        <button
          type="button"
          onClick={onRevealAnswer}
          className="mt-4 min-h-11 w-full rounded-xl bg-[#0242D7] px-5 py-2.5 text-sm sm:w-auto font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
        >
          Ver resposta
        </button>
      )}

      {isRevealed && selectedOption && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            selectedOption.is_correct
              ? "border-[#16A34A] bg-[#F0FDF4] text-[#15803D]"
              : "border-[#DC2626] bg-[#FEF2F2] text-[#991B1B]"
          }`}
          role="status"
        >
          <p className="font-medium">
            {selectedOption.is_correct ? "Resposta correta!" : "Resposta incorreta."}
          </p>
          {selectedOption.is_correct && selectedOption.feedback_correct && (
            <p className="mt-1">{selectedOption.feedback_correct}</p>
          )}
          {!selectedOption.is_correct && selectedOption.feedback_incorrect && (
            <p className="mt-1">{selectedOption.feedback_incorrect}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Exercise section ──────────────────────────────────────────────────────────

function ExerciseSection({
  exercises,
  onAnswerRevealed,
}: {
  exercises: Exercise[];
  onAnswerRevealed: (
    questionId: string,
    selectedOptionId: string | null,
    openText: string | null,
  ) => Promise<void>;
}) {
  const QUESTIONS_PER_ROUND = 5;
  const allQuestions = exercises.flatMap((exercise) => exercise.questions ?? []);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(new Set());
  const [shuffledOptionOrders, setShuffledOptionOrders] = useState<Record<string, string[]>>({});
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (allQuestions.length === 0) {
      setQuestionOrder([]);
      return;
    }

    const ids = allQuestions.map((question) => question.id);
    const shuffled = [...ids];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setQuestionOrder(shuffled);
    setRound(0);
    setSelectedOptions({});
    setRevealedQuestions(new Set());
    setShuffledOptionOrders({});
  }, [exercises]);

  useEffect(() => {
    if (allQuestions.length === 0) return;

    setShuffledOptionOrders((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const question of allQuestions) {
        if (
          question.question_type !== "multiple_choice" ||
          !question.options?.length ||
          next[question.id]
        ) {
          continue;
        }

        const ids = question.options.map((option) => option.id);
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }

        next[question.id] = ids;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [exercises]);

  if (allQuestions.length === 0) return null;

  const questionMap = new Map(allQuestions.map((question) => [question.id, question]));
  const visibleQuestionIds = questionOrder.slice(
    round * QUESTIONS_PER_ROUND,
    (round + 1) * QUESTIONS_PER_ROUND,
  );
  const visibleQuestions = visibleQuestionIds
    .map((id) => questionMap.get(id))
    .filter(Boolean) as ExerciseQuestion[];

  const answeredThisRound = visibleQuestionIds.filter((id) => revealedQuestions.has(id)).length;
  const roundComplete =
    visibleQuestionIds.length > 0 && answeredThisRound === visibleQuestionIds.length;
  const hasMoreRounds = (round + 1) * QUESTIONS_PER_ROUND < questionOrder.length;

  function handleSelectOption(questionId: string, optionId: string) {
    setSelectedOptions((prev) => ({ ...prev, [questionId]: optionId }));
    setRevealedQuestions((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }

  function getOrderedOptions(question: ExerciseQuestion): ExerciseOption[] {
    if (question.question_type !== "multiple_choice" || !question.options) {
      return question.options ?? [];
    }

    const order = shuffledOptionOrders[question.id];
    if (!order) return question.options;

    const byId = new Map(question.options.map((option) => [option.id, option]));
    return order.map((id) => byId.get(id)).filter(Boolean) as ExerciseOption[];
  }

  async function handleReveal(questionId: string) {
    const selectedOptionId = selectedOptions[questionId] ?? null;
    if (!selectedOptionId) return;

    await onAnswerRevealed(questionId, selectedOptionId, null);
    setRevealedQuestions((prev) => new Set(prev).add(questionId));
  }

  function goToNextRound() {
    if (!hasMoreRounds) return;
    setRound((value) => value + 1);
  }

  function restartPractice() {
    const ids = allQuestions.map((question) => question.id);
    const shuffled = [...ids];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setQuestionOrder(shuffled);
    setRound(0);
    setSelectedOptions({});
    setRevealedQuestions(new Set());

    setShuffledOptionOrders((prev) => {
      const next = { ...prev };
      for (const question of allQuestions) {
        const options = question.options?.map((option) => option.id) ?? [];
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        if (options.length > 0) next[question.id] = options;
      }
      return next;
    });
  }

  const roundNumber = round + 1;
  const roundProgress = visibleQuestions.length
    ? Math.round((answeredThisRound / visibleQuestions.length) * 100)
    : 0;

  return (
    <section aria-labelledby="exercises-heading" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="exercises-heading" className="text-lg font-semibold text-[#0F172A]">
            Prática guiada
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#64748B]">
            Pratique 5 questões por rodada. Você recebe o feedback após cada resposta e pode
            continuar sem enfrentar todo o banco de uma vez.
          </p>
        </div>

        <div className="text-right text-xs text-[#64748B]">
          <p className="font-semibold text-[#0F172A]">
            Rodada {roundNumber} de {Math.max(1, Math.ceil(questionOrder.length / QUESTIONS_PER_ROUND))}
          </p>
          <p className="mt-0.5">{allQuestions.length} questões disponíveis neste tópico</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-[#0F172A]">
            Progresso da rodada
          </span>
          <span className="text-[#64748B]">
            {answeredThisRound} de {visibleQuestions.length} respondidas
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
          <div
            className="h-full rounded-full bg-[#0242D7] transition-all"
            style={{ width: `${roundProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {visibleQuestions.map((question) => {
          const orderedQuestion = { ...question, options: getOrderedOptions(question) };

          return (
            <div key={question.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-6">
              <ExerciseQuestionItem
                question={orderedQuestion}
                selectedOptionId={selectedOptions[question.id] ?? null}
                revealedOptionId={
                  revealedQuestions.has(question.id)
                    ? selectedOptions[question.id] ?? null
                    : null
                }
                openText=""
                onSelectOption={(optionId) => handleSelectOption(question.id, optionId)}
                onRevealAnswer={() => handleReveal(question.id)}
              />
            </div>
          );
        })}
      </div>

      {roundComplete && (
        <div className="mt-6 rounded-xl border border-[#BFDBFE] bg-[#F8FBFF] p-5">
          <p className="text-sm font-semibold text-[#0F172A]">
            Rodada concluída.
          </p>
          <p className="mt-1 text-sm leading-6 text-[#475569]">
            Ótimo. A ideia é recuperar o que você aprendeu, receber feedback e continuar avançando
            em pequenas etapas.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {hasMoreRounds ? (
              <button
                type="button"
                onClick={goToNextRound}
                className="rounded-lg bg-[#0242D7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0038B8]"
              >
                Continuar com mais 5
              </button>
            ) : (
              <button
                type="button"
                onClick={restartPractice}
                className="rounded-lg border border-[#BFDBFE] bg-white px-4 py-2.5 text-sm font-semibold text-[#0242D7] hover:bg-[#EFF6FF]"
              >
                Fazer nova rodada
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ReviewSection({ difficulties }: { difficulties: TopicDifficulty[] }) {
  if (difficulties.length === 0) return null;

  const label = (tag: string) =>
    tag
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <section aria-labelledby="review-heading" className="mt-12">
      <div className="border-t border-[#E2E8F0] pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D97706]">
          Próxima revisão
        </p>
        <h2 id="review-heading" className="mt-2 text-2xl font-semibold text-[#0F172A]">
          Pontos que merecem atenção
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
          O Ensina-me identificou estes temas a partir das suas respostas. Eles entram como prioridade para revisão.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {difficulties.map((difficulty) => (
            <div
              key={difficulty.difficulty_tag}
              className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-[#0F172A]">{label(difficulty.difficulty_tag)}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#92400E]">
                  {difficulty.count} {difficulty.count === 1 ? "registro" : "registros"}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#64748B]">
                {difficulty.review_status === "reviewed"
                  ? "Você já acertou uma vez. Continue praticando para consolidar."
                  : "Retome o conceito e pratique novamente antes de uma nova avaliação."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Formal evaluation ─────────────────────────────────────────────────────────

interface FormalEvaluationQuestion {
  id: string;
  position: number;
  question_text: string;
  options: string[];
  option_order?: number[];
  difficulty?: "introductory" | "intermediate" | "advanced";
  concept_tags?: string[];
}

interface FormalEvaluationResult {
  attempt_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  band: "novice" | "developing" | "proficient" | "mastered";
  best_score?: number | null;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function prepareQuestionPresentation(
  sourceQuestions: FormalEvaluationQuestion[],
): FormalEvaluationQuestion[] {
  return shuffle(
    sourceQuestions.map((question) => ({
      ...question,
      option_order: shuffle(question.options.map((_, optionIndex) => optionIndex)),
    })),
  ).map((question, index) => ({
    ...question,
    position: index + 1,
  }));
}

function EvaluationSection({
  topicId,
  onDifficultyUpdate,
}: {
  topicId: string;
  onDifficultyUpdate: () => Promise<void>;
}) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<FormalEvaluationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<FormalEvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    setGenerationError(null);

    const { data, error } = await supabase.rpc("get_formal_evaluation_state", {
      _topic_id: topicId,
    });

    if (error || !data) {
      console.error("[Ensina-me] Erro ao carregar avaliação formal:", error);
      setGenerationError("Não foi possível carregar a avaliação. Tente novamente.");
      setLoading(false);
      return;
    }

    const state = data as {
      status?: string;
      attempt_id?: string;
      total_questions?: number;
      questions?: FormalEvaluationQuestion[];
      score?: number;
      correct_answers?: number;
      completed_at?: string;
    };

    if (state.status === "in_progress" && state.attempt_id) {
      const loadedQuestions = Array.isArray(state.questions)
        ? state.questions.map((question) => ({
            ...question,
            options: Array.isArray(question.options)
              ? question.options.filter((option): option is string => typeof option === "string")
              : [],
          }))
        : [];

      setAttemptId(state.attempt_id);
      setQuestions(prepareQuestionPresentation(loadedQuestions));
      setAnswers({});
      setResult(null);
      setStarted(loadedQuestions.length === 10);
    } else if (
      state.status === "completed" &&
      state.attempt_id &&
      Number(state.total_questions ?? 0) === 10
    ) {
      const score = Number(state.score ?? 0);
      const band =
        score < 40
          ? "novice"
          : score < 65
            ? "developing"
            : score < 85
              ? "proficient"
              : "mastered";

      setAttemptId(state.attempt_id);
      setQuestions([]);
      setAnswers({});
      setStarted(false);
      setResult({
        attempt_id: state.attempt_id,
        score,
        correct_answers: Number(state.correct_answers ?? 0),
        total_questions: 10,
        band,
      });
    } else {
      setAttemptId(null);
      setQuestions([]);
      setAnswers({});
      setResult(null);
      setStarted(false);
    }

    setLoading(false);
  }, [topicId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function startEvaluation() {
    if (loading) return;

    setLoading(true);
    setGenerationError(null);
    setResult(null);
    setStarted(false);
    setAnswers({});
    setQuestions([]);

    const { data, error } = await supabase.functions.invoke("ai-tutor", {
      body: {
        action: "start_formal_evaluation",
        topic_id: topicId,
      },
    });

    if (error || !data?.attempt_id || !Array.isArray(data.questions)) {
      let messageText = data?.error;

      if (!messageText && error) {
        try {
          const response = (error as { context?: Response }).context;
          if (response) {
            const payload = (await response.clone().json()) as { error?: string };
            messageText = payload.error;
          }
        } catch {
          // Keep the friendly fallback below.
        }
      }

      setGenerationError(
        messageText ?? "Não foi possível preparar uma nova avaliação. Tente novamente.",
      );
      setLoading(false);
      return;
    }

    const loadedQuestions = (data.questions as FormalEvaluationQuestion[])
      .map((question) => ({
        ...question,
        options: Array.isArray(question.options)
          ? question.options.filter((option): option is string => typeof option === "string")
          : [],
      }));

    if (loadedQuestions.length !== 10) {
      setGenerationError("A avaliação precisa carregar exatamente 10 questões.");
      setLoading(false);
      return;
    }

    setAttemptId(String(data.attempt_id));
    setQuestions(prepareQuestionPresentation(loadedQuestions));
    setAnswers({});
    setStarted(true);
    setLoading(false);
  }

  async function finishEvaluation() {
    if (!attemptId || questions.length !== 10 || Object.keys(answers).length !== 10) return;

    setLoading(true);

    const answerPayload = questions.map((question) => ({
      question_id: question.id,
      selected_option_index: answers[question.id],
    }));

    const { data, error } = await supabase.rpc("finalize_formal_evaluation", {
      _attempt_id: attemptId,
      _answers: answerPayload,
    });

    setLoading(false);

    if (error || !data) {
      console.error("[Ensina-me] Erro ao finalizar avaliação:", error);
      setGenerationError("Não foi possível finalizar sua avaliação. Tente novamente.");
      return;
    }

    setQuestions([]);
    setAnswers({});
    setStarted(false);
    setResult(data as FormalEvaluationResult);
    await onDifficultyUpdate();
  }

  return (
    <section aria-labelledby="evaluation-heading" className="mt-12">
      <div className="border-t border-[#E2E8F0] pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
          Avaliação do tópico
        </p>
        <h2 id="evaluation-heading" className="mt-2 text-2xl font-semibold text-[#0F172A]">
          Verifique seu domínio
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
          Esta é uma avaliação formal com 10 questões. Cada nova tentativa recebe uma nova prova, com questões e alternativas renovadas e em ordem aleatória.
        </p>

        {generationError && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm leading-6 text-[#991B1B]"
          >
            {generationError}
          </div>
        )}

        {loading && !started && !result && (
          <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
            <div className="h-4 w-48 animate-pulse rounded bg-[#E2E8F0]" />
            <div className="mt-3 h-8 w-72 animate-pulse rounded bg-[#E2E8F0]" />
            <div className="mt-5 h-10 w-40 animate-pulse rounded bg-[#E2E8F0]" />
          </div>
        )}

        {!loading && !started && !result && (
          <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white p-6">
            <p className="text-sm text-[#475569]">
              Você responderá 10 questões de múltipla escolha baseadas no conteúdo deste tópico.
            </p>
            <button
              type="button"
              onClick={() => void startEvaluation()}
              disabled={loading}
              className="mt-5 rounded-md bg-[#0242D7] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Preparando..." : "Iniciar avaliação"}
            </button>
          </div>
        )}

        {started && questions.length === 10 && (
          <div className="mt-6 space-y-7">
            {questions.map((question, index) => {
              const selected = answers[question.id];

              return (
                <div key={question.id} className="rounded-xl border border-[#E2E8F0] bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                    Questão {index + 1} de 10
                  </p>
                  <p className="mt-2 text-base font-medium leading-6 text-[#0F172A]">
                    {question.question_text}
                  </p>

                  <div className="mt-4 space-y-2">
                    {(question.option_order ?? question.options.map((_, index) => index)).map(
                      (sourceOptionIndex, displayIndex) => {
                        const option = question.options[sourceOptionIndex];
                        const selected = answers[question.id];
                        return (
                          <button
                            key={sourceOptionIndex}
                            type="button"
                            onClick={() =>
                              setAnswers((previous) => ({
                                ...previous,
                                [question.id]: sourceOptionIndex,
                              }))
                            }
                            className={
                              selected === sourceOptionIndex
                                ? "w-full rounded-lg border border-[#0242D7] bg-[#EFF6FF] px-4 py-3 text-left text-sm text-[#0242D7]"
                                : "w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-left text-sm text-[#334155] hover:border-[#CBD5E1]"
                            }
                          >
                            {String.fromCharCode(65 + displayIndex)}. {option}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            })}

            <div className="sticky bottom-4 rounded-xl border border-[#BFDBFE] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[#475569]">
                  <strong className="text-[#0F172A]">{Object.keys(answers).length}</strong> de 10 respondidas
                </p>
                <button
                  type="button"
                  onClick={() => void finishEvaluation()}
                  disabled={loading || Object.keys(answers).length !== 10}
                  className="rounded-md bg-[#0242D7] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Calculando..." : "Finalizar avaliação"}
                </button>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-6">
            <p className="text-sm font-semibold text-[#0242D7]">Resultado da avaliação</p>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <div>
                <p className="text-4xl font-bold text-[#0F172A]">{result.score}%</p>
                <p className="mt-1 text-sm text-[#64748B]">
                  {result.correct_answers} de 10 respostas corretas
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#0F172A]">
                {DOMAIN_LABELS[result.band]}
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#475569]">
              Esse resultado fica registrado no seu progresso e poderá orientar as próximas revisões.
            </p>

            <button
              type="button"
              onClick={() => void startEvaluation()}
              disabled={loading}
              className="mt-5 rounded-md border border-[#BFDBFE] bg-white px-4 py-2 text-sm font-semibold text-[#0242D7] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              {loading ? "Preparando nova tentativa..." : "Fazer nova tentativa"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/disciplinas/$disciplineId/$topicId")({
  component: TopicDetailPage,
});

function TopicDetailPage() {
  const { disciplineId, topicId } = Route.useParams();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [disciplineName, setDisciplineName] = useState<string | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [sections, setSections] = useState<MaterialSection[]>([]);
  const [completedSectionIds, setCompletedSectionIds] = useState<string[]>([]);
  const [contentProgress, setContentProgress] = useState({ completed: 0, total: 0 });
  const [citations, setCitations] = useState<MaterialCitation[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [evaluation, setEvaluation] = useState<Exercise | null>(null);
  const [difficulties, setDifficulties] = useState<TopicDifficulty[]>([]);
  const [exerciseProgress, setExerciseProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  const refreshDifficulties = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    const { data } = await supabase
      .from("student_topic_difficulties")
      .select("difficulty_tag, count, review_status")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .eq("review_status", "pending")
      .order("count", { ascending: false });

    setDifficulties((data ?? []) as TopicDifficulty[]);
  }, [topicId]);

  const handleAnswerRevealed = useCallback(
    async (questionId: string, selectedOptionId: string | null, openText: string | null) => {
      const { data, error: answerError } = await supabase.rpc("submit_application_answer", {
        _question_id: questionId,
        _selected_option_id: selectedOptionId,
        _open_text: openText,
      });
      if (answerError) {
        console.error("[Ensina-me] Erro ao salvar resposta:", answerError);
        return;
      }

      const result =
        typeof data === "object" && data !== null
          ? (data as { exercises_completed?: number })
          : null;

      if (typeof result?.exercises_completed === "number") {
        setExerciseProgress(result.exercises_completed);
      }

      await refreshDifficulties();
    },
    [refreshDifficulties],
  );

  const markSectionComplete = useCallback(
    async (sectionId: string) => {
      if (completedSectionIds.includes(sectionId)) return;

      const { data, error: progressError } = await supabase.rpc(
        "mark_material_section_complete",
        { _section_id: sectionId },
      );

      if (progressError) {
        console.error("[Ensina-me] Erro ao salvar progresso do conteúdo:", progressError);
        return;
      }

      const result =
        Array.isArray(data) && data.length > 0
          ? (data[0] as { completed_sections?: number; total_sections?: number })
          : null;

      setCompletedSectionIds((current) =>
        current.includes(sectionId) ? current : [...current, sectionId],
      );

      if (result) {
        setContentProgress({
          completed: result.completed_sections ?? completedSectionIds.length + 1,
          total: result.total_sections ?? sections.length,
        });
      }
    },
    [completedSectionIds, sections.length],
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setNotFound(false);
      setError(false);
      setTopic(null);
      setDisciplineName(null);
      setMaterial(null);
      setSections([]);
      setCompletedSectionIds([]);
      setContentProgress({ completed: 0, total: 0 });
      setCitations([]);
      setExercises([]);
      setEvaluation(null);
      setDifficulties([]);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;

      // Step 1: Resolve either a student's selected discipline or a published catalog discipline.
      const { data: studentDiscData, error: studentDiscError } = await supabase
        .from("student_disciplines")
        .select("id, discipline_name, course")
        .eq("id", disciplineId)
        .eq("user_id", userId)
        .maybeSingle();

      if (studentDiscError) {
        setError(true);
        setLoading(false);
        return;
      }

      let official: OfficialDiscipline | null = null;

      if (studentDiscData) {
        const studentDisc = studentDiscData as StudentDiscipline;
        const studentNameNorm = normalize(studentDisc.discipline_name);

        const { data: aliasData, error: aliasError } = await supabase
          .from("discipline_aliases")
          .select("discipline_id")
          .eq("normalized_alias", studentNameNorm);

        if (aliasError || !aliasData || aliasData.length !== 1) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const { data: officialDiscData, error: officialError } = await supabase
          .from("disciplines")
          .select("id, name")
          .eq("id", aliasData[0].discipline_id)
          .eq("published", true)
          .maybeSingle();

        if (officialError || !officialDiscData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        official = officialDiscData as OfficialDiscipline;
      } else {
        const { data: catalogDiscData, error: catalogDiscError } = await supabase
          .from("disciplines")
          .select("id, name")
          .eq("id", disciplineId)
          .eq("published", true)
          .maybeSingle();

        if (catalogDiscError || !catalogDiscData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        official = catalogDiscData as OfficialDiscipline;
      }

      setDisciplineName(official.name);

      // Step 4: Fetch the topic
      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .select("id, name, description, discipline_id")
        .eq("id", topicId)
        .eq("discipline_id", official.id)
        .eq("published", true)
        .maybeSingle();

      if (topicError) {
        setError(true);
        setLoading(false);
        return;
      }

      if (!topicData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTopic(topicData as TopicDetail);

      // Step 5: Fetch published material
      const { data: materialData } = await supabase
        .from("materials")
        .select("id, topic_id, title, introduction, status")
        .eq("topic_id", (topicData as TopicDetail).id)
        .eq("status", "published")
        .maybeSingle();

      if (materialData) {
        const mat = materialData as Material;
        setMaterial(mat);

        // Step 6: Fetch sections
        const { data: sectionsData } = await supabase
          .from("material_sections")
          .select("id, material_id, title, content, position, section_type")
          .eq("material_id", mat.id)
          .order("position", { ascending: true });

        const loadedSections = (sectionsData as MaterialSection[]) ?? [];
        setSections(loadedSections);
        setContentProgress({ completed: 0, total: loadedSections.length });

        const { data: sectionProgressData } = await supabase
          .from("student_material_section_progress")
          .select("section_id")
          .eq("user_id", userId)
          .in(
            "section_id",
            loadedSections.map((section) => section.id),
          );

        const completedIds = (sectionProgressData ?? []).map((row) => row.section_id);
        setCompletedSectionIds(completedIds);
        setContentProgress({
          completed: completedIds.length,
          total: loadedSections.length,
        });

        // Step 7: Fetch citations
        const { data: citationsData } = await supabase
          .from("material_citations")
          .select("id, material_id, source_id, citation_label, locator")
          .eq("material_id", mat.id);

        const rawCitations = (citationsData ?? []) as MaterialCitation[];

        if (rawCitations.length > 0) {
          const sourceIds = rawCitations.map((c) => c.source_id);
          const { data: sourcesData } = await supabase
            .from("sources")
            .select("id, title, authors, publication_date, doi, canonical_url")
            .in("id", sourceIds);

          const sourcesMap: Record<string, Source> = {};
          (sourcesData ?? []).forEach((src) => {
            sourcesMap[src.id] = src as Source;
          });

          const enriched = rawCitations.map((cit) => ({
            ...cit,
            source: sourcesMap[cit.source_id],
          }));

          setCitations(enriched);
        }
      }

      // Step 8: Load persisted learning signals.
      const { data: difficultyData } = await supabase
        .from("student_topic_difficulties")
        .select("difficulty_tag, count, review_status")
        .eq("user_id", userId)
        .eq("topic_id", topicId)
        .neq("review_status", "mastered")
        .order("count", { ascending: false });

      setDifficulties((difficultyData ?? []) as TopicDifficulty[]);

      // Step 9: Fetch evaluation and application exercises
      const { data: evaluationData } = await supabase
        .from("exercises")
        .select("id, topic_id, title, exercise_type, content, difficulty, position")
        .eq("topic_id", topicId)
        .eq("exercise_type", "evaluation")
        .eq("published", true)
        .order("position", { ascending: true })
        .limit(1);

      const loadedEvaluation = (evaluationData ?? [])[0] as Exercise | undefined;

      if (loadedEvaluation) {
        const { data: evalQuestionsData } = await supabase
          .from("exercise_questions")
          .select("id, exercise_id, question_text, question_type, position, feedback_hint, difficulty_tag")
          .eq("exercise_id", loadedEvaluation.id)
          .order("position", { ascending: true });

        const evalQuestions = (evalQuestionsData ?? []) as ExerciseQuestion[];
        const evalQuestionIds = evalQuestions
          .filter((q) => q.question_type === "multiple_choice")
          .map((q) => q.id);

        const evalOptionsByQuestion: Record<string, ExerciseOption[]> = {};
        if (evalQuestionIds.length > 0) {
          const { data: evalOptionsData } = await supabase
            .from("exercise_options")
            .select("id, question_id, content, is_correct, feedback_correct, feedback_incorrect, position")
            .in("question_id", evalQuestionIds)
            .order("position", { ascending: true });

          for (const opt of (evalOptionsData ?? []) as ExerciseOption[]) {
            if (!evalOptionsByQuestion[opt.question_id]) evalOptionsByQuestion[opt.question_id] = [];
            evalOptionsByQuestion[opt.question_id].push(opt);
          }
        }

        setEvaluation({
          ...loadedEvaluation,
          questions: evalQuestions.map((q) => ({
            ...q,
            options: evalOptionsByQuestion[q.id] ?? [],
          })),
        });
      }

      // Step 9: Fetch application exercises
      const { data: exercisesData } = await supabase
        .from("exercises")
        .select("id, topic_id, title, exercise_type, content, difficulty, position")
        .eq("topic_id", topicId)
        .eq("exercise_type", "application")
        .eq("published", true)
        .order("position", { ascending: true });

      const loadedExercises = (exercisesData ?? []) as Exercise[];

      if (loadedExercises.length > 0) {
        // Fetch questions for each exercise
        const exerciseIds = loadedExercises.map((e) => e.id);
        const { data: questionsData } = await supabase
          .from("exercise_questions")
          .select("id, exercise_id, question_text, question_type, position, feedback_hint, difficulty_tag")
          .in("exercise_id", exerciseIds)
          .order("position", { ascending: true });

        const questions = (questionsData ?? []) as ExerciseQuestion[];

        // Group questions by exercise
        const questionsByExercise: Record<string, ExerciseQuestion[]> = {};
        for (const q of questions) {
          if (!questionsByExercise[q.exercise_id]) {
            questionsByExercise[q.exercise_id] = [];
          }
          questionsByExercise[q.exercise_id].push(q);
        }

        // Fetch options for questions with multiple choice
        const questionIds = questions
          .filter((q) => q.question_type === "multiple_choice")
          .map((q) => q.id);

        const optionsByQuestion: Record<string, ExerciseOption[]> = {};
        if (questionIds.length > 0) {
          const { data: optionsData } = await supabase
            .from("exercise_options")
            .select("id, question_id, content, is_correct, feedback_correct, feedback_incorrect, position")
            .in("question_id", questionIds)
            .order("position", { ascending: true });

          const allOptions = (optionsData ?? []) as ExerciseOption[];
          for (const opt of allOptions) {
            if (!optionsByQuestion[opt.question_id]) {
              optionsByQuestion[opt.question_id] = [];
            }
            optionsByQuestion[opt.question_id].push(opt);
          }
        }

        // Assemble exercises with questions and options
        const enrichedExercises = loadedExercises.map((e) => ({
          ...e,
          questions: (questionsByExercise[e.id] ?? []).map((q) => ({
            ...q,
            options: optionsByQuestion[q.id] ?? [],
          })),
        }));

        setExercises(enrichedExercises);

        // Load persisted progress for this topic.
        const { data: progressData } = await supabase
          .from("student_topic_progress")
          .select("exercises_completed")
          .eq("user_id", userId)
          .eq("topic_id", topicId)
          .maybeSingle();

        setExerciseProgress(progressData?.exercises_completed ?? 0);
      }

      setLoading(false);
    };

    loadData();
  }, [disciplineId, topicId]);

  return (
    <section aria-labelledby="topic-title">
      {/* ── Breadcrumb ── */}
      <nav
        aria-label="Navegação"
        className="mobile-scroll-x -mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 text-sm text-[#64748B]"
      >
        <Link
          to="/app/dashboard"
          className="shrink-0 whitespace-nowrap hover:text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
        >
          Dashboard
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to="/app/disciplinas"
          className="hover:text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
        >
          Disciplinas
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to="/app/disciplinas/$disciplineId"
          params={{ disciplineId }}
          className="hover:text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
        >
          {disciplineName ?? "Disciplina"}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="shrink-0 whitespace-nowrap text-[#0F172A]" aria-current="page">
          {topic?.name ?? "Tópico"}
        </span>
      </nav>

      {/* ── Topic header ── */}
      <div className="mt-5 rounded-[20px] bg-[#F0F5FF] p-5 sm:mt-6 sm:rounded-[22px] sm:p-7">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0242D7]">
            Tópico de estudo
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6B7A8E]">
            {disciplineName ?? "Disciplina"}
          </p>
        </div>
        <h1
          id="topic-title"
          className="mt-3 text-[28px] font-bold leading-[1.08] tracking-[-0.045em] text-[#172334] sm:text-[38px]"
        >
          {topic?.name ?? "Carregando..."}
        </h1>
        {topic?.description && (
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#617083]">
            {topic.description}
          </p>
        )}
      </div>

      {/* ── Study map ── */}
      {!loading && !error && !notFound && sections.length > 0 && (
        <nav
          aria-label="Mapa do estudo"
          className="surface-card mt-4 rounded-2xl p-4 sm:mt-5 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A95A3]">Percurso</p><p className="mt-1 text-sm font-bold text-[#243245]">Mapa do estudo</p></div>
            <span className="text-xs text-[#64748B]">
              {contentProgress.completed}/{contentProgress.total} partes estudadas
            </span>
          </div>
          <div className="mobile-scroll-x mt-3 flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className={
                  completedSectionIds.includes(section.id)
                    ? "shrink-0 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1.5 text-xs font-semibold text-[#166534]"
                    : "rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#475569] hover:border-[#BFDBFE] hover:text-[#0242D7]"
                }
              >
                {completedSectionIds.includes(section.id) ? "✓ " : ""}
                {section.title}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* ── Loading ── */}
      {loading && <TopicSkeleton />}

      {/* ── Error ── */}
      {!loading && error && <ErrorState />}

      {/* ── Not found ── */}
      {!loading && !error && notFound && <NotFound />}

      {/* ── Topic learning content ── */}
      {!loading && !error && !notFound && (
        <div className="mt-7">
          {material ? (
            <>
              <div className="mb-5 px-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B96A5]">Conteúdo principal</p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-[#172334] sm:text-[28px]">
                  {material.title}
                </h2>
                {material.introduction && (
                  <div className="mt-4 text-base leading-7 text-[#334155]">
                    {renderParagraphs(material.introduction)}
                  </div>
                )}
              </div>

              <div
                className="muted-panel mb-5 rounded-2xl p-4 sm:p-5"
                aria-label="Progresso do conteúdo"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#0F172A]">
                    Progresso do conteúdo
                  </span>
                  <span className="text-[#64748B]">
                    {contentProgress.completed} de {contentProgress.total} partes estudadas
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-full rounded-full bg-[#16A34A] transition-all"
                    style={{
                      width:
                        (contentProgress.total > 0
                          ? Math.round(
                              (contentProgress.completed / contentProgress.total) * 100,
                            )
                          : 0) + "%",
                    }}
                  />
                </div>
              </div>

              {sections.map((section) => (
                <MaterialSectionItem
                  key={section.id}
                  section={section}
                  completed={completedSectionIds.includes(section.id)}
                  onComplete={() => void markSectionComplete(section.id)}
                />
              ))}
            </>
          ) : (
            <ContentPlaceholder />
          )}

          <StudySessionCard topicId={topicId} />

          <section
            aria-label="Progresso dos exercícios"
            className="mt-8 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569]"
          >
            <span className="font-medium text-[#0F172A]">Progresso:</span>{" "}
            {exerciseProgress} de {exercises.length} exercícios respondidos
          </section>

          <ExerciseSection
            exercises={exercises}
            onAnswerRevealed={handleAnswerRevealed}
          />

          <SourcesSection citations={citations} />
          <ReviewSection difficulties={difficulties} />
          <EvaluationSection
            topicId={topicId}
            onDifficultyUpdate={refreshDifficulties}
          />
          <TutorSection topicId={topicId} topicName={topic?.name ?? "este tópico"} />
        </div>
      )}
    </section>
  );
}
