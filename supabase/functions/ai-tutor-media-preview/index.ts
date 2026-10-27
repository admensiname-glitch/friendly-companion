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

async function transcribeAudio(input: MediaInput, apiKey: string): Promise<string> {
  const mime = (input.mime_type ?? "").toLowerCase().split(";")[0].trim();
  if (!AUDIO_MIME_TYPES.has(mime)) {
    throw new Error("Formato de áudio não compatível. Use WEBM, MP3, WAV, M4A, OGG ou MP4.");
  }
  const bytes = decodeBase64(input.data ?? "", MAX_AUDIO_BYTES);
  const extension = safeFileName(input.file_name, mime === "audio/mpeg" ? "audio.mp3" : "audio.webm");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime }), extension);
  form.append("model", "whisper-large-v3-turbo");
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

async function describeImage(input: MediaInput, apiKey: string): Promise<string> {
  const mime = (input.mime_type ?? "").toLowerCase().split(";")[0].trim();
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
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: "Você analisa imagens enviadas por estudantes. Descreva apenas o que consegue observar, leia textos e fórmulas visíveis quando possível e diferencie observação de inferência. Se algo estiver ilegível, diga isso. Não invente conteúdo. Responda em português brasileiro, de forma concisa, para contextualizar a dúvida do estudante.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise esta imagem para apoiar uma explicação acadêmica. Transcreva o enunciado, os dados, fórmulas, gráficos ou anotações legíveis. Não resolva além do que a imagem permite concluir." },
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
      image ? describeImage(image, groqApiKey) : Promise.resolve(""),
    ]);

    const enrichedMessage = [
      message,
      transcript ? "DÚVIDA FALADA PELO ALUNO (transcrição do áudio):\n" + transcript : "",
      imageDescription ? "CONTEÚDO OBSERVADO NA IMAGEM ANEXADA (use como contexto; reconheça limites de leitura):\n" + imageDescription : "",
      "Responda em português brasileiro, em texto, explicando o raciocínio passo a passo e usando apenas o que for sustentado pelo contexto acadêmico e pelos anexos. Se faltarem dados ou a imagem estiver ilegível, peça esclarecimento em vez de adivinhar.",
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
    return new Response(await forward.text(), {
      status: forward.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao processar os anexos.";
    console.error("[ai-tutor-media-preview] falha controlada no processamento");
    return json({ error: message }, 500);
  }
});
