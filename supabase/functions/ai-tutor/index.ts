import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  action?: "chat" | "answer_microassessment" | "start_formal_evaluation";
  topic_id?: string;
  conversation_id?: string | null;
  message?: string;
  micro_assessment_id?: string;
  selected_option_index?: number;
};

type GeneratedMicroAssessment = {
  enabled: boolean;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  difficulty: "introductory" | "intermediate" | "advanced";
  concept_tags: string[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeneratedFormalEvaluationQuestion = {
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  difficulty: "introductory" | "intermediate" | "advanced";
  concept_tags: string[];
};

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueNormalized(values: string[]): boolean {
  return new Set(values.map(normalizeForComparison)).size === values.length;
}

async function generateFormalEvaluationQuestions(args: {
  apiKey: string;
  topicName: string;
  topicDescription: string | null;
  context: string;
  previousAttempt: Array<{ question_text: string; options: string[] }>;
  seed: string;
}): Promise<GeneratedFormalEvaluationQuestion[] | null> {
  const previousQuestions = args.previousAttempt
    .map((item, index) =>
      (index + 1) + ". " + item.question_text +
      "\nAlternativas: " + item.options.join(" | ")
    )
    .join("\n");

  const prompt =
    "Você é um elaborador de avaliações formais do Ensina-me.\n\n" +
    "OBJETIVO\n" +
    "Crie exatamente 10 questões de múltipla escolha sobre o tópico informado. A avaliação deve verificar domínio acadêmico real do conteúdo, sem sair do escopo.\n\n" +
    "REGRAS DE CONTEÚDO\n" +
    "- Use prioritariamente e exclusivamente o contexto acadêmico fornecido.\n" +
    "- Não invente autores, dados, definições ou conteúdos que não estejam sustentados pelo contexto.\n" +
    "- As 10 questões devem cobrir aspectos diferentes do tópico e variar o formato cognitivo: compreensão, aplicação, comparação e análise.\n" +
    "- Evite duas questões que cobrem essencialmente a mesma situação.\n" +
    "- Cada questão deve ter exatamente 4 alternativas.\n" +
    "- Exatamente uma alternativa deve estar correta.\n" +
    "- As alternativas devem ser plausíveis e semanticamente distintas.\n" +
    "- Não use pegadinhas artificiais.\n" +
    "- A dificuldade deve variar entre introductory, intermediate e advanced.\n" +
    "- concept_tags deve ter de 1 a 3 conceitos.\n" +
    "- A explicação do gabarito deve ser curta, clara e baseada no contexto.\n\n" +
    "DIVERSIDADE ENTRE TENTATIVAS\n" +
    "- Esta é uma nova tentativa. Não repita as perguntas da tentativa anterior.\n" +
    "- Não repita o mesmo enunciado com pequenas trocas de palavras. Mude o caso, situação, relação conceitual ou foco cognitivo.\n" +
    "- Não repita a mesma alternativa correta com o mesmo texto da tentativa anterior. Reescreva as alternativas.\n" +
    "- Considere o identificador aleatório da tentativa: " + args.seed + ". Use-o apenas como gatilho para variar os casos e a ordem conceitual.\n" +
    (previousQuestions
      ? "\nTENTATIVA ANTERIOR — NÃO REPETIR:\n" + previousQuestions
      : "\nNão existe tentativa anterior. Crie a primeira avaliação.\n") +
    "\n\nTÓPICO: " + args.topicName +
    (args.topicDescription ? "\nDESCRIÇÃO: " + args.topicDescription : "") +
    "\n\nCONTEXTO ACADÊMICO:\n" +
    args.context;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + args.apiKey,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: "Gere agora as 10 questões da nova tentativa." },
          ],
          max_completion_tokens: 3600,
          temperature: 0.35,
          reasoning_effort: "medium",
          include_reasoning: false,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ensina_me_formal_evaluation",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  questions: {
                    type: "array",
                    minItems: 10,
                    maxItems: 10,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        question_text: { type: "string" },
                        options: {
                          type: "array",
                          minItems: 4,
                          maxItems: 4,
                          items: { type: "string" },
                        },
                        correct_option_index: {
                          type: "integer",
                          minimum: 0,
                          maximum: 3,
                        },
                        explanation: { type: "string" },
                        difficulty: {
                          type: "string",
                          enum: ["introductory", "intermediate", "advanced"],
                        },
                        concept_tags: {
                          type: "array",
                          minItems: 1,
                          maxItems: 3,
                          items: { type: "string" },
                        },
                      },
                      required: [
                        "question_text",
                        "options",
                        "correct_option_index",
                        "explanation",
                        "difficulty",
                        "concept_tags",
                      ],
                    },
                  },
                },
                required: ["questions"],
              },
            },
          },
        }),
        signal: controller.signal,
      },
    );

    const payload = await response.json();
    if (!response.ok) {
      console.warn("[Ensina-me] ai-tutor: falha ao gerar avaliação formal", response.status);
      return null;
    }

    const raw = extractOutputText(payload);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { questions?: unknown };
    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 10) return null;

    const questions: GeneratedFormalEvaluationQuestion[] = [];

    for (const item of parsed.questions) {
      if (!isRecord(item)) return null;
      const questionText =
        typeof item.question_text === "string" ? item.question_text.trim() : "";
      const options = Array.isArray(item.options)
        ? item.options
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
        : [];
      const correctIndex =
        typeof item.correct_option_index === "number"
          ? Math.trunc(item.correct_option_index)
          : -1;
      const explanation =
        typeof item.explanation === "string" ? item.explanation.trim() : "";
      const difficulty = item.difficulty;
      const tags = Array.isArray(item.concept_tags)
        ? item.concept_tags
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];

      if (
        !questionText ||
        options.length !== 4 ||
        !uniqueNormalized(options) ||
        correctIndex < 0 ||
        correctIndex > 3 ||
        !explanation ||
        (difficulty !== "introductory" &&
          difficulty !== "intermediate" &&
          difficulty !== "advanced") ||
        tags.length === 0
      ) {
        return null;
      }

      questions.push({
        question_text: questionText,
        options,
        correct_option_index: correctIndex,
        explanation,
        difficulty,
        concept_tags: tags,
      });
    }

    if (!uniqueNormalized(questions.map((question) => question.question_text))) {
      return null;
    }

    if (args.previousAttempt.length > 0) {
      const previousQuestionSet = new Set(
        args.previousAttempt.map((item) => normalizeForComparison(item.question_text)),
      );
      const previousQuestionFingerprints = new Set(
        args.previousAttempt.map((item) =>
          normalizeForComparison(item.question_text) +
          "||" +
          item.options.map(normalizeForComparison).sort().join("|")
        ),
      );

      if (
        questions.some((question) =>
          previousQuestionSet.has(normalizeForComparison(question.question_text)),
        ) ||
        questions.some((question) =>
          previousQuestionFingerprints.has(
            normalizeForComparison(question.question_text) +
            "||" +
            question.options.map(normalizeForComparison).sort().join("|")
          ),
        )
      ) {
        return null;
      }
    }

    return questions;
  } catch (error) {
    console.warn(
      "[Ensina-me] ai-tutor: erro ao gerar avaliação formal",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}


function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function truncateText(value: string, maxCharacters: number): string {
  if (value.length <= maxCharacters) return value;
  return (
    value.slice(0, maxCharacters) +
    "\n\n[Parte adicional do contexto omitida para manter a conversa focada.]"
  );
}

const DAILY_USER_MESSAGE_LIMIT = 60; // Tutor acadêmico Ensina-me
const MAX_CONTEXT_CHARACTERS = 24000;;
const PUBLIC_IMAGE_LICENSES = new Set(["cc0", "pdm"]);

function normalizeLicense(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isAllowedPublicLicense(value: string): boolean {
  const normalized = normalizeLicense(value);
  return PUBLIC_IMAGE_LICENSES.has(normalized) ||
    normalized.includes("cc0") ||
    normalized.includes("public domain") ||
    normalized.includes("publicdomain");
}

async function searchOpenverseImage(queries: string[]): Promise<VisualAid["image"]> {
  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        q: query,
        license: "cc0,pdm",
        page_size: "10",
        mature: "false",
        filter_dead: "true",
      });
      const response = await fetch("https://api.openverse.org/v1/images/?" + params.toString(), {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Ensina-me/1.0 (academic learning platform)",
        },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const results = isRecord(payload) && Array.isArray(payload.results) ? payload.results : [];
      for (const item of results) {
        if (!isRecord(item)) continue;
        const license = typeof item.license === "string" ? item.license : "";
        const licenseUrl = typeof item.license_url === "string" ? item.license_url : "";
        const url = typeof item.url === "string" ? item.url : "";
        const thumbnail = typeof item.thumbnail === "string" ? item.thumbnail : "";
        const sourceUrl = typeof item.foreign_landing_url === "string"
          ? item.foreign_landing_url
          : typeof item.detail_url === "string" ? item.detail_url : "";
        if (!sourceUrl || !(thumbnail || url)) continue;
        if (!isAllowedPublicLicense(license) && !isAllowedPublicLicense(licenseUrl)) continue;
        const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Imagem de apoio";
        const attribution = typeof item.creator === "string" && item.creator.trim()
          ? item.creator.trim()
          : "Openverse";
        return {
          enabled: true,
          url: thumbnail || url,
          title,
          sourceUrl,
          license: normalizeLicense(license) === "pdm" ? "Public Domain Mark" : "CC0 1.0",
          attribution,
        };
      }
    } catch (error) {
      console.warn("[Ensina-me] ai-tutor: Openverse falhou", error instanceof Error ? error.message : "unknown error");
    }
  }
  return null;
}

