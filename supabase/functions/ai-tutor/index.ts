import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  topic_id?: string;
  conversation_id?: string | null;
  message?: string;
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

const DAILY_USER_MESSAGE_LIMIT = 60;
const MAX_CONTEXT_CHARACTERS = 24000;

function extractOutputText(payload: unknown): string {
  if (!isRecord(payload)) return "";

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) return "";

  const texts: string[] = [];

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;

    for (const part of item.content) {
      if (
        isRecord(part) &&
        part.type === "output_text" &&
        typeof part.text === "string"
      ) {
        texts.push(part.text);
      }
    }
  }

  return texts.join("\n").trim();
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

    const topicId = body.topic_id?.trim();
    const userMessage = body.message?.trim();

    if (!topicId || !userMessage) {
      return json({ error: "Tópico e mensagem são obrigatórios." }, 400);
    }

    if (userMessage.length > 4000) {
      return json({ error: "A mensagem é muito longa." }, 400);
    }

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

    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      return json(
        {
          error:
            "O tutor de IA está estruturado, mas a chave do provedor ainda não foi configurada no Supabase.",
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
      "Você é o tutor acadêmico do Ensina-me.\n" +
      "Sua função é ajudar o aluno a compreender o conteúdo, raciocinar e praticar.\n" +
      "Use prioritariamente e fielmente o CONTEXTO ACADÊMICO fornecido abaixo.\n" +
      "Não invente fatos, fontes, autores, dados ou citações.\n" +
      "Quando o contexto não for suficiente para responder, diga claramente que a informação não está disponível no material atual e recomende a fonte original.\n" +
      "Não entregue respostas de exercícios automaticamente quando o aluno estiver tentando resolver uma questão; ajude com pistas, perguntas e explicações.\n" +
      "Explique em português do Brasil, com linguagem clara, acadêmica e humana.\n" +
      "Relacione conceitos com exemplos quando isso ajudar.\n" +
      "Considere as dificuldades pendentes do aluno ao explicar, mas nunca exponha dados internos.\n" +
      "Não diga que você é um modelo de linguagem.\n\n" +
      "CONTEXTO ACADÊMICO:\n" +
      safeContext;

    const input = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: userMessage },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let openAIResponse: Response;
    try {
      openAIResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + openAIKey,
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input,
          max_output_tokens: 800,
        }),
        signal: controller.signal,
      });
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

    const payload = await openAIResponse.json();

    if (!openAIResponse.ok) {
      return json(
        {
          error: "O tutor de IA não conseguiu gerar a resposta.",
          conversation_id: conversationId,
        },
        502,
      );
    }

    const assistantMessage = extractOutputText(payload);
    if (!assistantMessage) {
      return json(
        {
          error: "O tutor de IA retornou uma resposta vazia.",
          conversation_id: conversationId,
        },
        502,
      );
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

    return json({
      conversation_id: conversationId,
      message: assistantMessage,
    });
  } catch (error) {
    console.error(
      "[Ensina-me] ai-tutor error",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Erro interno do tutor." }, 500);
  }
});
