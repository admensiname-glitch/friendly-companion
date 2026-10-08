import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Preferences = { push_enabled: boolean; study_reminders: boolean; review_reminders: boolean; learning_recommendations: boolean; announcements: boolean };
const defaults: Preferences = { push_enabled: false, study_reminders: true, review_reminders: true, learning_recommendations: true, announcements: false };

export const Route = createFileRoute("/app/notificacoes")({ component: NotificationsPage });

function NotificationsPage() {
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"success" | "error" | "info">("info");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setMessage("Entre na sua conta para configurar notificações."); setLoading(false); return; }
      const [{ data }, { data: keyData, error: keyError }] = await Promise.all([
        supabase.from("notification_preferences").select("push_enabled,study_reminders,review_reminders,learning_recommendations,announcements").eq("user_id", session.session.user.id).maybeSingle(),
        supabase.functions.invoke("push-notifications", { body: { action: "public-key" } }),
      ]);
      if (cancelled) return;
      if (data) setPrefs({ ...defaults, ...data });
      setConfigured(!keyError && Boolean(keyData?.configured && keyData?.publicKey));
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
          const subscription = await registration.pushManager.getSubscription();
          if (!cancelled) setDeviceSubscribed(Boolean(subscription));
        } catch {
          if (!cancelled) setDeviceSubscribed(false);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  function notify(text: string, type: "success" | "error" | "info") { setMessage(text); setKind(type); }

  async function enablePush() {
    setBusy(true); setMessage("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        notify("Este navegador não oferece suporte a notificações push. Tente no Chrome atualizado ou instale o Ensina-me na Tela de Início.", "error"); return;
      }
      if (!configured) { notify("A tela já está pronta, mas o envio ainda depende das chaves Web Push (VAPID) no servidor. Elas precisam ser configuradas antes do teste real.", "info"); return; }
      const { data: keyData, error: keyError } = await supabase.functions.invoke("push-notifications", { body: { action: "public-key" } });
      if (keyError || !keyData?.publicKey) throw new Error("Não foi possível obter a chave de notificações.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permissão não concedida. Ative notificações para o Ensina-me nas configurações do navegador.");
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const currentKey = subscription.options.applicationServerKey;
        const expectedKey = urlBase64ToUint8Array(keyData.publicKey);
        const sameKey = currentKey && currentKey.byteLength === expectedKey.byteLength &&
          expectedKey.every((byte, index) => byte === new Uint8Array(currentKey)[index]);
        if (!sameKey) {
          await subscription.unsubscribe();
          subscription = null;
        }
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        });
      }
      const { error } = await supabase.functions.invoke("push-notifications", { body: { action: "register", subscription: subscription.toJSON() } });
      if (error) throw new Error("Não foi possível registrar este navegador no servidor.");
      setPrefs(p => ({ ...p, push_enabled: true }));
      setDeviceSubscribed(true);
      notify("Este navegador foi registrado. Agora você pode enviar uma notificação de teste para sua conta.", "success");
    } catch (err) { notify(err instanceof Error ? err.message : "Não foi possível ativar as notificações.", "error"); }
    finally { setBusy(false); }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("push-notifications", { body: { action: "preferences", enabled: false } });
      if (error) throw new Error("Não foi possível salvar a preferência.");
      setPrefs(p => ({ ...p, push_enabled: false }));
      setDeviceSubscribed(false);
      notify("Notificações desativadas para sua conta. Você pode ativá-las novamente quando quiser.", "success");
    } catch (err) { notify(err instanceof Error ? err.message : "Erro ao desativar.", "error"); }
    finally { setBusy(false); }
  }

  async function updateCategory(key: keyof Preferences, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { setPrefs(prefs); notify("Entre novamente para salvar suas preferências.", "error"); return; }
    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: session.session.user.id,
      push_enabled: next.push_enabled,
      study_reminders: next.study_reminders,
      review_reminders: next.review_reminders,
      learning_recommendations: next.learning_recommendations,
      announcements: next.announcements,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) { setPrefs(prefs); notify("Não foi possível salvar essa preferência.", "error"); }
    else notify("Preferência salva.", "success");
  }

  async function sendTest() {
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("push-notifications", { body: { action: "test" } });
      if (error) throw new Error("O servidor não conseguiu concluir o teste. Confira a configuração Web Push.");
      if (!data?.ok) throw new Error(data?.error || "Não foi possível enviar o teste.");
      notify("Teste enviado! Confira as notificações do seu dispositivo.", "success");
    } catch (err) { notify(err instanceof Error ? err.message : "Falha ao enviar o teste.", "error"); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 text-[#172334] sm:px-6">
    <div className="mx-auto max-w-2xl">
      <Link to="/app/perfil" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#526277]">← Voltar ao perfil</Link>
      <header className="mt-5 flex items-start gap-3">
        <img src="/ensina-me-icon.svg" alt="Ensina-me" className="h-12 w-12 rounded-xl" />
        <div><p className="text-sm font-bold text-[#0242D7]">Ensina-me</p><h1 className="mt-1 text-2xl font-black">Notificações</h1><p className="mt-2 text-sm leading-6 text-[#667487]">Receba lembretes de estudo e revisão, mesmo quando não estiver com o site aberto, se o navegador oferecer suporte a Web Push.</p></div>
      </header>
      {message && <div role="status" className={"mt-5 rounded-xl border p-3 text-sm " + (kind === "error" ? "border-red-200 bg-red-50 text-red-800" : kind === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-blue-200 bg-blue-50 text-blue-900")}>{message}</div>}
      {loading ? <p className="mt-8 text-sm text-[#667487]">Carregando suas preferências…</p> : <div className="mt-7 space-y-5">
        <section className="rounded-2xl border border-[#DCE5F0] bg-white p-5">
          <h2 className="text-base font-extrabold">Notificações push neste dispositivo</h2>
          <p className="mt-2 text-sm leading-6 text-[#667487]">Você controla a autorização. O navegador também pode pedir permissão. Se você bloquear o acesso nas configurações do dispositivo, o Ensina-me não conseguirá mostrar alertas.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!deviceSubscribed ? (
              <button disabled={busy || configured === false} onClick={() => void enablePush()} className="min-h-11 rounded-xl bg-[#0242D7] px-4 text-sm font-bold text-white disabled:opacity-50">
                {busy ? "Aguarde…" : "Ativar neste dispositivo"}
              </button>
            ) : (
              <>
                <span className="inline-flex min-h-11 items-center rounded-xl bg-green-50 px-4 text-sm font-bold text-green-800">Este dispositivo está registrado</span>
                <button disabled={busy} onClick={() => void sendTest()} className="min-h-11 rounded-xl border border-[#0242D7] px-4 text-sm font-bold text-[#0242D7] disabled:opacity-50">Enviar notificação de teste</button>
                <button disabled={busy} onClick={() => void disablePush()} className="min-h-11 rounded-xl border border-[#D3DEEA] px-4 text-sm font-bold text-[#526277] disabled:opacity-50">Desativar notificações</button>
              </>
            )}
          </div>
          {configured === false && <p className="mt-4 text-xs leading-5 text-[#8A5A00]">Configuração pendente no servidor: as chaves VAPID ainda não foram cadastradas. O site não deve prometer entrega real até concluir essa etapa.</p>}
        </section>
        <section className="rounded-2xl border border-[#DCE5F0] bg-white p-5">
          <h2 className="text-base font-extrabold">O que você quer receber?</h2>
          <p className="mt-1 text-sm text-[#667487]">A IA considera essas preferências antes de recomendar um aviso.</p>
          {([
            ["study_reminders", "Lembretes de estudo", "Retome sua rotina de aprendizagem."],
            ["review_reminders", "Revisões de tópicos", "Volte ao conteúdo no momento adequado."],
            ["learning_recommendations", "Recomendações da IA", "Pratique conceitos que precisam de atenção."],
            ["announcements", "Avisos gerais", "Atualizações importantes do Ensina-me."],
          ] as const).map(([key, title, description]) => <label key={key} className="mt-5 flex cursor-pointer items-start gap-3 border-t border-[#EEF2F7] pt-4">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0242D7]" checked={prefs[key]} onChange={e => void updateCategory(key, e.target.checked)} />
            <span><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs leading-5 text-[#718093]">{description}</span></span>
          </label>)}
        </section>
        <p className="px-1 text-xs leading-5 text-[#8793A2]">A permissão é específica para cada navegador/dispositivo. Para receber avisos em outro celular ou computador, ative as notificações também nele. A entrega depende de suporte do navegador, conexão e permissão ativa.</p>
      </div>}
    </div>
  </main>;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}