async function searchWikimediaImage(queries: string[]): Promise<VisualAid["image"]> {
  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: query,
        gsrnamespace: "6",
        gsrlimit: "10",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "1200",
        format: "json",
        origin: "*",
      });
      const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params.toString(), {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Ensina-me/1.0 (academic learning platform)",
        },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const pages = isRecord(payload) && isRecord(payload.query) && isRecord(payload.query.pages)
        ? Object.values(payload.query.pages as Record<string, unknown>) : [];
      for (const page of pages) {
        if (!isRecord(page) || !Array.isArray(page.imageinfo) || !page.imageinfo[0] || !isRecord(page.imageinfo[0])) continue;
        const info = page.imageinfo[0] as UnknownRecord;
        const metadata = isRecord(info.extmetadata) ? info.extmetadata : {};
        const readMeta = (key: string) => {
          const value = metadata[key];
          return isRecord(value) && typeof value.value === "string"
            ? value.value.replace(/<[^>]+>/g, "").trim() : "";
        };
        const license = readMeta("LicenseShortName") || readMeta("License") || "";
        if (!isAllowedPublicLicense(license)) continue;
        const url = typeof info.thumburl === "string" ? info.thumburl : typeof info.url === "string" ? info.url : "";
        const sourceUrl = typeof page.fullurl === "string" ? page.fullurl : "";
        if (!url || !sourceUrl) continue;
        const title = typeof page.title === "string" ? page.title.replace(/^File:/, "").replace(/\.[^.]+$/, "") : "Imagem de apoio";
        const attribution = readMeta("Artist") || readMeta("Credit") || "Wikimedia Commons";
        return { enabled: true, url, title, sourceUrl, license: license.trim(), attribution };
      }
    } catch (error) {
      console.warn("[Ensina-me] ai-tutor: Wikimedia Commons falhou", error instanceof Error ? error.message : "unknown error");
    }
  }
  return null;
}

async function findPublicDomainImage(queries: string[]): Promise<VisualAid["image"]> {
  const openverseImage = await searchOpenverseImage(queries);
  if (openverseImage) return openverseImage;
  return searchWikimediaImage(queries);
}


async function findKnownPublicDomainImage(topicName: string): Promise<VisualAid["image"]> {
  const normalized = normalizeForComparison(topicName);
  if (!/(fotossintese|photosynthesis)/.test(normalized)) return null;

  return {
    enabled: true,
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Photosynthesis%20pt.svg?width=1280",
    title: "Diagrama com o processo geral da fotossíntese",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Photosynthesis_pt.svg",
    license: "CC BY-SA 4.0",
    attribution: "Wikimedia Commons",
  };
}

function detectLearningSignals(message: string): string[] {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const signals: string[] = [];

  if (/(nao entendi|nao entendo|nao ficou claro|estou confuso|confusa|estou perdido|perdida|muito dificil|dificuldade)/.test(normalized)) {
    signals.push("compreensao");
  }
  if (/(qual a diferenca|diferenca entre|diferencas entre|compare|comparar)/.test(normalized)) {
    signals.push("comparacao");
  }
  if (/(exemplo|na pratica|aplicar|aplicacao|atividade)/.test(normalized)) {
    signals.push("aplicacao");
  }
  if (/(o que e|o que significa|defina|definicao|conceito)/.test(normalized)) {
    signals.push("conceito");
  }
  if (/(como funciona|como fazer|como se faz|passo a passo)/.test(normalized)) {
    signals.push("procedimento");
  }

  return [...new Set(signals)];
}

function detectLearningAction(message: string): "simplify" | "practice" | "review" | "explore" {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/(nao entendi|nao entendo|nao ficou claro|confuso|confusa|dificuldade)/.test(normalized)) {
    return "simplify";
  }
  if (/(questao|questoes|teste meu|quiz|exercicio|praticar|pratique)/.test(normalized)) {
    return "practice";
  }
  if (/(revisao|revisar|resumo|resuma|recapitular|recapitulacao)/.test(normalized)) {
    return "review";
  }
  return "explore";
}

