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
