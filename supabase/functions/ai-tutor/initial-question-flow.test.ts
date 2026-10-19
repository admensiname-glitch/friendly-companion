import { describe, expect, it } from "bun:test";
import {
  retryAfterSecondsFromResponse,
  runInitialQuestionFlow,
  runInitialQuestionFlowOnce,
  type InitialQuestionCandidate,
} from "./initial-question-flow.ts";
import { retryDelayMs } from "../../../src/lib/tutor-retry-policy";

const validQuestion: InitialQuestionCandidate = {
  question: "Qual elemento a planta utiliza para captar energia durante a fotossíntese?",
  options: [
    "A luz do Sol.",
    "O som do ambiente.",
    "O calor do solo como única fonte.",
    "O oxigênio do ar como fonte de energia.",
  ],
  correct_option_index: 0,
  explanation: "A clorofila absorve energia luminosa, que ajuda a planta a transformar água e gás carbônico em açúcares.",
  difficulty: "intermediate",
  concept_tags: ["fotossíntese", "energia luminosa"],
};

describe("Tutor initial micro-assessment flow", () => {
  it("respeita Retry-After e calcula uma espera controlada após HTTP 429", () => {
    const retryAfter = retryAfterSecondsFromResponse(
      new Headers({ "retry-after": "24.5" }),
      "rate limited",
    );
    expect(retryAfter).toBe(25);
    expect(retryDelayMs(retryAfter)).toBe(26_000);
  });

  it("usa o intervalo informado na mensagem do provedor quando falta o header", () => {
    expect(
      retryAfterSecondsFromResponse(new Headers(), "Please try again in 24.5s."),
    ).toBe(25);
  });

  it("limita gerações a duas tentativas e não dispara retries adicionais em rajada", async () => {
    let attempts = 0;
    const result = await runInitialQuestionFlow({
      maxAttempts: 10,
      generate: async () => {
        attempts += 1;
        return { question: null };
      },
      isDuplicate: () => false,
      save: async () => ({ id: "should-not-save" }),
    });
    expect(attempts).toBe(2);
    expect(result.kind).toBe("unavailable");
  });

  it("deduplica chamadas simultâneas para a mesma chave de mensagem", async () => {
    let calls = 0;
    const operation = async () => {
      calls += 1;
      await Promise.resolve();
      return "one-result";
    };
    const [first, second] = await Promise.all([
      runInitialQuestionFlowOnce("user:conversation:message-1", operation),
      runInitialQuestionFlowOnce("user:conversation:message-1", operation),
    ]);
    expect(first).toBe("one-result");
    expect(second).toBe("one-result");
    expect(calls).toBe(1);
  });

  it("interrompe a geração ao receber limite 429 e permite apenas retry após cooldown", async () => {
    let attempts = 0;
    const result = await runInitialQuestionFlow({
      generate: async () => {
        attempts += 1;
        return { question: null, retryAfterSeconds: 25 };
      },
      isDuplicate: () => false,
      save: async () => ({ id: "should-not-save" }),
    });
    expect(attempts).toBe(1);
    expect(result).toEqual({ kind: "rate_limited", retryAfterSeconds: 25, attempts: 1 });
  });

  it("aceita questão válida após uma nova tentativa controlada", async () => {
    let attempts = 0;
    let saves = 0;
    const result = await runInitialQuestionFlow({
      generate: async () => {
        attempts += 1;
        return { question: attempts === 1 ? null : validQuestion };
      },
      isDuplicate: () => false,
      save: async () => {
        saves += 1;
        return { id: "assessment-1" };
      },
    });
    expect(attempts).toBe(2);
    expect(saves).toBe(1);
    expect(result.kind).toBe("saved");
  });

  it("não salva questão inválida", async () => {
    let saves = 0;
    const invalidQuestion = { ...validQuestion, options: validQuestion.options.slice(0, 3) };
    const result = await runInitialQuestionFlow({
      generate: async () => ({ question: invalidQuestion }),
      isDuplicate: () => false,
      save: async () => {
        saves += 1;
        return { id: "must-not-exist" };
      },
    });
    expect(result.kind).toBe("unavailable");
    expect(saves).toBe(0);
  });

  it("salva e retorna exatamente os campos seguros para apresentação no Tutor", async () => {
    const result = await runInitialQuestionFlow({
      generate: async () => ({ question: validQuestion }),
      isDuplicate: () => false,
      save: async () => ({ id: "assessment-visible-1" }),
    });
    expect(result).toEqual({
      kind: "saved",
      attempts: 1,
      microAssessment: {
        id: "assessment-visible-1",
        question: validQuestion.question,
        options: validQuestion.options,
        difficulty: "intermediate",
        concept_tags: ["fotossíntese", "energia luminosa"],
      },
    });
  });
});
