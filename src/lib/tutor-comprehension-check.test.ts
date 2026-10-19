import { describe, expect, it } from "bun:test";
import {
  buildInitialComprehensionCheckRequest,
  normalizeTutorOptionText,
  shouldRequestInitialComprehensionCheck,
} from "./tutor-comprehension-check";

describe("topic Tutor comprehension-check flow", () => {
  it("requests a complementary question when the backend asks for one and returned none", () => {
    expect(shouldRequestInitialComprehensionCheck({
      shouldGenerate: true,
      responseAssessment: null,
      existingAssessment: null,
      alreadyLoading: false,
    })).toBe(true);
  });

  it("does not generate a second question when the response already includes one", () => {
    expect(shouldRequestInitialComprehensionCheck({
      shouldGenerate: true,
      responseAssessment: { id: "assessment-1" },
      existingAssessment: null,
      alreadyLoading: false,
    })).toBe(false);
  });

  it("does not duplicate an existing pending question or an in-flight generation", () => {
    expect(shouldRequestInitialComprehensionCheck({
      shouldGenerate: true,
      responseAssessment: null,
      existingAssessment: { id: "assessment-pending" },
      alreadyLoading: false,
    })).toBe(false);
    expect(shouldRequestInitialComprehensionCheck({
      shouldGenerate: true,
      responseAssessment: null,
      existingAssessment: null,
      alreadyLoading: true,
    })).toBe(false);
  });

  it("sends the explicit action, stable message ID and explanation context required by the backend", () => {
    expect(buildInitialComprehensionCheckRequest({
      topicId: "topic-1",
      conversationId: "conversation-1",
      userMessageId: "message-1",
      message: "Explique o conceito.",
      answerContext: "A explicação produzida pelo Tutor.",
    })).toEqual({
      action: "generate_initial_microassessment",
      topic_id: "topic-1",
      conversation_id: "conversation-1",
      idempotency_key: "message-1",
      message: "Explique o conceito.",
      answer_context: "A explicação produzida pelo Tutor.",
    });
  });
});

describe("Tutor answer-option presentation", () => {
  it("decodes numeric character references and removes duplicated option labels", () => {
    expect(normalizeTutorOptionText("&#x31;. Captura de luz pela clorofila")).toBe(
      "Captura de luz pela clorofila",
    );
    expect(normalizeTutorOptionText("&#x4E;a fase luminosa")).toBe("Na fase luminosa");
    expect(normalizeTutorOptionText("D) Na fase luminosa")).toBe("Na fase luminosa");
  });
});