function extractOutputText(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return "";

  const texts: string[] = [];

  for (const choice of payload.choices) {
    if (!isRecord(choice) || !isRecord(choice.message)) continue;

    const content = choice.message.content;

    if (typeof content === "string") {
      texts.push(content);
      continue;
    }

    if (Array.isArray(content)) {
      for (const part of content) {
        if (isRecord(part) && typeof part.text === "string") {
          texts.push(part.text);
        }
      }
    }
  }

  return texts.join("\n").trim();
}

function extractTutorResult(payload: unknown): {
  message: string;
  microassessment: GeneratedMicroAssessment | null;
  shareable: boolean;
  videoRecommendation: { enabled: boolean; reason: string } | null;
  visualAid: VisualAid;
} | null {
  const raw = extractOutputText(payload);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      message?: unknown;
      microassessment?: unknown;
      shareable?: unknown;
      visual_aid?: unknown;
    };

    if (typeof parsed.message !== "string") return null;

    let microassessment: GeneratedMicroAssessment | null = null;

    if (isRecord(parsed.microassessment)) {
      const options = Array.isArray(parsed.microassessment.options)
        ? parsed.microassessment.options.filter((value): value is string => typeof value === "string")
        : [];

      const correctIndex =
        typeof parsed.microassessment.correct_option_index === "number"
          ? Math.trunc(parsed.microassessment.correct_option_index)
          : 0;

      const difficulty = parsed.microassessment.difficulty;
      const tags = Array.isArray(parsed.microassessment.concept_tags)
        ? parsed.microassessment.concept_tags.filter((value): value is string => typeof value === "string")
        : [];

      microassessment = {
        enabled: parsed.microassessment.enabled === true,
        question:
          typeof parsed.microassessment.question === "string"
            ? parsed.microassessment.question.trim()
            : "",
        options,
        correct_option_index: correctIndex,
        explanation:
          typeof parsed.microassessment.explanation === "string"
            ? parsed.microassessment.explanation.trim()
            : "",
        difficulty:
          difficulty === "introductory" ||
          difficulty === "advanced" ||
          difficulty === "intermediate"
            ? difficulty
            : "intermediate",
        concept_tags: tags.slice(0, 5),
      };
    }

    const visualAidRecord = isRecord(parsed.visual_aid) ? parsed.visual_aid : null;
    const visualAidType = visualAidRecord?.type;
    const visualAidItems = Array.isArray(visualAidRecord?.items)
      ? visualAidRecord.items.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean).slice(0, 6)
      : [];

    const visualAid: VisualAid = {
      enabled: visualAidRecord?.enabled === true && visualAidItems.length > 0,
      type:
        visualAidType === "comparison" || visualAidType === "concept_map" || visualAidType === "flow"
          ? visualAidType
          : "flow",
      title: typeof visualAidRecord?.title === "string" ? visualAidRecord.title.trim() : "",
      items: visualAidItems,
      caption: typeof visualAidRecord?.caption === "string" ? visualAidRecord.caption.trim() : "",
      image: null,
    };

    return {
      message: parsed.message.trim(),
      microassessment,
      shareable: parsed.shareable === true,
      videoRecommendation: isRecord(parsed.video_recommendation)
        ? {
            enabled: parsed.video_recommendation.enabled === true,
            reason:
              typeof parsed.video_recommendation.reason === "string"
                ? parsed.video_recommendation.reason.trim()
                : "",
          }
        : null,
      visualAid,
    };
  } catch {
    return null;
  }
}

type AdaptiveMicroAssessment = {
  message: string;
  microassessment: GeneratedMicroAssessment;
};

type VisualAid = {
  enabled: boolean;
  type: "flow" | "concept_map" | "comparison";
  title: string;
  items: string[];
  caption: string;
};

function difficultyRank(difficulty: GeneratedMicroAssessment["difficulty"]): number {
  return difficulty === "introductory" ? 1 : difficulty === "intermediate" ? 2 : 3;
}

function difficultyFromRank(rank: number): GeneratedMicroAssessment["difficulty"] {
  return rank <= 1 ? "introductory" : rank === 2 ? "intermediate" : "advanced";
}

function pickWeakestConcept(
  history: Array<{ is_correct: boolean | null; concept_tags: string[] | null }>,
): string | null {
  const stats = new Map<string, { attempts: number; errors: number }>();

  for (const item of history) {
    for (const rawTag of item.concept_tags ?? []) {
      const tag = rawTag.trim();
      if (!tag) continue;
      const current = stats.get(tag) ?? { attempts: 0, errors: 0 };
      current.attempts += 1;
      if (item.is_correct === false) current.errors += 1;
      stats.set(tag, current);
    }
  }

  return (
    [...stats.entries()]
      .sort((a, b) => {
        const aRate = a[1].attempts > 0 ? a[1].errors / a[1].attempts : 0;
        const bRate = b[1].attempts > 0 ? b[1].errors / b[1].attempts : 0;
        return bRate - aRate || b[1].errors - a[1].errors;
      })[0]?.[0] ?? null
  );
}

