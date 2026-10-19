import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createInitialIdempotencyKey,
  retryAfterSecondsFromResponse,
  runInitialQuestionFlow,
  runInitialQuestionFlowOnce,
  selectRelevantAcademicSections,
  normalizeQuestionOptionText,
  hasPhotosynthesisOxygenAttributionError,
} from "./initial-question-flow.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  action?: "chat" | "answer_microassessment" | "generate_next_microassessment" | "generate_initial_microassessment" | "start_formal_evaluation" | "generate_recovery_question";
  topic_id?: string;
  conversation_id?: string | null;
  idempotency_key?: string;
  message?: string;
  answer_context?: string;
  micro_assessment_id?: string;
  selected_option_index?: number;
  recovery_concept?: string;
  recovery_question?: string;
  recovery_explanation?: string;
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

type LearningObservation = {
  concept: string;
  signal_type: "comprehension_gap" | "comparison_gap" | "application_gap" | "concept_gap" | "procedure_gap";
  severity: number;
  evidence: string;
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

function isQuestionTooSimilar(candidate: string, previous: string): boolean {
  const normalizedCandidate = normalizeForComparison(candidate);
  const normalizedPrevious = normalizeForComparison(previous);
  if (!normalizedCandidate || !normalizedPrevious) return false;
  if (normalizedCandidate === normalizedPrevious) return true;

  const ignored = new Set([
    "qual", "quais", "como", "quando", "onde", "porque", "porquê",
    "para", "pela", "pelo", "sobre", "entre", "uma", "umas", "uns",
    "que", "com", "sem", "dos", "das", "deve", "ser", "sao", "sua",
    "seu", "isso", "essa", "esse", "esta", "este", "mais", "menos",
    "correta", "correto", "alternativa", "questao",
  ]);
  const candidateWords = new Set(
    normalizedCandidate.match(/[a-z0-9]+/g)?.filter((word) => word.length > 3 && !ignored.has(word)) ?? [],
  );
  const previousWords = new Set(
    normalizedPrevious.match(/[a-z0-9]+/g)?.filter((word) => word.length > 3 && !ignored.has(word)) ?? [],
  );
  if (candidateWords.size < 5 || previousWords.size < 5) return false;

  let overlap = 0;
  for (const word of candidateWords) {
    if (previousWords.has(word)) overlap += 1;
  }
  const smallerSetSize = Math.min(candidateWords.size, previousWords.size);
  const unionSize = new Set([...candidateWords, ...previousWords]).size;
  return overlap / smallerSetSize >= 0.85 && overlap / unionSize >= 0.65;
}

async function generateFormalEvaluationQuestions(args: {
  apiKey: string;
  topicName: string;
  topicDescription: string | null;
  context: string;
  previousAttempt: Array<{ question_text: string; options: string[] }>;
  seed: string;
  temperature?: number;
  model?: string;
}): Promise<{ questions: GeneratedFormalEvaluationQuestion[] | null; rateLimited: boolean }> {
  const previousQuestions = args.previousAttempt
    .slice(0, 20)
    .map((item, index) => (index + 1) + ". " + item.question_text)
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
    "- Considere o identificador aleatório da tentativa: " + args.seed + ". Use-o apenas como gatilho para variar os casos, exemplos, relações conceituais e ordem cognitiva.\n" +
    (previousQuestions
      ? "\nTENTATIVA ANTERIOR — NÃO REPETIR:\n" + previousQuestions
      : "\nNão existe tentativa anterior. Crie a primeira avaliação.\n") +
    "\n\nTÓPICO: " + args.topicName +
    (args.topicDescription ? "\nDESCRIÇÃO: " + args.topicDescription : "") +
    "\n\nCONTEXTO ACADÊMICO:\n" +
    args.context;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetchWithProviderFallback({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + args.apiKey,
        },
        body: JSON.stringify({
          model: args.model ?? "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: "Gere agora as 10 questões da nova tentativa." },
          ],
          max_completion_tokens: 2000,
          temperature: args.temperature ?? 0.35,
          reasoning_effort: "low",
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
      return {
        questions: null,
        rateLimited: response.status === 429,
      };
    }

    const raw = extractOutputText(payload);
    if (!raw) return { questions: null, rateLimited: false };

    const parsed = JSON.parse(raw) as { questions?: unknown };
    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 10) return { questions: null, rateLimited: false };

    const questions: GeneratedFormalEvaluationQuestion[] = [];

    for (const item of parsed.questions) {
      if (!isRecord(item)) return { questions: null, rateLimited: false };
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
        return { questions: null, rateLimited: false };
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
      return { questions: null, rateLimited: false };
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
        return { questions: null, rateLimited: false };
      }
    }

    return { questions, rateLimited: false };
  } catch (error) {
    console.warn(
      "[Ensina-me] ai-tutor: erro ao gerar avaliação formal",
      error instanceof Error ? error.message : "unknown error",
    );
    return { questions: null, rateLimited: false };
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

async function resolveWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

const OPTIONAL_MEDIA_LOOKUP_TIMEOUT_MS = 1800;
const DAILY_USER_MESSAGE_LIMIT = 60; // Tutor acadêmico Ensina-me
const MAX_CONTEXT_CHARACTERS = 24000;;
const PUBLIC_IMAGE_LICENSES = new Set(["cc0", "pdm"]);
type TutorVideo = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  embed_url: string;
  channel_name: string | null;
  duration_label: string | null;
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function searchYoutubeVideoForQuestion(question: string, topicName: string): Promise<TutorVideo | null> {
  const normalizedQuestion = question.replace(/\s+/g, " ").trim();
  const query = [normalizedQuestion, topicName, "aula explicação"].filter(Boolean).join(" ").slice(0, 220);
  try {
    const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": "Mozilla/5.0 (compatible; Ensina-me/1.0)",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();

    const candidates: TutorVideo[] = [];
    const rendererRegex = /"videoRenderer":\{"videoId":"([^"]+)"[\s\S]*?"title":\{"runs":\[\{"text":"([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = rendererRegex.exec(html)) && candidates.length < 8) {
      const id = match[1];
      const title = decodeHtmlEntities(match[2]);
      if (!id || !title || candidates.some((item) => item.id === id)) continue;

      const contextStart = Math.max(0, match.index);
      const context = html.slice(contextStart, Math.min(html.length, contextStart + 9000));
      const channelMatch = context.match(/"ownerText":\{"runs":\[\{"text":"([^"]+)"/);
      const lengthMatch = context.match(/"lengthText":\{"simpleText":"([^"]+)"/);

      candidates.push({
        id,
        title,
        description: null,
        video_url: "https://www.youtube.com/watch?v=" + id,
        embed_url: "https://www.youtube.com/embed/" + id,
        channel_name: channelMatch ? decodeHtmlEntities(channelMatch[1]) : null,
        duration_label: lengthMatch ? decodeHtmlEntities(lengthMatch[1]) : null,
      });
    }

    // Prefer Portuguese/educational titles and avoid obvious Shorts where possible.
    const scored = candidates.map((video) => {
      const title = normalizeForComparison(video.title);
      let score = 0;
      if (/(aula|explicacao|explicacao|conceito|entenda|como funciona|resumo)/.test(title)) score += 3;
      if (/(portugues|brasil|brasileir)/.test(title)) score += 1;
      if (!/shorts/.test(title)) score += 1;
      return { video, score };
    }).sort((a, b) => b.score - a.score);

    return scored[0]?.video ?? null;
  } catch (error) {
    console.warn("[Ensina-me] ai-tutor: busca de vídeo no YouTube falhou", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}


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

/**
 * Uses Groq first and automatically retries transient provider failures with Gemini.
 * Gemini is optional until GEMINI_API_KEY is configured in Supabase Edge Function secrets.
 */
async function fetchWithProviderFallback(init: RequestInit): Promise<Response> {
  const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  let geminiResponse: Response | null = null;
  let geminiError: unknown = null;

  // Gemini is the primary provider. Groq remains available as a fallback.
  if (geminiApiKey) {
    try {
      const requestHeaders = new Headers(init.headers);
      requestHeaders.set("Authorization", "Bearer " + geminiApiKey);
      requestHeaders.set("Content-Type", "application/json");

      let requestBody = init.body;
      if (typeof requestBody === "string") {
        try {
          const parsed = JSON.parse(requestBody) as Record<string, unknown>;
          parsed.model = "gemini-3.8-flash";
          delete parsed.include_reasoning;
          delete parsed.reasoning_effort;
          if (typeof parsed.max_completion_tokens === "number") {
            parsed.max_tokens = parsed.max_completion_tokens;
            delete parsed.max_completion_tokens;
          }
          requestBody = JSON.stringify(parsed);
        } catch {
          // Preserve non-JSON bodies and let the provider report the error.
        }
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          { ...init, signal: controller.signal, headers: requestHeaders, body: requestBody },
        );
      } finally {
        clearTimeout(timeout);
      }

      // Any non-2xx provider response must allow the configured fallback to run.
      // In particular, 400 can mean a model/schema incompatibility, not a user error.
      if (geminiResponse.ok) {
        return geminiResponse;
      }
      console.warn("[Ensina-me] ai-tutor: Gemini indisponível; tentando Groq", geminiResponse.status);
    } catch (error) {
      geminiError = error;
      console.warn("[Ensina-me] ai-tutor: falha de rede/timeout no Gemini; tentando Groq");
    }
  }

  if (!groqApiKey) {
    if (geminiResponse) return geminiResponse;
    throw geminiError instanceof Error
      ? geminiError
      : new Error("Nenhum provedor disponível: configure GEMINI_API_KEY ou GROQ_API_KEY.");
  }

  try {
    const groqHeaders = new Headers(init.headers);
    groqHeaders.set("Authorization", "Bearer " + groqApiKey);
    // Give the fallback its own deadline. Reusing init.signal is unsafe here:
    // the caller's timer may already have expired while Gemini was being tried.
    const groqController = new AbortController();
    const groqTimeout = setTimeout(() => groqController.abort(), 12000);
    let groqResponse: Response;
    try {
      groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        { ...init, signal: groqController.signal, headers: groqHeaders },
      );
    } finally {
      clearTimeout(groqTimeout);
    }
    if (!groqResponse.ok) {
      console.warn("[Ensina-me] ai-tutor: Groq também falhou", groqResponse.status);
    } else {
      console.info("[Ensina-me] ai-tutor: resposta gerada pelo provedor Groq (fallback)");
    }
    return groqResponse;
  } catch (groqError) {
    console.error("[Ensina-me] ai-tutor: falha de rede no Groq",
      groqError instanceof Error ? groqError.message : "unknown error");
    if (geminiResponse) return geminiResponse;
    throw groqError;
  }
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
  learningObservations: LearningObservation[];
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
      learning_observations?: unknown;
      shareable?: unknown;
      visual_aid?: unknown;
      video_recommendation?: unknown;
    };

    if (typeof parsed.message !== "string") return null;

    let microassessment: GeneratedMicroAssessment | null = null;

    if (isRecord(parsed.microassessment)) {
      const enabled = parsed.microassessment.enabled === true;
      const question =
        typeof parsed.microassessment.question === "string"
          ? parsed.microassessment.question.trim()
          : "";
      const options = Array.isArray(parsed.microassessment.options)
        ? parsed.microassessment.options
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
        : [];
      const rawCorrectIndex = parsed.microassessment.correct_option_index;
      const correctIndex =
        typeof rawCorrectIndex === "number" && Number.isInteger(rawCorrectIndex)
          ? rawCorrectIndex
          : -1;
      const explanation =
        typeof parsed.microassessment.explanation === "string"
          ? parsed.microassessment.explanation.trim()
          : "";
      const rawDifficulty = parsed.microassessment.difficulty;
      const difficulty =
        rawDifficulty === "introductory" ||
        rawDifficulty === "advanced" ||
        rawDifficulty === "intermediate"
          ? rawDifficulty
          : "intermediate";
      const tags = Array.isArray(parsed.microassessment.concept_tags)
        ? parsed.microassessment.concept_tags
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];

      if (!enabled) {
        microassessment = {
          enabled: false,
          question: "",
          options: [],
          correct_option_index: 0,
          explanation: "",
          difficulty,
          concept_tags: [],
        };
      } else {
        const validAssessment =
          question.length >= 30 &&
          options.length === 4 &&
          options.every((option) => option.length >= 8) &&
          uniqueNormalized(options) &&
          correctIndex >= 0 &&
          correctIndex < 4 &&
          explanation.length >= 25 &&
          tags.length > 0 &&
          uniqueNormalized(tags);

        if (validAssessment) {
          microassessment = {
            enabled: true,
            question,
            options,
            correct_option_index: correctIndex,
            explanation,
            difficulty,
            concept_tags: tags,
          };
        }
      }
    }

    const learningObservations: LearningObservation[] = Array.isArray(parsed.learning_observations)
      ? parsed.learning_observations
          .filter(isRecord)
          .map((item) => {
            const signalType = item.signal_type;
            const severity = typeof item.severity === "number" ? Math.trunc(item.severity) : 3;
            return {
              concept: typeof item.concept === "string" ? item.concept.trim().slice(0, 180) : "",
              signal_type:
                signalType === "comprehension_gap" ||
                signalType === "comparison_gap" ||
                signalType === "application_gap" ||
                signalType === "concept_gap" ||
                signalType === "procedure_gap"
                  ? signalType
                  : "concept_gap",
              severity: Math.max(1, Math.min(5, severity)),
              evidence: typeof item.evidence === "string" ? item.evidence.trim().slice(0, 500) : "",
            };
          })
          .filter((item) => item.concept.length > 0)
          .slice(0, 4)
      : [];

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
      learningObservations,
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
  image: {
    enabled: boolean;
    url: string;
    title: string;
    sourceUrl: string;
    license: string;
    attribution: string;
  } | null;
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
  purpose?: "initial" | "adaptive";
  seed?: string;
  onRateLimit?: (retryAfterSeconds: number) => void;
}): Promise<AdaptiveMicroAssessment | null> {
  const adaptiveInstruction = args.purpose === "initial"
    ? "O aluno acabou de ler uma explicação acadêmica e precisa de uma verificação breve da compreensão. Crie uma questão diagnóstica nova, diretamente ligada ao que foi explicado. Não escreva uma mensagem de correção de resposta anterior."
    : args.wasCorrect
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
    "- Cada alternativa incorreta deve representar um erro conceitual plausível e distinto, sem pegadinhas ou distratores obviamente absurdos.\n" +
    "- As alternativas devem ser mutuamente exclusivas: exatamente uma pode estar correta. Não use como distrator uma subetapa que também seja correta dentro de uma alternativa mais ampla.\n" +
    "- Cada item de options deve conter apenas o texto da alternativa, sem prefixos como 'A.', '1.' ou entidades HTML/Markdown.\n" +
    "- Confira a sequência causal e atribua cada produto ou subproduto à etapa em que realmente ocorre; não o desloque para o fim apenas pela ordem narrativa.\n" +
    "- Em fotossíntese, o O₂ é liberado nas reações luminosas pela fotólise da água, nunca pelo Ciclo de Calvin/fase escura. O Ciclo de Calvin utiliza ATP e NADPH para fixar CO₂ e formar G3P, precursor de açúcares.\n" +
    "- Se a explicação anterior contiver erro factual, corrija-o em vez de reproduzi-lo; priorize a precisão científica e o contexto acadêmico confiável.\n" +
    "- A explicação deve justificar a resposta com a relação conceitual precisa do contexto, não com elogios ou frases genéricas.\n" +
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
    "- Finalidade: " + (args.purpose === "initial" ? "verificação inicial da explicação recém-apresentada" : "continuação adaptativa") +
    "\n- Identificador de variação: " + (args.seed ?? "sem identificador") +
    "\n- Resultado anterior: " +
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
    (args.recentQuestions
      .slice(0, args.purpose === "initial" ? 8 : 12)
      .map((question) => question.slice(0, 220))
      .join(" | ") || "nenhuma") +
    "\n\n" +
    "CONTEXTO ACADÊMICO\n" +
    args.context;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetchWithProviderFallback({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + args.apiKey,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: args.purpose === "initial"
                ? "Com base na pergunta do aluno e na explicação incluídas no contexto, gere uma pergunta inédita para verificar a compreensão."
                : args.wasCorrect
                  ? "Continue a sequência com uma mensagem breve de feedback e uma nova questão mais desafiadora."
                  : "Continue a sequência com uma explicação curta, um exemplo correto e uma nova questão de reforço.",
            },
          ],
          max_completion_tokens: args.purpose === "initial" ? 550 : 900,
          temperature: 0.2,
          reasoning_effort: "low",
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
                      // Runtime validation below enforces four options and index 0–3.
                      options: {
                        type: "array",
                        items: { type: "string" },
                      },
                      correct_option_index: {
                        type: "integer",
                      },
                      explanation: { type: "string" },
                      difficulty: {
                        type: "string",
                        enum: ["introductory", "intermediate", "advanced"],
                      },
                      concept_tags: {
                        type: "array",
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

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const providerError =
        isRecord(payload) && isRecord(payload.error) ? payload.error : null;
      const providerMessage =
        providerError && typeof providerError.message === "string"
          ? providerError.message.slice(0, 240)
          : "detalhe do provedor indisponível";
      console.warn(
        "[Ensina-me] ai-tutor: falha ao gerar continuação adaptativa",
        response.status,
        providerMessage,
      );
      if (response.status === 429) {
        args.onRateLimit?.(retryAfterSecondsFromResponse(response.headers, providerMessage));
      }
      return null;
    }

    const parsed = extractTutorResult(payload);
    if (!parsed?.message || !parsed.microassessment?.enabled) return null;

    const next = parsed.microassessment;
    const normalizedOptions = Array.isArray(next.options)
      ? next.options.map((option) => typeof option === "string" ? normalizeQuestionOptionText(option) : "")
      : [];
    if (
      next.question.trim().length < 30 ||
      normalizedOptions.length !== 4 ||
      normalizedOptions.some((option) => option.length < 8) ||
      !uniqueNormalized(normalizedOptions) ||
      !Number.isInteger(next.correct_option_index) ||
      next.correct_option_index < 0 ||
      next.correct_option_index > 3 ||
      next.explanation.trim().length < 25
    ) {
      return null;
    }

    if (hasPhotosynthesisOxygenAttributionError({
      question: next.question,
      correctOption: normalizedOptions[next.correct_option_index] ?? "",
      explanation: next.explanation,
    })) {
      console.warn("[Ensina-me] ai-tutor: questão recusada por atribuir incorretamente a liberação de O₂ ao Ciclo de Calvin");
      return null;
    }

    if (args.recentQuestions.some((question) => isQuestionTooSimilar(next.question, question))) {
      console.warn("[Ensina-me] ai-tutor: questão adaptativa repetida recusada");
      return null;
    }

    next.difficulty = args.nextDifficulty;
    next.concept_tags =
      next.concept_tags.length > 0
        ? next.concept_tags.slice(0, 3)
        : args.weakestConcept
          ? [args.weakestConcept]
          : args.previousTags.slice(0, 3);

    return { message: parsed.message, microassessment: { ...next, options: normalizedOptions } };
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
      if (!groqApiKey && !Deno.env.get("GEMINI_API_KEY")?.trim()) {
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

      // Todas as avaliações anteriores do mesmo tópico são usadas como memória
      // de repetição. A nova avaliação precisa ser inédita em relação ao histórico
      // inteiro, não apenas à última tentativa.
      const previousAttempt = history.flatMap((attempt: unknown) => {
        if (!isRecord(attempt) || !Array.isArray(attempt.questions)) return [];
        return attempt.questions
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
          }));
      });

      const evaluationGenerationArgs = {
        apiKey: groqApiKey ?? Deno.env.get("GEMINI_API_KEY")?.trim() ?? "",
        topicName: topic.name,
        topicDescription: topic.description,
        context: truncateText(context, MAX_CONTEXT_CHARACTERS),
        previousAttempt,
      };

      // Não expor ao aluno o mecanismo de tentativa. O Tutor continua gerando
      // até obter uma avaliação válida e inédita. Em caso de 429 no modelo
      // principal, troca automaticamente para um segundo modelo compatível.
      let questions: GeneratedFormalEvaluationQuestion[] | null = null;
      let rateLimited = false;
      // Keep the start flow responsive: at most one fast model attempt and
      // one fallback attempt. The previous implementation could make four
      // sequential 30s calls before reaching the bank fallback.
      const models = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];

      for (const model of models) {
        const generated = await generateFormalEvaluationQuestions({
          ...evaluationGenerationArgs,
          context: truncateText(evaluationGenerationArgs.context, 7000),
          seed: crypto.randomUUID(),
          temperature: 0.35,
          model,
        });

        if (generated.questions) {
          questions = generated.questions;
          break;
        }

        if (generated.rateLimited) {
          rateLimited = true;
        }
      }

      if (!questions) {
        // Garantia de disponibilidade: o tópico pode possuir uma avaliação-base
        // publicada no banco. Ela funciona como plano B quando o provedor de IA
        // estiver temporariamente indisponível. A IA continua sendo a rota
        // principal para gerar uma prova inédita.
        const { data: bankExercise } = await supabase
          .from("exercises")
          .select("id")
          .eq("topic_id", topicId)
          .eq("exercise_type", "evaluation")
          .eq("published", true)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (bankExercise?.id) {
          const { data: bankQuestions } = await supabase
            .from("exercise_questions")
            .select("id, question_text, position, feedback_hint")
            .eq("exercise_id", bankExercise.id)
            .order("position", { ascending: true })
            .limit(40);

          const bankIds = (bankQuestions ?? []).map((q) => q.id);
          const { data: bankOptions } = bankIds.length
            ? await supabase
                .from("exercise_options")
                .select("question_id, content, is_correct, position")
                .in("question_id", bankIds)
                .order("position", { ascending: true })
            : { data: [] };

          const previousTexts = new Set(
            previousAttempt.map((item) => normalizeForComparison(item.question_text)),
          );

          const fallback = (bankQuestions ?? [])
            .map((q) => {
              const options = (bankOptions ?? [])
                .filter((o) => o.question_id === q.id)
                .sort((a, b) => a.position - b.position);
              const correctIndex = options.findIndex((o) => o.is_correct);
              if (
                options.length !== 4 ||
                correctIndex < 0 ||
                previousTexts.has(normalizeForComparison(q.question_text))
              ) {
                return null;
              }
              return {
                question_text: q.question_text,
                options: options.map((o) => o.content),
                correct_option_index: correctIndex,
                explanation:
                  q.feedback_hint ??
                  "A alternativa correta aplica o conceito estudado ao problema apresentado.",
                difficulty: "intermediate" as const,
                concept_tags: [topic.name],
              };
            })
            .filter((item): item is GeneratedFormalEvaluationQuestion => Boolean(item))
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);

          if (fallback.length === 10) {
            questions = fallback;
          }
        }
      }

      if (!questions) {
        console.error(
          "[Ensina-me] ai-tutor: falha ao gerar avaliação formal",
          rateLimited ? "rate_limit" : "validation_or_provider_error",
        );
        return json(
          {
            evaluation_unavailable: true,
            retryable: true,
            error: "A avaliação está sendo preparada. Tente novamente em alguns segundos.",
          },
          200,
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


    if (body.action === "generate_recovery_question") {
      const topicId = body.topic_id?.trim();
      const concept = body.recovery_concept?.trim();
      const previousQuestion = body.recovery_question?.trim();
      const explanation = body.recovery_explanation?.trim();

      if (!topicId || !concept || !previousQuestion || !explanation) {
        return json({ error: "Os dados do ponto fraco são obrigatórios." }, 400);
      }

      const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
      if (!groqApiKey && !Deno.env.get("GEMINI_API_KEY")?.trim()) {
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
      ].filter(Boolean).join("\n\n");

      // Primeiro tenta uma questão acadêmica já publicada e validada do mesmo tópico/conceito.
      // A IA só entra quando não existe uma questão adequada no banco.
      let recoveryQuestion = null;
      let recoveryMessage = "Vamos tentar este conceito por outro caminho. Leia com atenção e prove o que entendeu.";

      const { data: fallbackRows } = await supabase
        .from("formal_evaluation_questions")
        .select("question_text, options, correct_option_index, explanation, difficulty, concept_tags, attempt_id")
        .contains("concept_tags", [concept])
        .neq("question_text", previousQuestion)
        .order("created_at", { ascending: false })
        .limit(20);

      if (fallbackRows?.length) {
        const { data: topicAttempts } = await supabase
          .from("evaluation_attempts")
          .select("id")
          .eq("topic_id", topicId)
          .limit(100);

        const allowedAttempts = new Set((topicAttempts ?? []).map((row: { id: string }) => row.id));
        const fallback = fallbackRows.find((row: { attempt_id: string; options: unknown }) =>
          allowedAttempts.has(row.attempt_id) &&
          Array.isArray(row.options) &&
          row.options.length === 4
        );

        if (fallback) {
          recoveryQuestion = {
            question: fallback.question_text,
            options: (fallback.options as string[]).map((option) =>
              String(option).replace(/^\\s*[A-D][.)]\\s*/i, "").trim()
            ),
            correct_option_index: fallback.correct_option_index,
            explanation: fallback.explanation,
            difficulty: fallback.difficulty,
            concept_tags: Array.isArray(fallback.concept_tags) && fallback.concept_tags.length
              ? fallback.concept_tags
              : [concept],
          };
        }
      }

      if (!recoveryQuestion) {
        const generated = await generateAdaptiveMicroAssessment({
          apiKey: groqApiKey ?? Deno.env.get("GEMINI_API_KEY")?.trim() ?? "",
          topicName: topic.name,
          topicDescription: topic.description,
          context: truncateText(context, 9000),
          previousQuestion,
          previousTags: [concept],
          wasCorrect: false,
          nextDifficulty: "intermediate",
          consecutiveCorrect: 0,
          consecutiveIncorrect: 1,
          weakestConcept: concept,
          recentQuestions: [previousQuestion],
        });

        recoveryQuestion = generated?.microassessment ?? null;
        recoveryMessage = generated?.message ?? "Vamos reconstruir este conceito e testar novamente.";

        if (recoveryQuestion) {
          const options = recoveryQuestion.options.map((option: string) =>
            String(option).replace(/^\\s*[A-D][.)]\\s*/i, "").trim()
          );
          const validShape =
            recoveryQuestion.question.trim().length >= 30 &&
            options.length === 4 &&
            options.every((option: string) => option.length >= 8) &&
            new Set(options.map((option: string) => option.toLowerCase())).size === 4 &&
            Number.isInteger(recoveryQuestion.correct_option_index) &&
            recoveryQuestion.correct_option_index >= 0 &&
            recoveryQuestion.correct_option_index < 4 &&
            String(recoveryQuestion.explanation ?? "").trim().length >= 20;

          recoveryQuestion = validShape
            ? { ...recoveryQuestion, options }
            : null;
        }
      }

      if (!recoveryQuestion) {
        return json({ error: "Não foi possível preparar uma questão de recuperação agora. Tente novamente em instantes." }, 503);
      }

      const { data: saved, error: insertError } = await supabase
        .from("ai_micro_assessments")
        .insert({
          user_id: userData.user.id,
          topic_id: topicId,
          question_text: recoveryQuestion.question,
          options: recoveryQuestion.options,
          correct_option_index: recoveryQuestion.correct_option_index,
          explanation: recoveryQuestion.explanation,
          difficulty: recoveryQuestion.difficulty,
          concept_tags: recoveryQuestion.concept_tags.length
            ? recoveryQuestion.concept_tags
            : [concept],
        })
        .select("id")
        .single();

      if (insertError || !saved) {
        console.error("[Ensina-me] ai-tutor: erro ao criar questão de recuperação", insertError?.message ?? "resultado vazio");
        return json({ error: "Não foi possível preparar a questão de recuperação." }, 500);
      }

      return json({
        assessment_id: saved.id,
        message: recoveryMessage,
        question: recoveryQuestion.question,
        options: recoveryQuestion.options,
        difficulty: recoveryQuestion.difficulty,
        concept_tags: recoveryQuestion.concept_tags.length
          ? recoveryQuestion.concept_tags
          : [concept],
      });
    }

    if (body.action === "generate_initial_microassessment") {
      const topicId = body.topic_id?.trim();
      const userQuestion = body.message?.trim();
      const tutorAnswer = body.answer_context?.trim();
      if (!topicId || !userQuestion || !tutorAnswer) {
        return json({ error: "Tópico, pergunta e explicação são obrigatórios." }, 400);
      }
      if (!body.idempotency_key?.trim() || body.idempotency_key.trim().length > 128) {
        return json({ error: "Identificador da mensagem é obrigatório para gerar a verificação." }, 400);
      }
      if (userQuestion.length > 4000 || tutorAnswer.length > 12000) {
        return json({ error: "O contexto da pergunta é longo demais." }, 400);
      }

      const conversationId = body.conversation_id?.trim() || null;
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
      }

      const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
      if (!groqApiKey && !Deno.env.get("GEMINI_API_KEY")?.trim()) {
        return json({ error: "O Tutor não está configurado para gerar a pergunta." }, 503);
      }

      const [
        { data: topic },
        { data: material },
        { data: previousQuestionRows },
      ] = await Promise.all([
        supabase.from("topics")
          .select("id, name, description")
          .eq("id", topicId).eq("published", true).maybeSingle(),
        supabase.from("materials")
          .select("id, title, introduction")
          .eq("topic_id", topicId).eq("status", "published").maybeSingle(),
        supabase.from("ai_micro_assessments")
          .select("question_text")
          .eq("user_id", userData.user.id).eq("topic_id", topicId)
          .order("created_at", { ascending: false }).limit(30),
      ]);

      if (!topic) return json({ error: "Tópico não encontrado." }, 404);

      const { data: sections } = material
        ? await supabase.from("material_sections")
            .select("title, content, position")
            .eq("material_id", material.id)
            .order("position", { ascending: true })
        : { data: [] };

      const recentQuestions = (previousQuestionRows ?? [])
        .map((item: { question_text: string }) => item.question_text)
        .filter((question: string) => typeof question === "string" && question.trim());

      const relevantSections = selectRelevantAcademicSections(
        sections ?? [],
        userQuestion + "\n" + tutorAnswer + "\n" + topic.name + "\n" + (topic.description ?? ""),
        2,
      );
      const initialContext = [
        "TÓPICO: " + topic.name.slice(0, 240),
        topic.description ? "DESCRIÇÃO: " + topic.description.slice(0, 500) : "",
        material
          ? "MATERIAL: " + material.title.slice(0, 240) + "\n" + (material.introduction ?? "").slice(0, 800)
          : "",
        ...relevantSections.map((section: { title: string; content: string }) =>
          "TRECHO RELEVANTE — " + section.title.slice(0, 160) + "\n" + section.content.slice(0, 450)),
        "PERGUNTA DO ALUNO: " + userQuestion.slice(0, 1200),
        "EXPLICAÇÃO JÁ APRESENTADA PELO TUTOR: " + tutorAnswer.slice(0, 1800),
      ].filter(Boolean).join("\n\n");

      const requestKey = await createInitialIdempotencyKey({
        userId: userData.user.id,
        topicId,
        conversationId,
        clientRequestId: body.idempotency_key.trim(),
        userQuestion,
      });
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
      if (!serviceRoleKey) {
        return json({ error: "O controle seguro de geração do Tutor está temporariamente indisponível." }, 503);
      }
      const requestStore = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const lockNow = new Date();
      const lockNowIso = lockNow.toISOString();
      const processingLease = new Date(lockNow.getTime() + 90_000).toISOString();
      const newRequest = await requestStore.from("ai_tutor_generation_requests").insert({
        user_id: userData.user.id,
        idempotency_key: requestKey,
        topic_id: topicId,
        conversation_id: conversationId,
        state: "processing",
        lease_expires_at: processingLease,
        updated_at: lockNowIso,
      }).select("user_id").maybeSingle();

      let ownsGenerationRequest = !newRequest.error;
      if (newRequest.error && newRequest.error.code !== "23505") {
        console.error("[Ensina-me] ai-tutor: falha ao registrar idempotência", newRequest.error.message);
        return json({ error: "Não foi possível iniciar a verificação de compreensão com segurança." }, 503);
      }

      if (!ownsGenerationRequest) {
        const { data: existingRequest, error: existingRequestError } = await requestStore
          .from("ai_tutor_generation_requests")
          .select("state, assessment_id, lease_expires_at")
          .eq("user_id", userData.user.id)
          .eq("idempotency_key", requestKey)
          .maybeSingle();

        if (existingRequestError || !existingRequest) {
          console.error("[Ensina-me] ai-tutor: não foi possível ler a chave de idempotência", existingRequestError?.message ?? "registro ausente");
          return json({ error: "Não foi possível confirmar o estado da verificação." }, 503);
        }

        let existingState = existingRequest.state as string;
        let existingLease = Date.parse(existingRequest.lease_expires_at as string);
        if (existingState === "completed" && existingRequest.assessment_id) {
          const { data: savedAssessment, error: savedAssessmentError } = await supabase
            .from("ai_micro_assessments")
            .select("id, question_text, options, difficulty, concept_tags")
            .eq("id", existingRequest.assessment_id)
            .eq("user_id", userData.user.id)
            .eq("topic_id", topicId)
            .maybeSingle();
          if (savedAssessmentError) {
            return json({ error: "A verificação já foi gerada, mas não foi possível recuperá-la agora." }, 503);
          }
          if (savedAssessment && Array.isArray(savedAssessment.options)) {
            return json({
              micro_assessment: {
                id: savedAssessment.id,
                question: savedAssessment.question_text,
                options: savedAssessment.options,
                difficulty: savedAssessment.difficulty,
                concept_tags: savedAssessment.concept_tags ?? [],
              },
            });
          }
          existingState = "failed";
          existingLease = Date.now();
          await requestStore.from("ai_tutor_generation_requests").update({
            state: "failed",
            assessment_id: null,
            error_code: "completed_assessment_missing",
            lease_expires_at: new Date(existingLease).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("user_id", userData.user.id).eq("idempotency_key", requestKey).eq("state", "completed");
        }

        const nowMs = Date.now();
        if (existingState === "rate_limited" && existingLease > nowMs) {
          const retryAfterSeconds = Math.max(1, Math.ceil((existingLease - nowMs) / 1000));
          return new Response(JSON.stringify({
            error: "A geração desta pergunta ainda está no intervalo de espera do provedor.",
            retry_after_seconds: retryAfterSeconds,
          }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfterSeconds) } });
        }
        if (existingState === "processing" && existingLease > nowMs) {
          return json({
            error: "A pergunta desta mensagem já está sendo preparada. Aguarde a conclusão da primeira solicitação.",
            in_progress: true,
            retry_after_seconds: Math.max(1, Math.ceil((existingLease - nowMs) / 1000)),
          }, 409);
        }

        const reclaimable = existingState === "failed"
          || existingState === "rate_limited"
          || existingState === "processing";
        if (!reclaimable) {
          return json({ error: "A solicitação já foi processada; envie uma nova mensagem para gerar outra verificação." }, 409);
        }
        const reclaimed = await requestStore.from("ai_tutor_generation_requests").update({
          state: "processing",
          assessment_id: null,
          error_code: null,
          lease_expires_at: processingLease,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userData.user.id)
          .eq("idempotency_key", requestKey)
          .eq("state", existingState)
          .lte("lease_expires_at", new Date(nowMs).toISOString())
          .select("user_id")
          .maybeSingle();

        if (reclaimed.error) {
          console.error("[Ensina-me] ai-tutor: falha ao reivindicar retry idempotente", reclaimed.error.message);
          return json({ error: "Não foi possível liberar a nova tentativa com segurança." }, 503);
        }
        if (!reclaimed.data) {
          return json({
            error: "A verificação desta mensagem já está sendo processada por outra solicitação.",
            in_progress: true,
            retry_after_seconds: 2,
          }, 409);
        }
        ownsGenerationRequest = true;
      }

      if (!ownsGenerationRequest) {
        return json({ error: "A verificação desta mensagem já foi iniciada." }, 409);
      }

      const updateGenerationRequest = async (
        state: "processing" | "rate_limited" | "completed" | "failed",
        patch: Record<string, unknown> = {},
      ) => {
        const { error: updateError } = await requestStore
          .from("ai_tutor_generation_requests")
          .update({ state, ...patch, updated_at: new Date().toISOString() })
          .eq("user_id", userData.user.id)
          .eq("idempotency_key", requestKey);
        if (updateError) {
          console.error("[Ensina-me] ai-tutor: falha ao finalizar chave de idempotência", updateError.message);
        }
      };

      const flowResult = await runInitialQuestionFlowOnce(
        userData.user.id + ":" + requestKey,
        () => runInitialQuestionFlow({
          maxAttempts: 2,
          generate: async () => {
            let providerRetryAfter: number | null = null;
            const generated = await generateAdaptiveMicroAssessment({
              apiKey: groqApiKey ?? Deno.env.get("GEMINI_API_KEY")?.trim() ?? "",
              topicName: topic.name,
              topicDescription: topic.description,
              context: truncateText(initialContext, 6500),
              previousQuestion: "Nenhuma pergunta anterior desta explicação.",
              previousTags: [],
              wasCorrect: true,
              nextDifficulty: "intermediate",
              consecutiveCorrect: 0,
              consecutiveIncorrect: 0,
              weakestConcept: null,
              recentQuestions: recentQuestions.slice(0, 8).map((question: string) => question.slice(0, 220)),
              purpose: "initial",
              seed: crypto.randomUUID(),
              onRateLimit: (seconds) => {
                providerRetryAfter = seconds;
              },
            });
            return {
              question: generated?.microassessment ?? null,
              retryAfterSeconds: providerRetryAfter,
            };
          },
          isDuplicate: (question) => recentQuestions.some((previous) =>
            isQuestionTooSimilar(question.question, previous)
          ),
          save: async (question) => {
            const { data: saved, error: saveError } = await supabase
              .from("ai_micro_assessments")
              .insert({
                user_id: userData.user.id,
                topic_id: topicId,
                conversation_id: conversationId,
                question_text: question.question,
                options: question.options,
                correct_option_index: question.correct_option_index,
                explanation: question.explanation,
                difficulty: question.difficulty,
                concept_tags: question.concept_tags,
              })
              .select("id")
              .single();
            if (saveError || !saved) {
              console.error("[Ensina-me] ai-tutor: não foi possível salvar verificação inicial", saveError?.message ?? "resultado vazio");
              return null;
            }
            return { id: saved.id };
          },
        }),
      );

      if (flowResult.kind === "rate_limited") {
        const cooldownUntil = new Date(Date.now() + flowResult.retryAfterSeconds * 1000).toISOString();
        await updateGenerationRequest("rate_limited", {
          lease_expires_at: cooldownUntil,
          error_code: "groq_429",
          assessment_id: null,
        });
        return new Response(JSON.stringify({
          error: "A IA atingiu temporariamente o limite de geração. Aguarde o intervalo informado antes de tentar novamente.",
          retry_after_seconds: flowResult.retryAfterSeconds,
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(flowResult.retryAfterSeconds) },
        });
      }

      if (flowResult.kind === "saved") {
        await updateGenerationRequest("completed", {
          assessment_id: flowResult.microAssessment.id,
          lease_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          error_code: null,
        });
        return json({ micro_assessment: flowResult.microAssessment });
      }

      await updateGenerationRequest("failed", {
        assessment_id: null,
        lease_expires_at: new Date().toISOString(),
        error_code: flowResult.reason,
      });
      if (flowResult.reason === "save_failed") {
        return json({ error: "A pergunta foi elaborada, mas não pôde ser salva. A explicação principal foi preservada." }, 500);
      }
      return json({
        error: "Não foi possível gerar uma questão inédita e válida agora. A explicação principal foi preservada; tente novamente em instantes.",
      }, 503);
    }
    if (body.action === "generate_next_microassessment") {
      const assessmentId = body.micro_assessment_id?.trim();
      if (!assessmentId) return json({ error: "Microavaliação é obrigatória." }, 400);

      const { data: assessment, error: assessmentError } = await supabase
        .from("ai_micro_assessments")
        .select("id, topic_id, conversation_id, question_text, difficulty, concept_tags, is_correct, status")
        .eq("id", assessmentId)
        .eq("user_id", userData.user.id)
        .eq("status", "answered")
        .maybeSingle();

      if (assessmentError || !assessment) {
        return json({ error: "Resultado da microavaliação não encontrado." }, 404);
      }

      const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
      if (!groqApiKey && !Deno.env.get("GEMINI_API_KEY")?.trim()) return json({ next_micro_assessment: null, next_message: null });

      const [
        { data: topic },
        { data: material },
        { data: recentAssessments },
        { data: previousQuestionRows },
      ] = await Promise.all([
        supabase.from("topics").select("id, name, description")
          .eq("id", assessment.topic_id).eq("published", true).maybeSingle(),
        supabase.from("materials").select("id, title, introduction")
          .eq("topic_id", assessment.topic_id).eq("status", "published").maybeSingle(),
        supabase.from("ai_micro_assessments")
          .select("is_correct, difficulty, concept_tags, question_text, answered_at")
          .eq("user_id", userData.user.id).eq("topic_id", assessment.topic_id).eq("status", "answered")
          .order("answered_at", { ascending: false }).limit(12),
        supabase.from("ai_micro_assessments").select("question_text")
          .eq("user_id", userData.user.id).eq("topic_id", assessment.topic_id)
          .order("created_at", { ascending: false }).limit(30),
      ]);

      if (!topic) return json({ next_micro_assessment: null, next_message: null });

      const { data: sections } = material
        ? await supabase.from("material_sections").select("title, content, position")
            .eq("material_id", material.id).order("position", { ascending: true })
        : { data: [] };

      const context = [
        "TÓPICO: " + topic.name,
        topic.description ? "DESCRIÇÃO: " + topic.description : "",
        material ? "MATERIAL: " + material.title + "\n" + (material.introduction ?? "") : "",
        ...(sections ?? []).map((section: { title: string; content: string }) =>
          "SEÇÃO — " + section.title + "\n" + section.content),
      ].filter(Boolean).join("\n\n");

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

      const currentRank = difficultyRank(assessment.difficulty);
      const nextDifficulty = assessment.is_correct
        ? difficultyFromRank(Math.min(3, currentRank + 1))
        : difficultyFromRank(Math.max(1, currentRank - 1));
      const weakestConcept = pickWeakestConcept(adaptiveHistory.map((item) => ({
        is_correct: item.is_correct,
        concept_tags: item.concept_tags,
      })));
      const recentQuestions = (previousQuestionRows ?? [])
        .map((item: { question_text: string }) => item.question_text)
        .filter((question: string) => typeof question === "string" && question.trim());

      const generated = await generateAdaptiveMicroAssessment({
        apiKey: groqApiKey ?? Deno.env.get("GEMINI_API_KEY")?.trim() ?? "",
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
        recentQuestions,
      });

      if (!generated || recentQuestions.some((question) =>
        isQuestionTooSimilar(generated.microassessment.question, question)
      )) {
        console.warn("[Ensina-me] ai-tutor: continuação recusada para evitar questão repetida");
        return json({ next_micro_assessment: null, next_message: null });
      }

      const { error: expireError } = await supabase.from("ai_micro_assessments")
        .update({ status: "expired" }).eq("user_id", userData.user.id)
        .eq("topic_id", assessment.topic_id).eq("status", "pending");
      if (expireError) {
        console.warn("[Ensina-me] ai-tutor: não foi possível encerrar microavaliações pendentes anteriores", expireError.message);
      }

      const { data: savedNext, error: nextInsertError } = await supabase.from("ai_micro_assessments")
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
        }).select("id").single();

      if (nextInsertError || !savedNext) {
        console.warn("[Ensina-me] ai-tutor: não foi possível salvar próxima microavaliação", nextInsertError?.message ?? "resultado vazio");
        return json({ next_micro_assessment: null, next_message: null });
      }

      if (assessment.conversation_id) {
        const [messageInsert, conversationUpdate] = await Promise.all([
          supabase.from("ai_messages").insert({
            conversation_id: assessment.conversation_id,
            user_id: userData.user.id,
            role: "assistant",
            content: generated.message,
          }),
          supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() })
            .eq("id", assessment.conversation_id).eq("user_id", userData.user.id),
        ]);
        if (messageInsert.error) {
          console.warn("[Ensina-me] ai-tutor: mensagem de continuação não foi registrada", messageInsert.error.message);
        }
        if (conversationUpdate.error) {
          console.warn("[Ensina-me] ai-tutor: conversa não foi atualizada", conversationUpdate.error.message);
        }
      }

      return json({
        next_message: generated.message,
        next_micro_assessment: {
          id: savedNext.id,
          question: generated.microassessment.question,
          options: generated.microassessment.options,
          difficulty: nextDifficulty,
          concept_tags: generated.microassessment.concept_tags,
        },
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

      const [signalResults, { data: recentAssessments }] = await Promise.all([
        Promise.all(
          (assessment.concept_tags ?? []).map(async (concept: string) => {
            const { error: signalError } = await supabase.rpc("record_learning_signal", {
              _topic_id: assessment.topic_id,
              _concept: concept,
              _signal_type: "micro_error",
              _severity: assessment.is_correct ? 1 : 5,
              _evidence: assessment.question_text,
              _correct: Boolean(assessment.is_correct),
            });
            return { concept, error: signalError };
          }),
        ),
        supabase
          .from("ai_micro_assessments")
          .select("is_correct, difficulty, concept_tags, question_text, answered_at")
          .eq("user_id", userData.user.id)
          .eq("topic_id", assessment.topic_id)
          .eq("status", "answered")
          .order("answered_at", { ascending: false })
          .limit(12),
      ]);

      for (const { concept, error: signalError } of signalResults) {
        if (signalError) {
          console.warn(
            "[Ensina-me] ai-tutor: não foi possível registrar resultado conceitual da microavaliação",
            JSON.stringify({ concept, message: signalError.message }),
          );
        }
      }

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

      const nextMessage = masteryLevel === "mastered"
        ? "Você já acumulou evidências suficientes de domínio deste tópico. A nova etapa agora é revisá-lo na data programada para fortalecer a retenção."
        : null;

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
        next_micro_assessment: null,
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
    const [usageResult, topicResult] = await Promise.all([
      supabase
        .from("ai_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id)
        .eq("role", "user")
        .gte("created_at", since),
      supabase
        .from("topics")
        .select("id, name, description")
        .eq("id", topicId)
        .eq("published", true)
        .maybeSingle(),
    ]);
    const { count: recentUserMessages, error: usageError } = usageResult;
    const { data: topic, error: topicError } = topicResult;

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

    if (topicError || !topic) {
      return json({ error: "Tópico não encontrado." }, 404);
    }

    const [
      materialResult,
      difficultiesResult,
      globalSignalsResult,
      recentMicroAssessmentsResult,
    ] = await Promise.all([
      supabase.from("materials").select("id, title, introduction")
        .eq("topic_id", topicId).eq("status", "published").maybeSingle(),
      supabase.from("student_topic_difficulties").select("difficulty_tag, count")
        .eq("user_id", userData.user.id).eq("topic_id", topicId)
        .eq("review_status", "pending").order("count", { ascending: false }),
      supabase.from("student_learning_signals")
        .select("topic_id, discipline_id, concept, signal_type, severity, occurrences, correct_count, status, last_seen")
        .eq("user_id", userData.user.id).in("status", ["pending", "improving"])
        .order("severity", { ascending: false }).order("occurrences", { ascending: false }).limit(12),
      supabase.from("ai_micro_assessments").select("question_text")
        .eq("user_id", userData.user.id).eq("topic_id", topicId)
        .order("created_at", { ascending: false }).limit(20),
    ]);
    const material = materialResult.data;
    const difficulties = difficultiesResult.data;
    const rawGlobalLearningSignals = globalSignalsResult.data;
    const recentMicroAssessmentQuestions = (recentMicroAssessmentsResult.data ?? [])
      .map((item: { question_text: string }) => item.question_text)
      .filter((question: string) => typeof question === "string" && question.trim());

    const globalTopicIds = [
      ...new Set(
        (rawGlobalLearningSignals ?? [])
          .map((item: { topic_id: string }) => item.topic_id)
          .filter(Boolean),
      ),
    ];
    const globalDisciplineIds = [
      ...new Set(
        (rawGlobalLearningSignals ?? [])
          .map((item: { discipline_id: string }) => item.discipline_id)
          .filter(Boolean),
      ),
    ];

    const sectionsPromise = material
      ? supabase
          .from("material_sections")
          .select("title, content, position")
          .eq("material_id", material.id)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] });

    const [
      { data: sections },
      { data: globalTopics },
      { data: globalDisciplines },
    ] = await Promise.all([
      sectionsPromise,
      globalTopicIds.length
        ? supabase.from("topics").select("id, name").in("id", globalTopicIds)
        : Promise.resolve({ data: [] }),
      globalDisciplineIds.length
        ? supabase.from("disciplines").select("id, name").in("id", globalDisciplineIds)
        : Promise.resolve({ data: [] }),
    ]);

    const topicNameById = new Map(
      (globalTopics ?? []).map((item: { id: string; name: string }) => [item.id, item.name]),
    );
    const disciplineNameById = new Map(
      (globalDisciplines ?? []).map((item: { id: string; name: string }) => [item.id, item.name]),
    );

    const globalLearningSignals = (rawGlobalLearningSignals ?? []).map(
      (item: {
        topic_id: string;
        discipline_id: string;
        concept: string;
        signal_type: string;
        severity: number;
        occurrences: number;
        correct_count: number;
        status: string;
      }) => ({
        ...item,
        topic_name: topicNameById.get(item.topic_id) ?? "Tópico não identificado",
        discipline_name:
          disciplineNameById.get(item.discipline_id) ?? "Disciplina não identificada",
      }),
    );

    const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
    if (!groqApiKey && !Deno.env.get("GEMINI_API_KEY")?.trim()) {
      console.warn("[Ensina-me] ai-tutor: nenhum provedor configurado (GROQ_API_KEY/GEMINI_API_KEY).");
      return json(
        {
          error:
            "O Tutor ainda não foi configurado. Adicione GROQ_API_KEY nos secrets do Supabase.",
        },
        503,
      );
    }

    let conversationId = body.conversation_id?.trim() || null;
    const isNewConversation = !conversationId;

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

    let recentHistory: ChatMessage[] = [];
    if (!isNewConversation) {
      const { data: history } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      recentHistory = ((history ?? []) as ChatMessage[]).reverse();
    }

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
      (globalLearningSignals ?? []).length
        ? "MAPA TRANSVERSAL DE APRENDIZAGEM DO ALUNO — use para reconhecer padrões entre disciplinas/tópicos e sugerir estudo quando fizer sentido:\n" +
          (globalLearningSignals ?? [])
            .map(
              (item: {
                concept: string;
                signal_type: string;
                severity: number;
                occurrences: number;
                correct_count: number;
                status: string;
                topic_name: string;
                discipline_name: string;
              }) =>
                item.discipline_name +
                " → " + item.topic_name +
                " → " + item.concept +
                " | sinal=" + item.signal_type +
                " | intensidade=" + item.severity +
                " | ocorrências=" + item.occurrences +
                " | acertos=" + item.correct_count +
                " | status=" + item.status,
            )
            .join("\n")
        : "MAPA TRANSVERSAL DE APRENDIZAGEM DO ALUNO: nenhum sinal persistente registrado.",
      (difficulties ?? []).length
        ? "DIFICULDADES PENDENTES DO TÓPICO ATUAL: " +
          (difficulties ?? [])
            .map(
              (d: { difficulty_tag: string; count: number }) =>
                d.difficulty_tag + " (" + d.count + ")",
            )
            .join(", ")
        : "DIFICULDADES PENDENTES DO TÓPICO ATUAL: nenhuma registrada.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const safeContext = truncateText(context, MAX_CONTEXT_CHARACTERS);
    const conversationContext = recentHistory
      .map((item) => `${item.role === "user" ? "ALUNO" : "TUTOR"}: ${item.content}`)
      .join("\n");
    const hasSubstantiveConversationHistory = recentHistory.some(
      (item) => item.role === "user" && item.content.trim().length > 12,
    );

    const systemPrompt =
      "Você é o Tutor acadêmico do Ensina-me: um professor particular digital, paciente, preciso e orientado à aprendizagem.\n\n" +
      "MISSÃO\n" +
      "Ajude o aluno a transformar informação em compreensão, compreensão em prática e prática em domínio. Não seja apenas um gerador de respostas. Ensine o raciocínio.\n\n" +
      "MEMÓRIA PEDAGÓGICA TRANSVERSAL\n" +
      "- Observe o que o aluno revela sobre sua própria compreensão durante a conversa, inclusive quando ele responde, explica com as próprias palavras, demonstra confusão ou aplica o conceito.\n" +
      "- Identifique no máximo 4 conceitos realmente sustentados pela conversa que mereçam acompanhamento. Não invente dificuldades só para preencher a lista.\n" +
      "- Uma dificuldade deve ser associada ao conceito acadêmico específico, e não apenas ao nome da disciplina.\n" +
      "- Se a conversa mostrar que o aluno superou uma dificuldade, não registre um novo gap apenas porque o conceito apareceu.\n" +
      "- O MAPA TRANSVERSAL pode conter sinais de outras disciplinas/tópicos. Use-o para reconhecer padrões e sugerir uma revisão quando houver relação real; nunca force uma conexão.\n" +
      "- Quando houver evidência suficiente de uma fragilidade, a resposta pode sugerir UMA próxima ação concreta: revisar um tópico, praticar um conceito ou voltar a um conteúdo. A sugestão deve ser natural e curta.\n\n" +
      "RECOMENDAÇÃO DE ESTUDO\n" +
      "- Se o histórico mostrar uma dificuldade recorrente, priorize essa dificuldade na orientação ao aluno, mesmo que a conversa atual seja sobre outro ponto relacionado.\n" +
      "- Nunca mande o aluno estudar aleatoriamente. Toda sugestão deve estar ligada a uma dificuldade ou objetivo observável.\n\n" +
      "Ensine o aluno primeiro; o registro pedagógico é consequência da conversa, não o assunto da conversa.\n\n" +
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
      "- Nunca invente informação para preencher o apoio visual.\n" +
      "- PRIORIDADE DA MENSAGEM ATUAL: responda primeiro ao pedido mais recente do aluno. Não repita correções, feedbacks de alternativas ou avaliações anteriores se o aluno mudou de assunto.\n" +
      "- Se o aluno perguntar explicitamente por uma imagem, ilustração ou figura do assunto em estudo, habilite visual_aid e prepare uma legenda/estrutura visual relevante para esse pedido; o sistema tentará anexar uma imagem com fonte e licença. Não responda com feedback de uma questão anterior. Se não houver imagem disponível, diga isso claramente e ofereça uma alternativa visual textual pertinente.\n\n" +
      "VÍDEO RECOMENDADO\n" +
      "- Avalie a PERGUNTA ATUAL do aluno, não apenas o tópico.\n" +
      "- video_recommendation.enabled=true somente quando um vídeo didático puder responder, esclarecer ou aprofundar diretamente a pergunta atual.\n" +
      "- Se a relação for apenas genérica com o tópico, use enabled=false.\n" +
      "- O sistema fará uma busca no YouTube usando a pergunta atual e o contexto do tópico.\n" +
      "- reason deve explicar em uma frase por que o vídeo encontrado ajuda exatamente nesta pergunta.\n\n" +
      "MICROAVALIAÇÃO ADAPTATIVA\n" +
      "- O campo microassessment só pode ter enabled=true quando MICROAVALIAÇÃO=GERAR.\n" +
      "- Após uma explicação acadêmica substantiva, verifique automaticamente se o aluno compreendeu o que acabou de ser ensinado; o aluno não precisa pedir uma questão.\n" +
      "- Gere microavaliação quando o aluno pediu para ser testado, pediu questão, quiz, exercício ou prática.\n" +
      "- Não gere microavaliação para saudações, navegação, agradecimentos, confirmações curtas ou quando o aluno explicitamente disser que não quer ser testado.\n" +
      "- A microavaliação NÃO é uma questão aleatória do banco/conteúdo do tópico. Ela é uma verificação da compreensão da CONVERSA ATUAL.\n" +
      "- Antes de criar a questão, identifique a dúvida, pergunta, conceito ou raciocínio que o aluno acabou de discutir com o Tutor.\n" +
      "- Quando o pedido atual for uma continuação como 'quero a pergunta', 'pode me testar', 'manda a questão' ou equivalente, NUNCA trate esse texto como o assunto da questão. Volte ao histórico e use a última dúvida substantiva do aluno e a explicação do Tutor imediatamente anterior.\n" +
      "- A pergunta deve verificar se o aluno realmente compreendeu aquela explicação específica: relação causal, mecanismo, distinção conceitual, aplicação ou raciocínio discutido na conversa.\n" +
      "- O TÓPICO ACADÊMICO é apenas uma fronteira de segurança e fonte de precisão; ele NÃO deve substituir o foco da conversa.\n" +
      "- Se não houver histórico substantivo suficiente para identificar o que o aluno queria entender, não invente um foco e não escolha uma questão genérica do tópico; mantenha microassessment.enabled=false.\n" +
      "- Faça exatamente uma questão de múltipla escolha com 4 alternativas.\n" +
      "- A alternativa correta deve ser inequivocamente correta com base na explicação e no contexto acadêmico.\n- correct_option_index é um índice zero-based: use somente 0, 1, 2 ou 3; nunca use -1.\n" +
      "- Evite pistas óbvias, pegadinhas artificiais e ambiguidades.\n" +
      "- Quando uma microavaliação for gerada, NÃO repita a questão nem as alternativas no campo message; no texto, apenas convide o aluno a responder a questão apresentada abaixo.\n" +
      "- Explique o gabarito de forma curta e pedagógica.\n" +
      "- Ajuste a dificuldade: introductory para primeira compreensão, intermediate para aplicação, advanced para análise.\n" +
      "- concept_tags deve conter de 1 a 3 conceitos avaliados e deve refletir o conceito discutido na conversa, não um conceito aleatório do tópico.\n" +
      "PRECISÃO EM ALFABETIZAÇÃO E LINGUAGEM\n" +
      "- Não confunda consciência fonológica, consciência fonêmica, fonema, sílaba, rima, aliteração, grafema e relação grafofonêmica.\n" +
      "- Em exemplos de rima, confirme a semelhança sonora relevante na terminação; compartilhar apenas uma vogal final não basta.\n\n" +
      "ESTILO\n" +
      "- Português do Brasil, humano, encorajador e acadêmico.\n" +
      "- Não infantilize o aluno.\n" +
      "- Use organização visual apenas quando melhorar a compreensão.\n\n" +
      "CONTEXTO ACADÊMICO DO TÓPICO:\n" +
      safeContext +
      "\n\nHISTÓRICO DA CONVERSA — FONTE PRIORITÁRIA PARA MICROAVALIAÇÃO:\n" +
      (conversationContext || "Nenhum histórico disponível.");

    const normalizedUserMessage = userMessage
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "");

    const isContinuationPracticeRequest =
      /^(quero|pode|manda|me manda|envia|envie|pode mandar|quero ver|vamos|bora).{0,80}(pergunta|questao|questão|teste|quiz|exercicio|exercício)/i.test(userMessage.trim());

    const explicitlyDeclinesPractice =
      /(nao quero|não quero|sem pergunta|sem questao|sem questão|nao me teste|não me teste|nao precisa testar|não precisa testar)/i.test(
        userMessage.trim(),
      );

    const isCasualOrNavigationMessage =
      /^(oi|ola|olá|bom dia|boa tarde|boa noite|obrigado|obrigada|valeu|beleza|ok|tá bom|ta bom|entendi|certo|sim|não|nao|voltar|sair|menu|ajuda)$/i.test(
        normalizedUserMessage.trim(),
      );

    const isSubstantiveAcademicTurn =
      !isCasualOrNavigationMessage &&
      !explicitlyDeclinesPractice &&
      userMessage.trim().length >= 18;

    const shouldGenerateComprehensionCheck =
      learningAction === "practice" ||
      isSubstantiveAcademicTurn ||
      hasSubstantiveConversationHistory;

    const priorQuestionGuard = recentMicroAssessmentQuestions.length
      ? "\n\nQUESTÕES JÁ APRESENTADAS NESTE TÓPICO — NÃO REPITA NENHUMA, NEM COM PEQUENAS TROCAS DE PALAVRAS:\n" +
        recentMicroAssessmentQuestions.slice(0, 20).map((question, index) => (index + 1) + ". " + question).join("\n") +
        "\nCrie uma questão genuinamente diferente, com outro cenário, operação mental ou aplicação do conceito."
      : "";
    const microAssessmentDirective =
      shouldGenerateComprehensionCheck && (!explicitlyDeclinesPractice)
        ? "MICROAVALIAÇÃO=GERAR: após ensinar ou esclarecer uma dúvida acadêmica substantiva, verifique automaticamente a compreensão do aluno com exatamente 1 questão de múltipla escolha e 4 alternativas. A questão deve avaliar o conceito/raciocínio que acabou de ser ensinado, não outro assunto. Se o aluno tiver pedido explicitamente uma questão/teste/exercício, gere-a da mesma forma. Não gere em saudações, navegação, agradecimentos, confirmações curtas ou quando o aluno disser explicitamente que não quer ser testado." + priorQuestionGuard
        : "MICROAVALIAÇÃO=NÃO GERAR: mantenha microassessment.enabled=false e envie options=[], question=\\\"\\\", explanation=\\\"\\\", concept_tags=[] e correct_option_index=0.";

    const messages = [
      {
        role: "system",
        content: systemPrompt + "\n\n" + microAssessmentDirective,
      },
      ...recentHistory,
      { role: "user", content: userMessage },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let groqResponse: Response;
    let payload: unknown;
    try {
      groqResponse = await fetchWithProviderFallback({
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
            reasoning_effort: "low",
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
                    learning_observations: {
                      type: "array",
                      minItems: 0,
                      maxItems: 4,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          concept: { type: "string" },
                          signal_type: {
                            type: "string",
                            enum: [
                              "comprehension_gap",
                              "comparison_gap",
                              "application_gap",
                              "concept_gap",
                              "procedure_gap"
                            ]
                          },
                          severity: { type: "integer", minimum: 1, maximum: 5 },
                          evidence: { type: "string" }
                        },
                        required: ["concept", "signal_type", "severity", "evidence"]
                      }
                    },
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
                    video_recommendation: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        enabled: { type: "boolean" },
                        reason: { type: "string" },
                      },
                      required: ["enabled", "reason"],
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
                  required: ["message", "learning_observations", "shareable", "visual_aid", "microassessment", "video_recommendation"],
                },
              },
            },
          }),
          signal: controller.signal,
        },
      );
      payload = await groqResponse.json();
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

      // Alguns modelos/provedores podem recusar o JSON Schema estrito mesmo
      // aceitando a mesma resposta em JSON mode. Tente uma segunda vez para
      // não transformar uma falha de formatação do provedor em um erro do Tutor.
      const shouldRetryWithoutSchema =
        groqResponse.status === 400 &&
        /json.?schema|response_format|structured output|strict/i.test(providerError);
      if (shouldRetryWithoutSchema) {
        try {
          // Retry with a deliberately compact prompt. Reusing the full academic
          // context plus a 1,800-token completion budget exceeded Groq's 8k TPM
          // window in production, so the recovery request must be much smaller.
          const compactFallbackMessages = [
            {
              role: "system",
              content: [
                "Você é o Tutor acadêmico do Ensina-me. Responda em português do Brasil, com precisão e clareza.",
                "Retorne exclusivamente um objeto JSON válido, sem Markdown, com as chaves: message (string), learning_observations (array), shareable (boolean), visual_aid (objeto com enabled, type, title, items, caption), microassessment (objeto com enabled, question, options, correct_option_index, explanation, difficulty, concept_tags) e video_recommendation (objeto com enabled, reason).",
                "Se gerar microavaliação: exatamente 4 alternativas não vazias, correct_option_index inteiro zero-based entre 0 e 3 (NUNCA -1), explicação correta e 1 a 3 concept_tags. Se não gerar: enabled=false, question=\"\", options=[], correct_option_index=0, explanation=\"\", concept_tags=[].",
                "Se não houver base suficiente, explique o que é possível afirmar sem inventar fontes. Mantenha visual_aid.items com no máximo 6 itens e learning_observations com no máximo 4 itens.",
                "CONTEXTO ACADÊMICO (resumo): " + safeContext.slice(0, 5000),
                "HISTÓRICO RECENTE (resumo): " + conversationContext.slice(-1800),
              ].join("\n\n"),
            },
            ...recentHistory.slice(-2).map((item) => ({
              role: item.role,
              content: item.content.slice(-900),
            })),
            { role: "user", content: userMessage.slice(-1200) },
          ];

          const requestCompactFallback = async () => {
            const fallbackController = new AbortController();
            const fallbackTimeout = setTimeout(() => fallbackController.abort(), 12000);
            try {
              const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + groqApiKey,
                },
                body: JSON.stringify({
                  model: "openai/gpt-oss-20b",
                  messages: compactFallbackMessages,
                  max_completion_tokens: 700,
                  temperature: 0.2,
                  reasoning_effort: "low",
                  include_reasoning: false,
                  response_format: { type: "json_object" },
                }),
                signal: fallbackController.signal,
              });
              const responsePayload = await response.json().catch(() => null);
              return { response, payload: responsePayload };
            } finally {
              clearTimeout(fallbackTimeout);
            }
          };

          let fallbackAttempt = await requestCompactFallback();
          // Honor a short provider retry window once. The prior code discarded
          // Groq's Retry-After and immediately returned a generic 502.
          if (!fallbackAttempt.response.ok && fallbackAttempt.response.status === 429) {
            const retryMessage =
              isRecord(fallbackAttempt.payload) &&
              isRecord(fallbackAttempt.payload.error) &&
              typeof fallbackAttempt.payload.error.message === "string"
                ? fallbackAttempt.payload.error.message
                : "";
            const waitSeconds = retryAfterSecondsFromResponse(
              fallbackAttempt.response.headers,
              retryMessage,
              2,
            );
            if (waitSeconds <= 10) {
              await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000 + 150));
              fallbackAttempt = await requestCompactFallback();
            }
          }

          if (fallbackAttempt.response.ok && isRecord(fallbackAttempt.payload)) {
            payload = fallbackAttempt.payload;
            console.info("[Ensina-me] ai-tutor: recuperação JSON compacta concluída");
          } else {
            const fallbackError =
              isRecord(fallbackAttempt.payload) && isRecord(fallbackAttempt.payload.error)
                ? fallbackAttempt.payload.error
                : null;
            console.error(
              "[Ensina-me] ai-tutor: fallback JSON compacto falhou",
              JSON.stringify({
                status: fallbackAttempt.response.status,
                request_id: fallbackAttempt.response.headers.get("x-request-id"),
                message: fallbackError && typeof fallbackError.message === "string"
                  ? fallbackError.message
                  : "erro não especificado",
              }),
            );
          }
        } catch (fallbackError) {
          console.error(
            "[Ensina-me] ai-tutor: exceção no fallback JSON compacto",
            fallbackError instanceof Error ? fallbackError.message : "unknown error",
          );
        }
      }

      if (!groqResponse.ok && !(isRecord(payload) && Array.isArray(payload.choices))) {
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
    const normalizedCurrentMessage = userMessage
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    const isCasualOrNavigationMessage =
      /^(oi|ola|bom dia|boa tarde|boa noite|obrigad[oa]s?|valeu|ok|certo|entendi|sim|nao|menu|voltar|sair|tchau)[.!?\s]*$/.test(normalizedCurrentMessage);
    const isSubstantiveLearningTurn =
      !isCasualOrNavigationMessage &&
      assistantMessage.trim().length >= 160 &&
      !/^(obrigad[oa]s?|de nada|ola|oi|bom dia|boa tarde|boa noite)\b/i.test(assistantMessage.trim());

    // Imagem e vídeo são parte natural da aula em respostas acadêmicas substantivas.
    // Não dependemos do modelo lembrar de ligar esses recursos em cada turno.
    if (isSubstantiveLearningTurn) {
      tutorResult.visualAid.enabled = true;
      tutorResult.visualAid.type = tutorResult.visualAid.type || "concept_map";
      tutorResult.visualAid.title = tutorResult.visualAid.title || "Apoio visual: " + topic.name;
      if (tutorResult.visualAid.items.length === 0) {
        tutorResult.visualAid.items = [
          "Tema em estudo: " + topic.name,
          "Observe os conceitos centrais e como se relacionam.",
        ];
      }
      tutorResult.visualAid.caption =
        tutorResult.visualAid.caption || "Material ilustrativo relacionado ao tópico da aula.";
      tutorResult.videoRecommendation = {
        enabled: true,
        reason: "Vídeo complementar para aprofundar o conteúdo de " + topic.name + ".",
      };
    }
    let generatedAssessment = tutorResult.microassessment;

    if (
      generatedAssessment?.enabled &&
      recentMicroAssessmentQuestions.some((question) =>
        isQuestionTooSimilar(generatedAssessment!.question, question)
      )
    ) {
      console.warn("[Ensina-me] ai-tutor: microavaliação repetida detectada; regenerando");
      const replacement = await generateAdaptiveMicroAssessment({
        apiKey: groqApiKey ?? Deno.env.get("GEMINI_API_KEY")?.trim() ?? "",
        topicName: topic.name,
        topicDescription: topic.description,
        context: safeContext,
        previousQuestion: generatedAssessment.question,
        previousTags: generatedAssessment.concept_tags,
        wasCorrect: false,
        nextDifficulty: generatedAssessment.difficulty,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        weakestConcept: generatedAssessment.concept_tags[0] ?? null,
        recentQuestions: [...recentMicroAssessmentQuestions, generatedAssessment.question],
      });
      generatedAssessment = replacement?.microassessment ?? {
        ...generatedAssessment,
        enabled: false,
      };
    }

    const imageQueries = [
      topic.name + " em português diagrama",
      topic.name + " português esquema",
      topic.name + " em português processo",
      topic.name + " diagrama",
      topic.name + " process diagram",
      topic.name,
    ].map((query) => query.trim()).filter(Boolean);

    // Recursos opcionais começam junto com a persistência e não podem atrasar
    // indefinidamente a resposta textual do Tutor.
    const visualAidImageLookup = tutorResult.visualAid.enabled
      ? resolveWithin(
          (async () => {
            const image = await findPublicDomainImage(imageQueries);
            return image ?? await findKnownPublicDomainImage(topic.name);
          })(),
          OPTIONAL_MEDIA_LOOKUP_TIMEOUT_MS,
        )
      : Promise.resolve(null);

    const tutorVideoLookup = tutorResult.videoRecommendation?.enabled
      ? resolveWithin(
          searchYoutubeVideoForQuestion(userMessage, topic.name),
          OPTIONAL_MEDIA_LOOKUP_TIMEOUT_MS,
        )
      : Promise.resolve(null);

    let publicMicroAssessment: {
      id: string;
      question: string;
      options: string[];
      difficulty: "introductory" | "intermediate" | "advanced";
      concept_tags: string[];
    } | null = null;

    // A verificação de compreensão é parte do fluxo normal de ensino.
    // Não deve depender de learningAction === "practice": uma explicação acadêmica
    // substantiva também pode e deve gerar a questão automaticamente.
    if (
      shouldGenerateComprehensionCheck &&
      generatedAssessment?.enabled &&
      !explicitlyDeclinesPractice &&
      !recentMicroAssessmentQuestions.some((question) =>
        isQuestionTooSimilar(generatedAssessment!.question, question)
      ) &&
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

    const [conversationUpdateResult, progressResult] = await Promise.all([
      supabase
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("user_id", userData.user.id),
      supabase
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
        ),
    ]);

    if (conversationUpdateResult.error) {
      console.warn(
        "[Ensina-me] ai-tutor: não foi possível atualizar a conversa",
        conversationUpdateResult.error.message,
      );
    }

    if (progressResult.error) {
      console.warn(
        "[Ensina-me] ai-tutor: não foi possível atualizar progresso",
        progressResult.error.message,
      );
    }

    await Promise.all(learningSignals.map(async (signal) => {
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
    }));

    await Promise.all(tutorResult.learningObservations.map(async (observation) => {
      const { error: signalError } = await supabase.rpc("record_learning_signal", {
        _topic_id: topicId,
        _concept: observation.concept,
        _signal_type: observation.signal_type,
        _severity: observation.severity,
        _evidence: observation.evidence,
        _correct: false,
      });

      if (signalError) {
        console.warn(
          "[Ensina-me] ai-tutor: não foi possível registrar observação pedagógica",
          JSON.stringify({ concept: observation.concept, message: signalError.message }),
        );
      }
    }));

    const [imageResult, searchedTutorVideo] = await Promise.all([
      visualAidImageLookup,
      tutorVideoLookup,
    ]);

    if (tutorResult.visualAid.enabled) {
      tutorResult.visualAid.image =
        imageResult ?? await findKnownPublicDomainImage(topic.name);
      if (tutorResult.visualAid.image) {
        tutorResult.visualAid.caption = tutorResult.visualAid.caption
          ? tutorResult.visualAid.caption + " Imagem pública licenciada encontrada pelo Tutor."
          : "Imagem pública licenciada encontrada pelo Tutor.";
      }
    }

    return json({
      conversation_id: conversationId,
      message: assistantMessage,
      should_generate_comprehension_check: shouldGenerateComprehensionCheck && !explicitlyDeclinesPractice,
      learning_observations: tutorResult.learningObservations,
      learning_action: learningAction,
      learning_signals: learningSignals,
      micro_assessment: publicMicroAssessment,
      shareable: tutorResult.shareable,
      video_recommendation:
        tutorResult.videoRecommendation?.enabled && searchedTutorVideo
          ? {
              enabled: true,
              reason: tutorResult.videoRecommendation.reason,
              video: searchedTutorVideo,
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
