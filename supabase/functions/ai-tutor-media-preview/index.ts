import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MediaInput = {
  data?: string;
  mime_type?: string;
  file_name?: string;
};

type Body = {
  action?: string;
  topic_id?: string;
  conversation_id?: string | null;
  message?: string;
  audio?: MediaInput | null;
  image?: MediaInput | null;
};

const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_MIME_TYPES = new Set([
  "audio/webm", "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3",
  "audio/mp4", "audio/m4a", "audio/ogg", "audio/oga", "audio/flac",
  "audio/x-m4a", "video/mp4",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeBase64(data: string, maxBytes: number): Uint8Array {
  if (!data || data.length > Math.ceil(maxBytes * 4 / 3) + 8) {
    throw new Error("O arquivo ultrapassa o limite permitido.");
  }
  const binary = atob(data);
  if (binary.length > maxBytes) throw new Error("O arquivo ultrapassa o limite permitido.");
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function safeFileName(name: string | undefined, fallback: string): string {
  const cleaned = (name ?? fallback).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  return cleaned || fallback;
}

function normalizedAudioMime(input: MediaInput): string {
  const provided = (input.mime_type ?? "").toLowerCase().split(";")[0].trim();
  if (AUDIO_MIME_TYPES.has(provided)) return provided;
  const extension = (input.file_name ?? "").split(".").pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav",
    webm: "audio/webm", ogg: "audio/ogg", oga: "audio/oga",
    flac: "audio/flac", mp4: "video/mp4", mpeg: "audio/mpeg",
    mpga: "audio/mpeg",
  };
  return (extension && byExtension[extension]) || provided;
}

async function transcribeAudio(input: MediaInput, apiKey: string): Promise<string> {
  const mime = normalizedAudioMime(input);
  if (!AUDIO_MIME_TYPES.has(mime)) {
    throw new Error("Formato de áudio não compatível. Use WEBM, MP3, WAV, M4A, OGG ou MP4.");
  }
  const bytes = decodeBase64(input.data ?? "", MAX_AUDIO_BYTES);
  const extension = safeFileName(input.file_name, mime === "audio/mpeg" ? "audio.mp3" : "audio.webm");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime }), extension);
  form.append("model", "whisper-large-v3");
  form.append("prompt", "Transcreva em português brasileiro. O estudante pode chamar o assistente de Tutor e falar sobre estudos. Preserve as palavras efetivamente pronunciadas; não complete, interprete ou reformule a frase.");
  form.append("language", "pt");
  form.append("response_format", "json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey },
    body: form,
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    console.warn("[ai-tutor-media-preview] transcrição indisponível", response.status);
    if (response.status === 413) throw new Error("O áudio é grande demais para ser processado.");
    if (response.status === 429) throw new Error("O serviço de transcrição está temporariamente ocupado. Tente novamente.");
    throw new Error("Não foi possível transcrever o áudio. Tente outro arquivo ou grave um trecho menor.");
  }
  const payload = await response.json();
  const transcript = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!transcript) throw new Error("Não consegui identificar a fala nesse áudio. Tente gravar novamente.");
  return transcript.slice(0, 12000);
}

function normalizedImageMime(input: MediaInput): string {
  const provided = (input.mime_type ?? "").toLowerCase().split(";")[0].trim();
  if (IMAGE_MIME_TYPES.has(provided)) return provided;
  const extension = (input.file_name ?? "").split(".").pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif",
  };
  return (extension && byExtension[extension]) || provided;
}

async function describeImage(input: MediaInput, apiKey: string, studentQuestion = ""): Promise<string> {
  const mime = normalizedImageMime(input);
  if (!IMAGE_MIME_TYPES.has(mime)) {
    throw new Error("Formato de imagem não compatível. Use JPG, PNG, WebP ou GIF.");
  }
  const bytes = decodeBase64(input.data ?? "", MAX_IMAGE_BYTES);
  const base64 = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: "Você é o recurso de compreensão visual do Tutor. Analise qualquer tipo de imagem enviada pelo estudante, não apenas imagens acadêmicas: fotos, pessoas, objetos, animais, documentos, telas, cenas, desenhos, gráficos e textos. Descreva o que realmente está visível, responda à pergunta do estudante sobre a imagem e diferencie observação de inferência. Não identifique pessoas reais nem invente detalhes. Se algo estiver pouco visível ou ambíguo, explique a limitação e faça uma pergunta objetiva. Responda em português brasileiro, com clareza e concisão.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise a imagem e responda ao que o estudante perguntou. Se a pergunta estiver vazia, descreva os elementos relevantes da imagem. Pergunta do estudante: " + (studentQuestion.trim() || "O que você consegue observar nesta imagem?") + ". Leia textos quando estiverem visíveis e não restrinja a análise a conteúdo acadêmico." },
            { type: "image_url", image_url: { url: "data:" + mime + ";base64," + base64 } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    console.warn("[ai-tutor-media-preview] análise de imagem indisponível", response.status);
    if (response.status === 429) throw new Error("O serviço de análise de imagem está temporariamente ocupado. Tente novamente.");
    throw new Error("Não foi possível analisar a imagem agora. Tente uma foto mais nítida ou menor.");
  }
  const payload = await response.json();
  const description = payload?.choices?.[0]?.message?.content;
  if (typeof description !== "string" || !description.trim()) {
    throw new Error("Não consegui ler o conteúdo da imagem. Tente uma foto mais nítida.");
  }
  return description.trim().slice(0, 6000);
}


