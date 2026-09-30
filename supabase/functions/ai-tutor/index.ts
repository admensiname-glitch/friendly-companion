import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  action?: "chat" | "answer_microassessment";
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
const MAX_CONTEXT_CHARACTERS = 24000;

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
} | null {
  const raw = extractOutputText(payload);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      message?: unknown;
      microassessment?: unknown;
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

    return { message: parsed.message.trim(), microassessment };
  } catch {
    return null;
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
          "id, question_text, options, correct_option_index, explanation, difficulty, concept_tags, is_correct, selected_option_index, status",
        )
        .eq("id", assessmentId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (assessmentError || !assessment) {
        return json({ error: "Não foi possível carregar o resultado da microavaliação." }, 500);
      }

      return json({
        assessment_id: assessment.id,
        is_correct: assessment.is_correct,
        selected_option_index: assessment.selected_option_index,
        correct_option_index: assessment.correct_option_index,
        explanation: assessment.explanation,
        attempted: (result as { attempted?: number }).attempted ?? null,
        correct: (result as { correct?: number }).correct ?? null,
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
      "MICROAVALIAÇÃO ADAPTATIVA\n" +
      "- O campo microassessment só pode ter enabled=true quando MICROAVALIAÇÃO=GERAR.\n" +
      "- Gere microavaliação quando o aluno pediu para ser testado, pediu questão, quiz, exercício ou prática.\n" +
      "- Faça exatamente uma questão de múltipla escolha com 4 alternativas.\n" +
      "- A questão deve avaliar o conceito mais relevante do tópico e, quando houver, atacar uma dificuldade pendente do aluno.\n" +
      "- A alternativa correta deve ser inequivocamente correta com base no contexto.\n" +
      "- Evite pistas óbvias, pegadinhas artificiais e ambiguidades.\n" +
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
        ? "MICROAVALIAÇÃO=GERAR: gere uma microavaliação adaptativa."
        : "MICROAVALIAÇÃO=NÃO GERAR: mantenha microassessment.enabled=false.";

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
            model: "openai/gpt-oss-120b",
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
                    microassessment: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        enabled: { type: "boolean" },
                        question: { type: "string" },
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
    });
  } catch (error) {
    console.error(
      "[Ensina-me] ai-tutor error",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Erro interno do tutor." }, 500);
  }
});
