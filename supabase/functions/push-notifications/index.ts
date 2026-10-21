import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  // CORS is not an authorization boundary; authenticated user validation happens below.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

function b64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function pemBytes(pem: string): Uint8Array {
  return Uint8Array.from(atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")), c => c.charCodeAt(0));
}
async function firebaseAccessToken(sa: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const unsigned = header + "." + claim;
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = unsigned + "." + b64url(signature);
  const response = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Firebase OAuth falhou: " + (data.error_description || data.error || response.status));
  return data.access_token as string;
}
async function sendFcm(sa: Record<string, string>, token: string, title: string, body: string, url: string) {
  const accessToken = await firebaseAccessToken(sa);
  const projectId = sa.project_id;
  if (!projectId) throw new Error("project_id ausente na credencial Firebase.");
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token, notification: { title, body }, data: { url } } }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error("FCM recusou o envio (" + response.status + "): " + JSON.stringify(data).slice(0, 500));
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Método não permitido." });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(500, { error: "Configuração do servidor incompleta." });
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json(401, { error: "Faça login para gerenciar notificações." });
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json(401, { error: "Sessão inválida. Entre novamente." });
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let input: { action?: string; subscription?: PushSubscriptionJSON; enabled?: boolean; token?: string };
  try { input = await req.json(); } catch { return json(400, { error: "Corpo da requisição inválido." }); }

  if (input.action === "direct-notify-request" || input.action === "direct-notify-message") {
    const isRequest = input.action === "direct-notify-request";
    const targetId = isRequest ? input.request_id : input.message_id;
    if (typeof targetId !== "string" || targetId.length > 80) return json(400, { error: "Identificador inválido." });

    let recipients: string[] = [];
    let title = "Nova mensagem no Direct";
    let body = "Você recebeu uma nova mensagem.";
    let url = "/app/comunidade";
    let conversationId: string | null = null;

    if (isRequest) {
      const { data: request, error } = await db.from("direct_requests").select("id,sender_id,recipient_id,status").eq("id", targetId).maybeSingle();
      if (error || !request || request.sender_id !== user.id || request.status !== "pending") return json(404, { error: "Solicitação não encontrada ou não autorizada." });
      recipients = [request.recipient_id];
      title = "Nova solicitação no Direct";
      body = "Um estudante quer iniciar uma conversa com você.";
    } else {
      const { data: message, error } = await db.from("direct_messages").select("id,conversation_id,sender_id,message_type,body").eq("id", targetId).maybeSingle();
      if (error || !message || message.sender_id !== user.id) return json(404, { error: "Mensagem não encontrada ou não autorizada." });
      conversationId = message.conversation_id;
      const { data: members, error: memberError } = await db.from("direct_conversation_members").select("user_id").eq("conversation_id", message.conversation_id).neq("user_id", user.id);
      if (memberError) return json(500, { error: "Não foi possível determinar os destinatários." });
      recipients = (members || []).map((m: { user_id: string }) => m.user_id);
      body = message.message_type === "voice" ? "Você recebeu uma mensagem de voz." : String(message.body || "Você recebeu uma nova mensagem.").slice(0, 140);
    }
    if (!recipients.length) return json(200, { ok: true, sent: 0, skipped: 0 });
    const { data: prefs } = await db.from("notification_preferences").select("user_id,push_enabled").in("user_id", recipients);
    const enabledUsers = new Set((prefs || []).filter((p: { user_id: string; push_enabled: boolean }) => p.push_enabled).map((p: { user_id: string }) => p.user_id));
    if (!isRequest && conversationId) {
      const { data: group } = await db.from("direct_conversations").select("kind").eq("id", conversationId).maybeSingle();
      if (group?.kind === "group") {
        const { data: groupPrefs } = await db.from("direct_group_notification_preferences").select("user_id,notifications_enabled").eq("conversation_id", conversationId);
        const muted = new Set((groupPrefs || []).filter((p: { user_id: string; notifications_enabled: boolean }) => !p.notifications_enabled).map((p: { user_id: string }) => p.user_id));
        recipients = recipients.filter((id) => !muted.has(id));
      }
    }
    recipients = recipients.filter((id) => enabledUsers.has(id));
    if (!recipients.length) return json(200, { ok: true, sent: 0, skipped: true });

    const { data: subs, error: subError } = await db.from("push_subscriptions").select("id,user_id,channel,endpoint,p256dh,auth_key,fcm_token").in("user_id", recipients).eq("active", true);
    if (subError) return json(500, { error: "Não foi possível consultar os dispositivos inscritos." });
    let sent = 0;
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    if (vapidPublic && vapidPrivate) webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:suporte@ensina-me.app", vapidPublic, vapidPrivate);
    let serviceAccount: Record<string, string> | null = null;
    try { serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "null"); } catch { serviceAccount = null; }
    for (const sub of subs || []) {
      try {
        if (sub.channel === "web_push" && vapidPublic && vapidPrivate && sub.endpoint && sub.p256dh && sub.auth_key) {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, JSON.stringify({ title: "Ensina-me · " + title, body, url, tag: "direct-" + targetId }));
          sent++;
        } else if (sub.channel === "android_fcm" && serviceAccount?.project_id && serviceAccount.client_email && serviceAccount.private_key && sub.fcm_token) {
          await sendFcm(serviceAccount, sub.fcm_token, "Ensina-me · " + title, body, url);
          sent++;
        }
      } catch (error) {
        const detail = String(error);
        console.error("[push-notifications] direct delivery failed", detail.slice(0, 300));
        if (/statusCode: 404|statusCode: 410|UNREGISTERED/.test(detail)) await db.from("push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", sub.id);
      }
    }
    return json(200, { ok: true, sent, recipients: recipients.length });
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:suporte@ensina-me.app";
  if (input.action === "public-key") return json(200, { configured: Boolean(publicKey && privateKey), publicKey: publicKey || null });
  if (input.action === "config-status") {
    let nativePushConfigured = false;
    try {
      const serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}");
      nativePushConfigured = Boolean(serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key);
    } catch {
      nativePushConfigured = false;
    }
    return json(200, { webPushConfigured: Boolean(publicKey && privateKey), nativePushConfigured });
  }
  if (input.action === "preferences") {
    const enabled = Boolean(input.enabled);
    const { error } = await db.from("notification_preferences").upsert({ user_id: user.id, push_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) return json(500, { error: "Não foi possível salvar sua preferência." });
    if (!enabled) await db.from("push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    return json(200, { ok: true, enabled });
  }
  if (input.action === "register") {
    if (!publicKey || !privateKey) return json(503, { error: "As chaves VAPID pública e privada precisam estar configuradas no servidor para o envio Web Push." });
    const sub = input.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return json(400, { error: "Assinatura do navegador inválida." });
    const { error } = await db.from("push_subscriptions").upsert({ user_id: user.id, channel: "web_push", endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth_key: sub.keys.auth, user_agent: req.headers.get("user-agent")?.slice(0, 500) || null, active: true, updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
    if (error) return json(500, { error: "Não foi possível registrar este dispositivo." });
    const { error: prefError } = await db.from("notification_preferences").upsert({ user_id: user.id, push_enabled: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (prefError) return json(500, { error: "Dispositivo registrado, mas não foi possível salvar a preferência." });
    return json(200, { ok: true, channel: "web_push" });
  }
  if (input.action === "native-register") {
    const token = input.token?.trim();
    if (!token || token.length > 4096) return json(400, { error: "Token FCM inválido." });
    const { error } = await db.from("push_subscriptions").upsert({
      user_id: user.id, channel: "android_fcm", fcm_token: token, endpoint: null,
      p256dh: null, auth_key: null, user_agent: req.headers.get("user-agent")?.slice(0, 500) || "Capacitor Android",
      active: true, updated_at: new Date().toISOString(),
    }, { onConflict: "fcm_token" });
    if (error) return json(500, { error: "Não foi possível registrar o token nativo: " + error.message });
    const { error: prefError } = await db.from("notification_preferences").upsert({ user_id: user.id, push_enabled: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (prefError) return json(500, { error: "Token registrado, mas a preferência falhou." });
    return json(200, { ok: true, channel: "android_fcm" });
  }
  if (input.action === "test") {
    if (!publicKey || !privateKey) return json(503, { error: "O envio Web Push ainda precisa ser configurado no servidor." });
    const { data: pref } = await db.from("notification_preferences").select("push_enabled").eq("user_id", user.id).maybeSingle();
    if (!pref?.push_enabled) return json(403, { error: "Ative as notificações antes de enviar o teste." });
    const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth_key").eq("user_id", user.id).eq("channel", "web_push").eq("active", true);
    if (!subs?.length) return json(404, { error: "Nenhum navegador registrado. Ative as notificações neste dispositivo primeiro." });
    webpush.setVapidDetails(subject, publicKey, privateKey);
    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, JSON.stringify({ title: "Ensina-me — teste de notificação", body: "Tudo certo! Este dispositivo está preparado para receber avisos de estudo e revisão.", url: "/app/perfil", tag: "ensina-me-push-test" }));
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) await db.from("push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", sub.id);
      }
    }
    return json(sent ? 200 : 502, { ok: sent > 0, sent, total: subs.length, error: sent ? null : "O envio falhou. Confira a configuração VAPID e a permissão do navegador." });
  }
  if (input.action === "native-test") {
    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!raw) return json(503, { error: "FIREBASE_SERVICE_ACCOUNT não está configurado no servidor." });
    let sa: Record<string, string>;
    try { sa = JSON.parse(raw); } catch { return json(500, { error: "A conta de serviço Firebase do servidor não contém JSON válido." }); }
    if (!sa.project_id || !sa.client_email || !sa.private_key) {
      return json(503, { error: "A conta de serviço Firebase do servidor está incompleta. Configure FIREBASE_SERVICE_ACCOUNT com project_id, client_email e private_key válidos." });
    }
    const { data: pref } = await db.from("notification_preferences").select("push_enabled").eq("user_id", user.id).maybeSingle();
    if (!pref?.push_enabled) return json(403, { error: "Ative as notificações antes de enviar o teste." });
    const { data: subs, error } = await db.from("push_subscriptions").select("id,fcm_token").eq("user_id", user.id).eq("channel", "android_fcm").eq("active", true);
    if (error) return json(500, { error: "Falha ao consultar dispositivos Android." });
    if (!subs?.length) return json(404, { error: "Nenhum token Android registrado. Instale o APK com FCM e abra o app primeiro." });
    let sent = 0;
    const failures: string[] = [];
    for (const sub of subs) {
      try {
        if (!sub.fcm_token) throw new Error("Token FCM ausente no registro Android.");
        await sendFcm(sa, sub.fcm_token, "Ensina-me — teste nativo", "As notificações nativas estão conectadas.", "/app/perfil");
        sent++;
      } catch (e) {
        const detail = String(e).slice(0, 350);
        failures.push(detail);
        console.error("[push-notifications] native-test send failed", detail);
        if (detail.includes("FCM recusou o envio (404)") || detail.includes("UNREGISTERED")) {
          await db.from("push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", sub.id);
        }
      }
    }
    if (!sent) {
      const detail = failures[0] || "";
      let error = "O Firebase recusou o envio. Confira se FIREBASE_SERVICE_ACCOUNT pertence ao projeto Firebase do app e se Firebase Cloud Messaging está habilitado.";
      if (/invalid_grant|invalid jwt|private key|pkcs8/i.test(detail)) error = "A credencial de serviço Firebase é inválida. Confira o JSON de FIREBASE_SERVICE_ACCOUNT no Supabase.";
      else if (/403|PERMISSION_DENIED|SENDER_ID_MISMATCH|THIRD_PARTY_AUTH_ERROR/i.test(detail)) error = "O Firebase negou a permissão de envio. Confira o projeto da conta de serviço e a permissão Firebase Cloud Messaging.";
      else if (detail.includes("FCM recusou o envio (404)") || detail.includes("UNREGISTERED")) error = "O token FCM deste Android expirou. Ative novamente as notificações neste dispositivo.";
      console.error("[push-notifications] native-test had no successful deliveries", JSON.stringify({ failures: failures.length }));
      return json(502, { ok: false, sent, total: subs.length, error });
    }
    return json(200, { ok: true, sent, total: subs.length, error: null });
  }
  return json(400, { error: "Ação desconhecida." });
});
