import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { message: "Método não permitido." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bootstrapKey = Deno.env.get("ADMIN_BOOTSTRAP_KEY");

  if (!supabaseUrl || !serviceRoleKey || !bootstrapKey) {
    return jsonResponse(503, {
      message: "Ativação administrativa indisponível no momento.",
    });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(401, {
      message: "É necessário entrar na sua conta.",
    });
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  if (!accessToken) {
    return jsonResponse(401, { message: "Sessão inválida." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonResponse(401, { message: "Sessão inválida." });
  }

  let submittedKey = "";
  try {
    const body = await request.json();
    submittedKey = typeof body?.key === "string" ? body.key : "";
  } catch {
    return jsonResponse(400, { message: "Chave inválida." });
  }

  if (!submittedKey || submittedKey !== bootstrapKey) {
    return jsonResponse(403, { message: "Chave inválida." });
  }

  const { data: bootstrapped, error: bootstrapError } = await adminClient
    .rpc("bootstrap_admin_once", { _user_id: user.id });

  if (bootstrapError) {
    return jsonResponse(503, {
      message: "Não foi possível concluir a ativação administrativa.",
    });
  }

  if (bootstrapped !== true) {
    return jsonResponse(409, {
      message: "A ativação administrativa inicial já foi concluída.",
    });
  }

  return jsonResponse(200, {
    success: true,
    message: "Administrador ativado com sucesso.",
  });
});
