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


/** Decode numeric character references as text and remove model-added choice prefixes. */
export function normalizeQuestionOptionText(value: string): string {
  const decoded = value.replace(
    /&#(?:x([0-9a-f]{1,6})|([0-9]{1,7}));/gi,
    (entity, hexadecimal: string | undefined, decimal: string | undefined) => {
      const codePoint = Number.parseInt(hexadecimal ?? decimal ?? "", hexadecimal ? 16 : 10);
      if (
        !Number.isInteger(codePoint) ||
        codePoint < 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) return entity;
      return String.fromCodePoint(codePoint);
    },
  );
  return decoded.trim().replace(/^(?:[A-D]|[1-4])\s*[.)\-:]\s+/i, "").trim();
}

/** Detect a confirmed photosynthesis misconception in the keyed answer or its explanation. */
export function hasPhotosynthesisOxygenAttributionError(args: {
  question: string;
  correctOption: string;
  explanation: string;
}): boolean {
  const combined = normalized(`${args.question} ${args.correctOption} ${args.explanation}`)
    .replace(/₂/g, "2");
  if (!/\b(fotossintese|photosynthesis|clorofila|calvin|nadph)\b/.test(combined)) return false;

  return [args.correctOption, args.explanation].some((value) => {
    const claim = normalized(value).replace(/₂/g, "2");
    return /\b(fase escura|ciclo de calvin)\b/.test(claim)
      && /\b(o2|oxigenio)\b/.test(claim)
      && /\b(libera(?:r|do|da|ndo|cao)?|produz(?:ir|ido|ida|indo|cao)?|gera(?:r|do|da|ndo|cao)?|subproduto)\b/.test(claim)
      && !/\b(nao|nunca|jamais)\b/.test(claim);
  });
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


export type AcademicSectionExcerpt = {
  title: string;
  content: string;
  position?: number;
};

export function selectRelevantAcademicSections<T extends AcademicSectionExcerpt>(
  sections: T[],
  learnerContext: string,
  maxSections = 2,
): T[] {
  const limit = Math.max(0, Math.min(3, Math.floor(maxSections)));
  if (limit === 0 || sections.length === 0) return [];

  const terms = new Set(
    normalized(learnerContext)
      .match(/[a-z0-9]+/g)
      ?.filter((word) => word.length > 3) ?? [],
  );
  if (terms.size === 0) return sections.slice(0, limit);

  return sections
    .map((section, index) => {
      const titleWords = normalized(section.title).match(/[a-z0-9]+/g) ?? [];
      const contentWords = normalized(section.content).match(/[a-z0-9]+/g) ?? [];
      let score = 0;
      for (const word of titleWords) {
        if (terms.has(word) && word.length > 3) score += 3;
      }
      for (const word of contentWords) {
        if (terms.has(word) && word.length > 3) score += 1;
      }
      return { section, index, score };
    })
    .sort((a, b) => b.score - a.score
      || (a.section.position ?? a.index) - (b.section.position ?? b.index)
      || a.index - b.index)
    .slice(0, limit)
    .map(({ section }) => section);
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
  clientRequestId: string;
  userQuestion: string;
}): Promise<string> {
  const canonicalQuestion = args.userQuestion.trim().normalize("NFC").replace(/\s+/g, " ");
  const input = [
    args.userId,
    args.topicId,
    args.conversationId ?? "no-conversation",
    args.clientRequestId.trim(),
    canonicalQuestion,
  ].join("\u001f");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