async function researchImageOnWeb(imageDescription: string, studentQuestion: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      reasoning_effort: "low",
      temperature: 0.1,
      max_completion_tokens: 1400,
      citation_options: "enabled",
      tool_choice: "required",
      tools: [{ type: "browser_search" }],
      messages: [
        { role: "system", content: "Use a busca na internet para verificar entidades públicas, marcas, logotipos, produtos, placas ou documentos claramente visíveis. Nunca tente identificar pessoas. Diferencie correspondência confirmada, possível correspondência e ausência de confirmação. Compare nome, símbolo e contexto; siglas iguais não provam que sejam a mesma entidade. Priorize fontes oficiais. Retorne fatos objetivos e URLs. Não invente fontes." },
        { role: "user", content: "Descrição visual observada:\\n" + imageDescription.slice(0, 3500) + "\\n\\nPergunta do estudante: " + (studentQuestion.trim() || "O que é este elemento?").slice(0, 1200) + "\\n\\nPesquise nomes, siglas ou logotipos públicos claramente visíveis. Se houver ambiguidade, apresente alternativas e explique o que foi possível confirmar." }
      ]
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    console.warn("[ai-tutor-media-preview] pesquisa web indisponível", response.status);
    return "Pesquisa na internet indisponível; não confirme informações externas e limite-se ao que é visível.";
  }
  const payload = await response.json();
  const result = payload?.choices?.[0]?.message?.content;
  return typeof result === "string" && result.trim()
    ? result.trim().slice(0, 7000)
    : "A busca não retornou fontes verificáveis; não confirme informações externas.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Autenticação necessária." }, 401);
  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    let publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    if (publishableKeysRaw) {
      try {
        const parsed = JSON.parse(publishableKeysRaw);
        publishableKey = parsed?.default ?? publishableKey;
      } catch {
        console.warn("[ai-tutor-media-preview] configuração de chave pública inválida");
      }
    }
    if (!publishableKey) publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (!publishableKey || !supabaseUrl) return json({ error: "Configuração do Supabase indisponível." }, 500);

    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Sessão inválida." }, 401);
    const { data: roleOk, error: roleError } = await supabase.rpc("has_role", { required_role: "student" });
    if (roleError || !roleOk) return json({ error: "Somente alunos podem usar o Tutor." }, 403);

    let body: Body;
    try {
      const contentLength = Number(req.headers.get("content-length") ?? "0");
      if (contentLength > 15 * 1024 * 1024) return json({ error: "Os anexos excedem o limite combinado de 10 MB." }, 413);
      body = await req.json();
    } catch {
      return json({ error: "Corpo da requisição inválido." }, 400);
    }

    if (body.action !== "chat") return json({ error: "Ação não suportada." }, 400);
    const topicId = body.topic_id?.trim();
    const message = body.message?.trim() ?? "";
    if (!topicId) return json({ error: "Tópico é obrigatório." }, 400);
    if (!message && !body.audio?.data && !body.image?.data) {
      return json({ error: "Escreva uma dúvida ou anexe áudio ou imagem." }, 400);
    }
    if (message.length > 6000) return json({ error: "A mensagem escrita ultrapassa o limite permitido." }, 413);

    const audio = body.audio?.data ? body.audio : null;
    const image = body.image?.data ? body.image : null;
    if (!audio && !image) {
      const forward = await fetch(supabaseUrl + "/functions/v1/ai-tutor", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          apikey: publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "chat",
          topic_id: topicId,
          message,
          conversation_id: body.conversation_id ?? null,
        }),
        signal: AbortSignal.timeout(45000),
      });
      return new Response(await forward.text(), {
        status: forward.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
    if (!groqApiKey) return json({ error: "O processamento de áudio e imagem não está configurado. Nenhuma mensagem foi enviada." }, 503);

    const [transcript, imageDescription] = await Promise.all([
      audio ? transcribeAudio(audio, groqApiKey) : Promise.resolve(""),
      image ? describeImage(image, groqApiKey, message) : Promise.resolve(""),
    ]);
    const webResearch = image ? await researchImageOnWeb(imageDescription, message, groqApiKey) : "";

    const enrichedMessage = [
      message,
      transcript ? "DÚVIDA FALADA PELO ALUNO (transcrição do áudio):\n" + transcript : "",
      imageDescription ? "OBSERVAÇÃO VISUAL DA IMAGEM:\n" + imageDescription : "",
      webResearch ? "VERIFICAÇÃO NA INTERNET:\n" + webResearch : "",
      "Responda em português brasileiro. Para imagens, separe o que é visível, o que a pesquisa confirmou (com links) e o que continua incerto. Nunca transforme inferência em fato nem confunda entidades com siglas iguais. Se a pesquisa falhar, informe isso e limite-se à observação visual.",
    ].filter(Boolean).join("\n\n").slice(0, 12000);

    const forward = await fetch(supabaseUrl + "/functions/v1/ai-tutor", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "chat",
        topic_id: topicId,
        message: enrichedMessage,
        conversation_id: body.conversation_id ?? null,
      }),
      signal: AbortSignal.timeout(45000),
    });
    const forwardText = await forward.text();
    if (!forward.ok) {
      return new Response(forwardText, {
        status: forward.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let tutorPayload: Record<string, unknown>;
    try {
      tutorPayload = JSON.parse(forwardText);
    } catch {
      return new Response(forwardText, {
        status: forward.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return json({ ...tutorPayload, transcription: transcript || null }, forward.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao processar os anexos.";
    console.error("[ai-tutor-media-preview] falha controlada no processamento");
    return json({ error: message }, 500);
  }
});
