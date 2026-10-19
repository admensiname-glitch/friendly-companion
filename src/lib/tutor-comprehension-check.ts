export type InitialComprehensionCheckRequest = {
  action: "generate_initial_microassessment";
  topic_id: string;
  conversation_id: string | null;
  idempotency_key: string;
  message: string;
  answer_context: string;
};

export function shouldRequestInitialComprehensionCheck(args: {
  shouldGenerate: unknown;
  responseAssessment: unknown;
  existingAssessment: unknown;
  alreadyLoading: boolean;
}): boolean {
  return args.shouldGenerate === true
    && !args.responseAssessment
    && !args.existingAssessment
    && !args.alreadyLoading;
}

export function buildInitialComprehensionCheckRequest(args: {
  topicId: string;
  conversationId: string | null;
  userMessageId: string;
  message: string;
  answerContext: string;
}): InitialComprehensionCheckRequest {
  return {
    action: "generate_initial_microassessment",
    topic_id: args.topicId,
    conversation_id: args.conversationId,
    idempotency_key: args.userMessageId,
    message: args.message,
    answer_context: args.answerContext,
  };
}


/** Normalize legacy and newly generated choice text for safe, readable display. */
export function normalizeTutorOptionText(value: string): string {
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