async function generateAdaptiveMicroAssessment(args: {
  apiKey: string;
  topicName: string;
  topicDescription: string | null;
  context: string;
  previousQuestion: string;
  previousTags: string[];
  wasCorrect: boolean;
  nextDifficulty: GeneratedMicroAssessment["difficulty"];
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  weakestConcept: string | null;
  recentQuestions: string[];
}): Promise<AdaptiveMicroAssessment | null> {
  const adaptiveInstruction = args.wasCorrect
    ? "O aluno acertou. A próxima questão deve aumentar a exigência cognitiva, usando a dificuldade solicitada. Não simplifique a ponto de repetir a questão anterior."
    : "O aluno errou. Antes da nova questão, a mensagem deve reconstruir o conceito com linguagem clara e incluir um exemplo concreto correto. A nova questão deve testar novamente o conceito sem copiar a questão anterior.";

  const systemPrompt =
    "Você é o motor de aprendizagem adaptativa do Ensina-me.\n\n" +
    "OBJETIVO\n" +
    "Continue uma sequência curta de aprendizagem após uma microavaliação. A sequência deve ser pedagógica, determinística na decisão de dificuldade e precisa no conteúdo.\n\n" +
    "REGRAS\n" +
    "- Use prioritariamente o contexto acadêmico fornecido.\n" +
    "- Nunca invente informações, autores, datas, estudos ou definições.\n" +
    "- Gere exatamente uma nova questão de múltipla escolha com 4 alternativas.\n" +
    "- A alternativa correta deve ser inequivocamente correta com base no contexto.\n" +
    "- Não repita nenhuma das questões recentes. Mude o contexto ou o modo de aplicação quando necessário.\n" +
    "- A mensagem não pode conter a nova questão nem as alternativas; a questão será exibida separadamente.\n" +
    "- concept_tags deve ter de 1 a 3 conceitos, priorizando o conceito frágil quando indicado.\n" +
    "- difficulty deve ser exatamente a dificuldade solicitada.\n\n" +
    "PRECISÃO EM ALFABETIZAÇÃO E LINGUAGEM\n" +
    "- Não confunda consciência fonológica, consciência fonêmica, fonema, sílaba, rima, aliteração, grafema e relação grafofonêmica.\n" +
    "- Em exemplos de rima, confirme a semelhança sonora relevante na terminação; compartilhar apenas uma vogal final não basta.\n\n" +
    adaptiveInstruction +
    "\n\n" +
    "SITUAÇÃO ATUAL\n" +
    "- Resultado anterior: " +
    (args.wasCorrect ? "acerto" : "erro") +
    "\n- Acertos consecutivos: " +
    args.consecutiveCorrect +
    "\n- Erros consecutivos: " +
    args.consecutiveIncorrect +
    "\n- Próxima dificuldade: " +
    args.nextDifficulty +
    "\n- Conceito prioritário: " +
    (args.weakestConcept ?? "o conceito central mais relevante") +
    "\n- Conceitos da questão anterior: " +
    (args.previousTags.join(", ") || "não informado") +
    "\n- Questão anterior: " +
    args.previousQuestion +
    "\n- Questões recentes a evitar: " +
    (args.recentQuestions.join(" | ") || "nenhuma") +
    "\n\n" +
    "CONTEXTO ACADÊMICO\n" +
    args.context;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + args.apiKey,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                args.wasCorrect
                  ? "Continue a sequência com uma mensagem breve de feedback e uma nova questão mais desafiadora."
                  : "Continue a sequência com uma explicação curta, um exemplo correto e uma nova questão de reforço.",
            },
          ],
          max_completion_tokens: 1400,
          temperature: 0.2,
          reasoning_effort: "medium",
          include_reasoning: false,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ensina_me_adaptive_microassessment",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  message: { type: "string" },
                  microassessment: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      enabled: { type: "boolean" },
                      question: { type: "string" },
                      options: {
                          type: "array",
                          minItems: 0,
                          maxItems: 4,
                          items: { type: "string" },
                        },
                      correct_option_index: {
                        type: "integer",
                        minimum: 0,
                        maximum: 3,
                      },
                      explanation: { type: "string" },
                      difficulty: {
                        type: "string",
                        enum: ["introductory", "intermediate", "advanced"],
                      },
                      concept_tags: {
                        type: "array",
                        minItems: 0,
                        maxItems: 3,
                        items: { type: "string" },
                      },
                    },
                    required: [
                      "enabled",
                      "question",
                      "options",
                      "correct_option_index",
                      "explanation",
                      "difficulty",
                      "concept_tags",
                    ],
                  },
                },
                required: ["message", "microassessment"],
              },
            },
          },
        }),
        signal: controller.signal,
      },
    );

    const payload = await response.json();
    if (!response.ok) {
      console.warn(
        "[Ensina-me] ai-tutor: falha ao gerar continuação adaptativa",
        response.status,
      );
      return null;
    }

    const parsed = extractTutorResult(payload);
    if (!parsed?.message || !parsed.microassessment?.enabled) return null;

    const next = parsed.microassessment;
    if (
      next.options.length !== 4 ||
      next.options.some((option) => option.trim().length === 0) ||
      next.question.length === 0 ||
      next.explanation.length === 0
    ) {
      return null;
    }

    next.difficulty = args.nextDifficulty;
    next.concept_tags =
      next.concept_tags.length > 0
        ? next.concept_tags.slice(0, 3)
        : args.weakestConcept
          ? [args.weakestConcept]
          : args.previousTags.slice(0, 3);

    return { message: parsed.message, microassessment: next };
  } catch (error) {
    console.warn(
      "[Ensina-me] ai-tutor: erro na continuação adaptativa",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Autenticação necessária." }, 401);
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    let publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

    if (publishableKeysRaw) {
      try {
        const parsed = JSON.parse(publishableKeysRaw);
        publishableKey = parsed?.default ?? publishableKey;
      } catch (error) {
        console.warn(
          "[Ensina-me] SUPABASE_PUBLISHABLE_KEYS inválido",
          error instanceof Error ? error.message : "valor inválido",
        );
      }
    }

    if (!publishableKey) {
      publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    }

    if (!publishableKey) {
      return json({ error: "Chave pública do Supabase não disponível." }, 500);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      publishableKey,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return json({ error: "Sessão inválida." }, 401);
    }

    const { data: roleOk, error: roleError } =
      await supabase.rpc("has_role", { required_role: "student" });

    if (roleError || !roleOk) {
      return json({ error: "Somente alunos podem usar o tutor." }, 403);
    }

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Corpo da requisição inválido." }, 400);
    }

    if (body.action === "start_formal_evaluation") {
      const topicId = body.topic_id?.trim();
      if (!topicId) {
        return json({ error: "Tópico é obrigatório." }, 400);
      }

      const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
      if (!groqApiKey) {
        return json({ error: "O Tutor ainda não foi configurado." }, 503);
      }

      const { data: topic, error: topicError } = await supabase
        .from("topics")
        .select("id, name, description")
        .eq("id", topicId)
        .eq("published", true)
        .maybeSingle();

      if (topicError || !topic) {
        return json({ error: "Tópico não encontrado." }, 404);
      }

      const { data: material } = await supabase
        .from("materials")
        .select("id, title, introduction")
        .eq("topic_id", topicId)
        .eq("status", "published")
        .maybeSingle();

      const { data: sections } = material
        ? await supabase
            .from("material_sections")
            .select("title, content, position")
            .eq("material_id", material.id)
            .order("position", { ascending: true })
        : { data: [] };

      const context = [
        "TÓPICO: " + topic.name,
        topic.description ? "DESCRIÇÃO: " + topic.description : "",
        material
          ? "MATERIAL: " + material.title + "\n" + (material.introduction ?? "")
          : "",
        ...(sections ?? []).map(
          (section: { title: string; content: string }) =>
            "SEÇÃO — " + section.title + "\n" + section.content,
        ),
      ]
        .filter(Boolean)
        .join("\n\n");

      const { data: historyData, error: historyError } = await supabase.rpc(
        "get_formal_evaluation_history",
        { _topic_id: topicId },
      );

      if (historyError) {
        return json(
          { error: "Não foi possível recuperar o histórico da avaliação." },
          500,
        );
      }

      const history = Array.isArray(historyData) ? historyData : [];
      const latestAttempt = history[0];

      const previousAttempt =
        latestAttempt && Array.isArray(latestAttempt.questions)
          ? latestAttempt.questions
              .filter(
                (item: unknown): item is { question_text: string; options: unknown } =>
                  isRecord(item) &&
                  typeof item.question_text === "string" &&
                  Array.isArray(item.options),
              )
              .map((item) => ({
                question_text: item.question_text,
                options: item.options.filter(
                  (value): value is string => typeof value === "string",
                ),
              }))
          : [];

      let questions = await generateFormalEvaluationQuestions({
        apiKey: groqApiKey,
        topicName: topic.name,
        topicDescription: topic.description,
        context: truncateText(context, MAX_CONTEXT_CHARACTERS),
        previousAttempt,
        seed: crypto.randomUUID(),
      });

      if (!questions) {
        questions = await generateFormalEvaluationQuestions({
          apiKey: groqApiKey,
          topicName: topic.name,
          topicDescription: topic.description,
          context: truncateText(context, MAX_CONTEXT_CHARACTERS),
          previousAttempt,
          seed: crypto.randomUUID(),
        });
      }

      if (!questions) {
        return json(
          {
            error:
              "Não foi possível gerar uma nova avaliação sem repetir questões anteriores. Tente novamente.",
          },
          502,
        );
      }

      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
      if (!serviceRoleKey) {
        console.error("[Ensina-me] ai-tutor: SUPABASE_SERVICE_ROLE_KEY ausente para operação interna.");
        return json({ error: "O servidor não está configurado para preparar a avaliação." }, 503);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        serviceRoleKey,
      );

      const { data: created, error: createError } = await supabaseAdmin.rpc(
        "create_formal_evaluation_attempt",
        {
          _topic_id: topicId,
          _user_id: userData.user.id,
          _questions: questions,
        },
      );

      if (createError || !created) {
        console.error(
          "[Ensina-me] ai-tutor: erro ao criar tentativa formal",
          createError?.message ?? "resultado vazio",
        );
        return json({ error: "Não foi possível iniciar a avaliação." }, 500);
      }

      const createdAttemptId =
        typeof created === "object" &&
        created !== null &&
        "attempt_id" in created
          ? String((created as { attempt_id: unknown }).attempt_id)
          : null;

      if (!createdAttemptId) {
        return json({ error: "A avaliação foi criada sem identificador." }, 500);
      }

      const safeCreatedQuestions =
        isRecord(created) && Array.isArray(created.questions)
          ? created.questions
          : null;

      if (!safeCreatedQuestions || safeCreatedQuestions.length !== 10) {
        return json(
          { error: "A avaliação foi criada sem carregar as 10 questões." },
          500,
        );
      }

      return json({
        attempt_id: createdAttemptId,
        total_questions: 10,
        questions: safeCreatedQuestions,
      });
    }


    if (body.action === "answer_microassessment") {
      const assessmentId = body.micro_assessment_id?.trim();
      const selectedIndex = body.selected_option_index;

      if (!assessmentId || !Number.isInteger(selectedIndex)) {
        return json({ error: "Microavaliação e alternativa são obrigatórias." }, 400);
      }

      const { data: result, error: answerError } = await supabase.rpc(
        "record_micro_assessment_answer",
        {
          _assessment_id: assessmentId,
          _selected_option_index: selectedIndex,
        },
      );

      if (answerError || !result) {
        console.error(
          "[Ensina-me] ai-tutor: erro ao registrar microavaliação",
          answerError?.message ?? "resultado vazio",
        );
        return json(
          {
            error:
              answerError?.message?.includes("já foi respondida")
                ? "Esta microavaliação já foi respondida."
                : "Não foi possível registrar sua resposta.",
          },
          400,
        );
      }

      const { data: assessment, error: assessmentError } = await supabase
        .from("ai_micro_assessments")
        .select(
          "id, topic_id, conversation_id, question_text, options, correct_option_index, explanation, difficulty, concept_tags, is_correct, selected_option_index, status",
        )
        .eq("id", assessmentId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (assessmentError || !assessment) {
        return json(
          { error: "Não foi possível carregar o resultado da microavaliação." },
          500,
        );
      }

      const { data: recentAssessments } = await supabase
        .from("ai_micro_assessments")
        .select("is_correct, difficulty, concept_tags, question_text, answered_at")
        .eq("user_id", userData.user.id)
        .eq("topic_id", assessment.topic_id)
        .eq("status", "answered")
        .order("answered_at", { ascending: false })
        .limit(12);

      const adaptiveHistory = (recentAssessments ?? []) as Array<{
        is_correct: boolean | null;
        difficulty: "introductory" | "intermediate" | "advanced";
        concept_tags: string[] | null;
        question_text: string;
        answered_at: string | null;
      }>;

      let consecutiveCorrect = 0;
      let consecutiveIncorrect = 0;

      for (const item of adaptiveHistory) {
        if (item.is_correct === true) {
          if (consecutiveIncorrect > 0) break;
          consecutiveCorrect += 1;
        } else {
          if (consecutiveCorrect > 0) break;
          consecutiveIncorrect += 1;
        }
      }

      const attempted = Number((result as { attempted?: number }).attempted ?? 0);
      const correct = Number((result as { correct?: number }).correct ?? 0);
      const accuracy =
        attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0;
      const weakestConcept = pickWeakestConcept(
        adaptiveHistory.map((item) => ({
          is_correct: item.is_correct,
          concept_tags: item.concept_tags,
        })),
      );

      const currentRank = difficultyRank(assessment.difficulty);
      const nextDifficulty = assessment.is_correct
        ? difficultyFromRank(Math.min(3, currentRank + 1))
        : difficultyFromRank(Math.max(1, currentRank - 1));

      const masteryLevel =
        attempted >= 6 && accuracy >= 85 && consecutiveCorrect >= 3
          ? "mastered"
          : attempted >= 4 && accuracy >= 75 && consecutiveCorrect >= 2
            ? "proficient"
            : attempted >= 2 && accuracy >= 50
              ? "consolidating"
              : "emerging";

      const nextReviewAt =
        (result as { next_review_at?: string }).next_review_at ?? null;

      const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();

      let nextMicroAssessment: {
        id: string;
        question: string;
        options: string[];
        difficulty: "introductory" | "intermediate" | "advanced";
        concept_tags: string[];
      } | null = null;
      let nextMessage: string | null = null;

      if (groqApiKey && masteryLevel !== "mastered") {
        const { data: topic } = await supabase
          .from("topics")
          .select("id, name, description")
          .eq("id", assessment.topic_id)
          .eq("published", true)
          .maybeSingle();

        if (topic) {
          const { data: material } = await supabase
            .from("materials")
            .select("id, title, introduction")
            .eq("topic_id", assessment.topic_id)
            .eq("status", "published")
            .maybeSingle();

          const { data: sections } = material
            ? await supabase
                .from("material_sections")
                .select("title, content, position")
                .eq("material_id", material.id)
                .order("position", { ascending: true })
            : { data: [] };

          const context = [
            "TÓPICO: " + topic.name,
            topic.description ? "DESCRIÇÃO: " + topic.description : "",
            material
              ? "MATERIAL: " +
                material.title +
                "\n" +
                (material.introduction ?? "")
              : "",
            ...(sections ?? []).map(
              (section: { title: string; content: string }) =>
                "SEÇÃO — " + section.title + "\n" + section.content,
            ),
          ]
            .filter(Boolean)
            .join("\n\n");

          const generated = await generateAdaptiveMicroAssessment({
            apiKey: groqApiKey,
            topicName: topic.name,
            topicDescription: topic.description,
            context: truncateText(context, MAX_CONTEXT_CHARACTERS),
            previousQuestion: assessment.question_text,
            previousTags: assessment.concept_tags ?? [],
            wasCorrect: Boolean(assessment.is_correct),
            nextDifficulty,
            consecutiveCorrect,
            consecutiveIncorrect,
            weakestConcept,
            recentQuestions: adaptiveHistory
              .slice(0, 8)
              .map((item) => item.question_text)
              .filter(Boolean),
          });

          if (generated) {
            const { error: expireError } = await supabase
              .from("ai_micro_assessments")
              .update({ status: "expired" })
              .eq("user_id", userData.user.id)
              .eq("topic_id", assessment.topic_id)
              .eq("status", "pending");

            if (expireError) {
              console.warn(
                "[Ensina-me] ai-tutor: não foi possível encerrar microavaliação pendente anterior",
                expireError.message,
              );
            }

            const { data: savedNext, error: nextInsertError } = await supabase
              .from("ai_micro_assessments")
              .insert({
                user_id: userData.user.id,
                topic_id: assessment.topic_id,
                conversation_id: assessment.conversation_id,
                question_text: generated.microassessment.question,
                options: generated.microassessment.options,
                correct_option_index: generated.microassessment.correct_option_index,
                explanation: generated.microassessment.explanation,
                difficulty: nextDifficulty,
                concept_tags: generated.microassessment.concept_tags,
              })
              .select("id")
              .single();

            if (!nextInsertError && savedNext) {
              nextMicroAssessment = {
                id: savedNext.id,
                question: generated.microassessment.question,
                options: generated.microassessment.options,
                difficulty: nextDifficulty,
                concept_tags: generated.microassessment.concept_tags,
              };
              nextMessage = generated.message;

              if (assessment.conversation_id) {
                await supabase.from("ai_messages").insert({
                  conversation_id: assessment.conversation_id,
                  user_id: userData.user.id,
                  role: "assistant",
                  content: generated.message,
                });

                await supabase
                  .from("ai_conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", assessment.conversation_id)
                  .eq("user_id", userData.user.id);
              }
            }
          }
        }
      }

      if (masteryLevel === "mastered") {
        nextMessage =
          "Você já acumulou evidências suficientes de domínio deste tópico. A nova etapa agora é revisá-lo na data programada para fortalecer a retenção.";
      }

      return json({
        assessment_id: assessment.id,
        is_correct: assessment.is_correct,
        selected_option_index: assessment.selected_option_index,
        correct_option_index: assessment.correct_option_index,
        explanation: assessment.explanation,
        attempted: Number((result as { attempted?: number }).attempted ?? 0),
        correct: Number((result as { correct?: number }).correct ?? 0),
        accuracy,
        consecutive_correct: consecutiveCorrect,
        consecutive_incorrect: consecutiveIncorrect,
        next_difficulty: nextDifficulty,
        mastery_level: masteryLevel,
        next_review_at: nextReviewAt,
        next_action: assessment.is_correct ? "practice" : "simplify",
        next_message: nextMessage,
        next_micro_assessment: nextMicroAssessment,
      });
    }

    const topicId = body.topic_id?.trim();
    const userMessage = body.message?.trim();

    if (!topicId || !userMessage) {
      return json({ error: "Tópico e mensagem são obrigatórios." }, 400);
    }

    if (userMessage.length > 4000) {
      return json({ error: "A mensagem é muito longa." }, 400);
    }

    const learningSignals = detectLearningSignals(userMessage);
    const learningAction = detectLearningAction(userMessage);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentUserMessages, error: usageError } = await supabase
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userData.user.id)
      .eq("role", "user")
      .gte("created_at", since);

    if (usageError) {
      return json({ error: "Não foi possível verificar o limite de uso." }, 500);
    }

    if ((recentUserMessages ?? 0) >= DAILY_USER_MESSAGE_LIMIT) {
      return json(
        {
          error:
            "Você atingiu o limite de 60 mensagens do tutor nas últimas 24 horas. Tente novamente mais tarde.",
        },
        429,
      );
    }

    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("id, name, description")
      .eq("id", topicId)
      .eq("published", true)
      .maybeSingle();

    if (topicError || !topic) {
      return json({ error: "Tópico não encontrado." }, 404);
    }

    const { data: material } = await supabase
      .from("materials")
      .select("id, title, introduction")
      .eq("topic_id", topicId)
      .eq("status", "published")
      .maybeSingle();

    const { data: sections } = material
      ? await supabase
          .from("material_sections")
          .select("title, content, position")
          .eq("material_id", material.id)
          .order("position", { ascending: true })
      : { data: [] };

    const { data: difficulties } = await supabase
      .from("student_topic_difficulties")
      .select("difficulty_tag, count")
      .eq("user_id", userData.user.id)
      .eq("topic_id", topicId)
      .eq("review_status", "pending")
      .order("count", { ascending: false });

    const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
    if (!groqApiKey) {
      console.warn("[Ensina-me] ai-tutor: GROQ_API_KEY ausente no ambiente da Edge Function.");
      return json(
        {
          error:
            "O Tutor ainda não foi configurado. Adicione GROQ_API_KEY nos secrets do Supabase.",
        },
        503,
      );
    }

    let conversationId = body.conversation_id?.trim() || null;

    if (conversationId) {
      const { data: conversation } = await supabase
        .from("ai_conversations")
        .select("id, topic_id")
        .eq("id", conversationId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!conversation || conversation.topic_id !== topicId) {
        return json({ error: "Conversa não encontrada para este tópico." }, 404);
      }
    } else {
      const { data: newConversation, error: conversationError } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: userData.user.id,
          topic_id: topicId,
          title: "Tutor — " + topic.name,
        })
        .select("id")
        .single();

      if (conversationError || !newConversation) {
        return json({ error: "Não foi possível criar a conversa." }, 500);
      }

      conversationId = newConversation.id;
    }

    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(12);

    const recentHistory = ((history ?? []) as ChatMessage[]).reverse();

    const context = [
      "TÓPICO: " + topic.name,
      topic.description ? "DESCRIÇÃO: " + topic.description : "",
      material
        ? "MATERIAL: " + material.title + "\n" + (material.introduction ?? "")
        : "",
      ...(sections ?? []).map(
        (section: { title: string; content: string }) =>
          "SEÇÃO — " + section.title + "\n" + section.content,
      ),
      (difficulties ?? []).length
        ? "DIFICULDADES PENDENTES DO ALUNO: " +
          (difficulties ?? [])
            .map(
              (d: { difficulty_tag: string; count: number }) =>
                d.difficulty_tag + " (" + d.count + ")",
            )
            .join(", ")
        : "DIFICULDADES PENDENTES DO ALUNO: nenhuma registrada.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const safeContext = truncateText(context, MAX_CONTEXT_CHARACTERS);

    const systemPrompt =
      "Você é o Tutor acadêmico do Ensina-me: um professor particular digital, paciente, preciso e orientado à aprendizagem.\n\n" +
      "MISSÃO\n" +
      "Ajude o aluno a transformar informação em compreensão, compreensão em prática e prática em domínio. Não seja apenas um gerador de respostas. Ensine o raciocínio.\n\n" +
      "FONTE E RIGOR\n" +
      "- Use prioritariamente o CONTEXTO ACADÊMICO deste tópico.\n" +
      "- Nunca invente autores, obras, datas, pesquisas, estatísticas, definições ou citações.\n" +
      "- Preserve a precisão conceitual. Quando houver dúvida, prefira admitir a insuficiência do contexto a inventar.\n\n" +
      "ADAPTAÇÃO AO ALUNO\n" +
      "- Use o histórico da conversa e as dificuldades registradas para adaptar a explicação.\n" +
      "- Se o aluno não entendeu, simplifique sem distorcer.\n" +
      "- Para comparação, destaque diferenças essenciais. Para aplicação, use exemplos corretos.\n\n" +
      "COMO ENSINAR\n" +
      "- Comece pela ideia central e depois explique o porquê e o como.\n" +
      "- Use exemplos e contraexemplos corretos quando ajudarem.\n" +
      "- Em exercícios, priorize pistas e raciocínio; não dê a resposta automaticamente quando o aluno estiver tentando.\n\n" +
      "COMPARTILHAMENTO DA EXPLICAÇÃO\n" +
      "- shareable=true SOMENTE quando a resposta realmente ensina ou explica um conceito, tópico, tema, matéria ou raciocínio acadêmico.\n" +
      "- Para saudações, conversa casual, agradecimentos, confirmações, mensagens de navegação ou respostas sem conteúdo acadêmico explicativo, use shareable=false.\n" +
      "- A possibilidade de compartilhar é independente da matéria: qualquer tópico acadêmico pode ser compartilhado.\n\n" +
      "APOIO VISUAL\n" +
      "- Use visual_aid.enabled=true SOMENTE quando uma representação visual melhorar de forma clara a compreensão do conceito.\n" +
      "- Pode ser um fluxo, mapa conceitual ou comparação.\n" +
      "- Não use para saudações, respostas curtas ou quando o visual seria apenas decorativo.\n" +
      "- Use de 2 a 6 itens curtos e semanticamente precisos, derivados do contexto acadêmico fornecido.\n" +
      "- Nunca invente informação para preencher o apoio visual.\n\n" +
      "MICROAVALIAÇÃO ADAPTATIVA\n" +
      "- O campo microassessment só pode ter enabled=true quando MICROAVALIAÇÃO=GERAR.\n" +
      "- Gere microavaliação quando o aluno pediu para ser testado, pediu questão, quiz, exercício ou prática.\n" +
      "- Faça exatamente uma questão de múltipla escolha com 4 alternativas.\n" +
      "- A questão deve avaliar o conceito mais relevante do tópico e, quando houver, atacar uma dificuldade pendente do aluno.\n" +
      "- A alternativa correta deve ser inequivocamente correta com base no contexto.\n" +
      "- Evite pistas óbvias, pegadinhas artificiais e ambiguidades.\n" +
      "- Quando uma microavaliação for gerada, NÃO repita a questão nem as alternativas no campo message; no texto, apenas convide o aluno a responder a questão apresentada abaixo.\n" +
      "- Explique o gabarito de forma curta e pedagógica.\n" +
      "- Ajuste a dificuldade: introductory para primeira compreensão, intermediate para aplicação, advanced para análise.\n" +
      "- concept_tags deve conter de 1 a 3 conceitos avaliados.\n\n" +
      "PRECISÃO EM ALFABETIZAÇÃO E LINGUAGEM\n" +
      "- Não confunda consciência fonológica, consciência fonêmica, fonema, sílaba, rima, aliteração, grafema e relação grafofonêmica.\n" +
      "- Em exemplos de rima, confirme a semelhança sonora relevante na terminação; compartilhar apenas uma vogal final não basta.\n\n" +
      "ESTILO\n" +
      "- Português do Brasil, humano, encorajador e acadêmico.\n" +
      "- Não infantilize o aluno.\n" +
      "- Use organização visual apenas quando melhorar a compreensão.\n\n" +
      "CONTEXTO ACADÊMICO DO TÓPICO:\n" +
      safeContext;

    const microAssessmentDirective =
      learningAction === "practice"
        ? "MICROAVALIAÇÃO=GERAR: gere uma microavaliação adaptativa com exatamente 4 alternativas."
        : "MICROAVALIAÇÃO=NÃO GERAR: mantenha microassessment.enabled=false e envie options=[], question=\"\", explanation=\"\", concept_tags=[] e correct_option_index=0.";

    const messages = [
      {
        role: "system",
        content: systemPrompt + "\n\n" + microAssessmentDirective,
      },
      ...recentHistory,
      { role: "user", content: userMessage },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let groqResponse: Response;
    try {
      groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + groqApiKey,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages,
            max_completion_tokens: 1600,
            temperature: 0.2,
            reasoning_effort: "medium",
            include_reasoning: false,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "ensina_me_tutor_response",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    message: { type: "string" },
                    shareable: { type: "boolean" },
                    visual_aid: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        enabled: { type: "boolean" },
                        type: { type: "string", enum: ["flow", "concept_map", "comparison"] },
                        title: { type: "string" },
                        items: { type: "array", minItems: 0, maxItems: 6, items: { type: "string" } },
                        caption: { type: "string" },
                      },
                      required: ["enabled", "type", "title", "items", "caption"],
                    },
                    microassessment: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        enabled: { type: "boolean" },
                        question: { type: "string" },
                        options: {
                          type: "array",
                          minItems: 0,
                          maxItems: 4,
                          items: { type: "string" },
                        },
                        correct_option_index: {
                          type: "integer",
                          minimum: 0,
                          maximum: 3,
                        },
                        explanation: { type: "string" },
                        difficulty: {
                          type: "string",
                          enum: ["introductory", "intermediate", "advanced"],
                        },
                        concept_tags: {
                          type: "array",
                          minItems: 0,
                          maxItems: 3,
                          items: { type: "string" },
                        },
                      },
                      required: [
                        "enabled",
                        "question",
                        "options",
                        "correct_option_index",
                        "explanation",
                        "difficulty",
                        "concept_tags",
                      ],
                    },
                  },
                  required: ["message", "shareable", "visual_aid", "microassessment"],
                },
              },
            },
          }),
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return json(
          {
            error: "O tutor demorou mais que o esperado. Tente novamente.",
            conversation_id: conversationId,
          },
          504,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const payload = await groqResponse.json();

    if (!groqResponse.ok) {
      const providerErrorRecord =
        isRecord(payload) && isRecord(payload.error) ? payload.error : null;
      const providerError =
        providerErrorRecord && typeof providerErrorRecord.message === "string"
          ? providerErrorRecord.message
          : "erro não especificado";
      const requestId = groqResponse.headers.get("x-request-id");

      console.error(
        "[Ensina-me] ai-tutor: Groq respondeu com erro",
        JSON.stringify({
          status: groqResponse.status,
          request_id: requestId,
          message: providerError,
        }),
      );

      const userFacingError =
        groqResponse.status === 401 || groqResponse.status === 403
          ? "A credencial do Tutor não foi aceita pelo provedor de IA. Verifique a configuração do GROQ_API_KEY no Supabase."
          : groqResponse.status === 429
            ? "O limite gratuito do provedor de IA foi atingido temporariamente. Tente novamente mais tarde."
            : "O Tutor de IA não conseguiu gerar a resposta. Tente novamente.";

      return json(
        {
          error: userFacingError,
          conversation_id: conversationId,
        },
        502,
      );
    }

    const tutorResult = extractTutorResult(payload);

    if (!tutorResult?.message) {
      console.error("[Ensina-me] ai-tutor: resposta estruturada inválida ou vazia");
      return json(
        {
          error: "O Tutor recebeu uma resposta que não pôde ser interpretada. Tente novamente.",
          conversation_id: conversationId,
        },
        502,
      );
    }

    const assistantMessage = tutorResult.message;
    const generatedAssessment = tutorResult.microassessment;

    if (tutorResult.visualAid.enabled) {
      const imageQueries = [
        topic.name + " em português diagrama",
        topic.name + " português esquema",
        topic.name + " em português processo",
        topic.name + " diagrama",
        topic.name + " process diagram",
        topic.name,
      ].map((query) => query.trim()).filter(Boolean);
      tutorResult.visualAid.image =
        await findPublicDomainImage(imageQueries) ??
        await findKnownPublicDomainImage(topic.name);
      if (tutorResult.visualAid.image) {
        tutorResult.visualAid.caption = tutorResult.visualAid.caption
          ? tutorResult.visualAid.caption + " Imagem pública licenciada encontrada pelo Tutor."
          : "Imagem pública licenciada encontrada pelo Tutor.";
      }
    }

    let publicMicroAssessment: {
      id: string;
      question: string;
      options: string[];
      difficulty: "introductory" | "intermediate" | "advanced";
      concept_tags: string[];
    } | null = null;

    if (
      generatedAssessment?.enabled &&
      learningAction === "practice" &&
      generatedAssessment.question.length > 0 &&
      generatedAssessment.options.length === 4 &&
      generatedAssessment.options.every((option) => option.trim().length > 0) &&
      generatedAssessment.correct_option_index >= 0 &&
      generatedAssessment.correct_option_index <= 3 &&
      generatedAssessment.explanation.length > 0
    ) {
      const { data: savedAssessment, error: assessmentInsertError } = await supabase
        .from("ai_micro_assessments")
        .insert({
          user_id: userData.user.id,
          topic_id: topicId,
          conversation_id: conversationId,
          question_text: generatedAssessment.question,
          options: generatedAssessment.options,
          correct_option_index: generatedAssessment.correct_option_index,
          explanation: generatedAssessment.explanation,
          difficulty: generatedAssessment.difficulty,
          concept_tags: generatedAssessment.concept_tags,
        })
        .select("id")
        .single();

      if (assessmentInsertError || !savedAssessment) {
        console.warn(
          "[Ensina-me] ai-tutor: microavaliação não pôde ser salva",
          assessmentInsertError?.message ?? "resultado vazio",
        );
      } else {
        publicMicroAssessment = {
          id: savedAssessment.id,
          question: generatedAssessment.question,
          options: generatedAssessment.options,
          difficulty: generatedAssessment.difficulty,
          concept_tags: generatedAssessment.concept_tags,
        };
      }
    }

    const { error: userInsertError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        user_id: userData.user.id,
        role: "user",
        content: userMessage,
      });

    if (userInsertError) {
      return json(
        {
          error: "Não foi possível registrar a pergunta.",
          conversation_id: conversationId,
        },
        500,
      );
    }

    const { error: assistantInsertError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        user_id: userData.user.id,
        role: "assistant",
        content: assistantMessage,
      });

    if (assistantInsertError) {
      return json(
        {
          error: "A resposta foi gerada, mas não pôde ser registrada.",
          conversation_id: conversationId,
        },
        500,
      );
    }

    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", userData.user.id);

    const { error: progressError } = await supabase
      .from("student_topic_progress")
      .upsert(
        {
          user_id: userData.user.id,
          topic_id: topicId,
          status: "in_progress",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" },
      );

    if (progressError) {
      console.warn(
        "[Ensina-me] ai-tutor: não foi possível atualizar progresso",
        progressError.message,
      );
    }

    for (const signal of learningSignals) {
      const { error: difficultyError } = await supabase.rpc("record_topic_difficulty", {
        _topic_id: topicId,
        _difficulty_tag: signal,
      });

      if (difficultyError) {
        console.warn(
          "[Ensina-me] ai-tutor: não foi possível registrar sinal de dificuldade",
          JSON.stringify({ signal, message: difficultyError.message }),
        );
      }
    }

    return json({
      conversation_id: conversationId,
      message: assistantMessage,
      learning_action: learningAction,
      learning_signals: learningSignals,
      micro_assessment: publicMicroAssessment,
      shareable: tutorResult.shareable,
      video_recommendation:
        tutorResult.videoRecommendation?.enabled && topicVideo
          ? {
              enabled: true,
              reason: tutorResult.videoRecommendation.reason,
              video: topicVideo,
            }
          : {
              enabled: false,
              reason: tutorResult.videoRecommendation?.reason ?? "",
              video: null,
            },
      visual_aid: tutorResult.visualAid,
    });
  } catch (error) {
    console.error(
      "[Ensina-me] ai-tutor error",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Erro interno do tutor." }, 500);
  }
});
