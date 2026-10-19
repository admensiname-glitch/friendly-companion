export type InitialQuestionCandidate = {
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  difficulty: "introductory" | "intermediate" | "advanced";
  concept_tags: string[];
};

export type InitialAttempt = {
  question: InitialQuestionCandidate | null;
  retryAfterSeconds?: number | null;
};

export type InitialQuestionPublicView = {
  id: string;
  question: string;
  options: string[];
  difficulty: InitialQuestionCandidate["difficulty"];
  concept_tags: string[];
};

export type InitialQuestionFlowResult =
  | { kind: "saved"; microAssessment: InitialQuestionPublicView; attempts: number }
  | { kind: "rate_limited"; retryAfterSeconds: number; attempts: number }
  | { kind: "unavailable"; reason: "invalid_or_duplicate" | "save_failed"; attempts: number };

type InitialQuestionFlowArgs = {
  generate: (attempt: number) => Promise<InitialAttempt>;
  isDuplicate: (question: InitialQuestionCandidate) => boolean;
  save: (question: InitialQuestionCandidate) => Promise<{ id: string } | null>;
  maxAttempts?: number;
  waitBeforeRetry?: (attempt: number) => Promise<void>;
};

const MAX_INITIAL_GENERATION_ATTEMPTS = 2;
const activeInitialQuestionFlights = new Map<string, Promise<unknown>>();

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function isValidInitialQuestion(question: InitialQuestionCandidate): boolean {
  if (typeof question.question !== "string" || question.question.trim().length < 8) return false;
  if (typeof question.explanation !== "string" || question.explanation.trim().length < 8) return false;
  if (!Array.isArray(question.options) || question.options.length !== 4) return false;
  if (question.options.some((option) => typeof option !== "string" || !option.trim())) return false;
  if (new Set(question.options.map(normalized)).size !== 4) return false;
  if (!Number.isInteger(question.correct_option_index) || question.correct_option_index < 0 || question.correct_option_index > 3) return false;
  if (!["introductory", "intermediate", "advanced"].includes(question.difficulty)) return false;
  if (!Array.isArray(question.concept_tags) || question.concept_tags.length > 3) return false;
  if (question.concept_tags.some((tag) => typeof tag !== "string" || !tag.trim())) return false;
  return true;
}

export function retryAfterSecondsFromResponse(
  headers: Headers,
  providerMessage = "",
  defaultSeconds = 30,
  nowMs = Date.now(),
): number {
  const header = headers.get("retry-after")?.trim();
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return Math.max(1, Math.min(120, Math.ceil(seconds)));
    const dateMs = Date.parse(header);
    if (Number.isFinite(dateMs) && dateMs > nowMs) {
      return Math.max(1, Math.min(120, Math.ceil((dateMs - nowMs) / 1000)));
    }
  }

  const match = providerMessage.match(/(?:try again|retry|wait)(?:\s+in)?\s+([0-9]+(?:\.[0-9]+)?)\s*(?:seconds?|secs?|s)\b/i);
  const parsed = match ? Number(match[1]) : defaultSeconds;
  const fallback = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  return Math.max(1, Math.min(120, Math.ceil(fallback)));
}

export async function runInitialQuestionFlow(args: InitialQuestionFlowArgs): Promise<InitialQuestionFlowResult> {
  const requestedAttempts = Number.isFinite(args.maxAttempts)
    ? Math.floor(args.maxAttempts ?? MAX_INITIAL_GENERATION_ATTEMPTS)
    : MAX_INITIAL_GENERATION_ATTEMPTS;
  const maxAttempts = Math.max(1, Math.min(MAX_INITIAL_GENERATION_ATTEMPTS, requestedAttempts));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let generated: InitialAttempt;
    try {
      generated = await args.generate(attempt);
    } catch {
      if (attempt < maxAttempts) {
        await (args.waitBeforeRetry?.(attempt) ?? new Promise((resolve) => setTimeout(resolve, 400 * attempt)));
      }
      continue;
    }

    if (typeof generated.retryAfterSeconds === "number" && generated.retryAfterSeconds > 0) {
      return {
        kind: "rate_limited",
        retryAfterSeconds: Math.max(1, Math.min(120, Math.ceil(generated.retryAfterSeconds))),
        attempts: attempt,
      };
    }
    if (!generated.question || !isValidInitialQuestion(generated.question) || args.isDuplicate(generated.question)) {
      if (attempt < maxAttempts) {
        await (args.waitBeforeRetry?.(attempt) ?? new Promise((resolve) => setTimeout(resolve, 400 * attempt)));
      }
      continue;
    }

    let saved: { id: string } | null;
    try {
      saved = await args.save(generated.question);
    } catch {
      saved = null;
    }
    if (!saved?.id) return { kind: "unavailable", reason: "save_failed", attempts: attempt };

    return {
      kind: "saved",
      attempts: attempt,
      microAssessment: {
        id: saved.id,
        question: generated.question.question,
        options: generated.question.options,
        difficulty: generated.question.difficulty,
        concept_tags: generated.question.concept_tags,
      },
    };
  }
  return { kind: "unavailable", reason: "invalid_or_duplicate", attempts: maxAttempts };
}

export function runInitialQuestionFlowOnce<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const active = activeInitialQuestionFlights.get(key);
  if (active) return active as Promise<T>;

  const pending = Promise.resolve()
    .then(operation)
    .finally(() => {
      if (activeInitialQuestionFlights.get(key) === pending) activeInitialQuestionFlights.delete(key);
    });
  activeInitialQuestionFlights.set(key, pending);
  return pending;
}

export async function createInitialIdempotencyKey(args: {
  userId: string;
  topicId: string;
  conversationId: string | null;
  clientRequestId?: string | null;
  userQuestion: string;
  tutorAnswer: string;
}): Promise<string> {
  const requestIdentity = args.clientRequestId?.trim()
    ? "message:" + args.clientRequestId.trim()
    : "content:" + args.userQuestion.trim() + "\u0000" + args.tutorAnswer.trim();
  const input = [
    args.userId,
    args.topicId,
    args.conversationId ?? "no-conversation",
    requestIdentity,
    args.userQuestion.trim(),
    args.tutorAnswer.trim(),
  ].join("\u001f");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
