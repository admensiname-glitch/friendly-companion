import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/direct")({ component: DirectPage });

type Person = { user_id: string; display_name: string; avatar_url: string | null; allow_requests: boolean };
type RequestRow = { id: string; sender_id: string; recipient_id: string; status: string; created_at: string };
type Conversation = { id: string; kind: "individual" | "group"; title: string | null; last_message_at: string; created_at: string };
type Message = { id: string; conversation_id: string; sender_id: string; message_type: string; body: string | null; created_at: string };
type DirectSettings = { allow_requests: boolean; show_online_status: boolean; show_last_seen: boolean; read_receipts: boolean; auto_play_voice: boolean };

const initialSettings: DirectSettings = { allow_requests: true, show_online_status: true, show_last_seen: true, read_receipts: true, auto_play_voice: false };
const dateLabel = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function DirectPage() {
  const [userId, setUserId] = useState("");
  const [tab, setTab] = useState<"individual" | "groups" | "requests" | "settings" | "suggestion">("individual");
  const [requestsMode, setRequestsMode] = useState<"received" | "sent">("received");
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [settings, setSettings] = useState<DirectSettings>(initialSettings);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [suggestionText, setSuggestionText] = useState("");
  const [confirmNoPersonalData, setConfirmNoPersonalData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (currentUserId?: string) => {
    setLoading(true); setError("");
    const sessionResult = await supabase.auth.getSession();
    const id = currentUserId || sessionResult.data.session?.user.id;
    if (!id) { setError("Sua sessão expirou. Entre novamente para acessar o Direct."); setLoading(false); return; }
    setUserId(id);
    const [requestResult, memberResult, settingsResult] = await Promise.all([
      supabase.from("direct_requests").select("id,sender_id,recipient_id,status,created_at").in("status", ["pending"]).order("created_at", { ascending: false }).limit(100),
      supabase.from("direct_conversation_members").select("conversation_id,archived_at,pinned_at").eq("user_id", id),
      supabase.from("direct_settings").select("allow_requests,show_online_status,show_last_seen,read_receipts,auto_play_voice").eq("user_id", id).maybeSingle(),
    ]);
    if (requestResult.error || memberResult.error) { setError("Não foi possível carregar o Direct. Confira a conexão e tente novamente."); setLoading(false); return; }
    setRequests((requestResult.data ?? []) as RequestRow[]);
    const memberRows = memberResult.data ?? [];
    const ids = memberRows.map((m) => m.conversation_id);
    if (ids.length) {
      const convResult = await supabase.from("direct_conversations").select("id,kind,title,last_message_at,created_at").in("id", ids).order("last_message_at", { ascending: false });
      if (convResult.error) setError("Não foi possível carregar suas conversas.");
      else setConversations((convResult.data ?? []) as Conversation[]);
    } else setConversations([]);
    if (settingsResult.data) setSettings(settingsResult.data as DirectSettings);
    else {
      const saved = await supabase.from("direct_settings").upsert({ user_id: id, ...initialSettings }, { onConflict: "user_id" }).select("allow_requests,show_online_status,show_last_seen,read_receipts,auto_play_voice").maybeSingle();
      if (!saved.error && saved.data) setSettings(saved.data as DirectSettings);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function searchPeople(value: string) {
    setSearch(value); setError("");
    if (value.trim().length < 2) { setPeople([]); return; }
    const { data, error: searchError } = await supabase.rpc("direct_find_people", { search_text: value.trim() });
    if (searchError) { setError("Não foi possível pesquisar estudantes agora."); setPeople([]); return; }
    setPeople((data ?? []) as Person[]);
  }

  async function sendRequest(person: Person) {
    setBusy(true); setError(""); setNotice("");
    const { error: insertError } = await supabase.rpc("direct_send_request", { recipient_user_id: person.user_id });
    setBusy(false);
    if (insertError) { setError(insertError.code === "23505" ? "Já existe uma solicitação ou conversa para essa pessoa." : "Não foi possível enviar a solicitação. Verifique se você já pode conversar com essa pessoa."); return; }
    setNotice("Solicitação enviada. As mensagens só serão liberadas após o aceite.");
    setPeople((current) => current.filter((p) => p.user_id !== person.user_id));
    await load(userId);
  }

  async function acceptRequest(request: RequestRow) {
    setBusy(true); setError(""); setNotice("");
    const { error: acceptError } = await supabase.rpc("direct_accept_request", { request_id: request.id });
    setBusy(false);
    if (acceptError) { setError("Esta solicitação não está mais disponível. Você pode enviar uma nova solicitação."); await load(userId); return; }
    setNotice("Solicitação aceita. A conversa está liberada.");
    setTab("individual");
    await load(userId);
  }

  async function cancelRequest(request: RequestRow) {
    setBusy(true); setError("");
    const { error: cancelError } = await supabase.from("direct_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", request.id).eq("sender_id", userId).eq("status", "pending");
    setBusy(false);
    if (cancelError) setError("Não foi possível cancelar a solicitação.");
    else { setNotice("Solicitação cancelada."); await load(userId); }
  }

  async function openConversation(conversation: Conversation) {
    setActiveConversation(conversation); setError("");
    const { data, error: messageError } = await supabase.from("direct_messages").select("id,conversation_id,sender_id,message_type,body,created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(200);
    if (messageError) { setError("Não foi possível carregar as mensagens desta conversa."); return; }
    setMessages((data ?? []) as Message[]);
    await supabase.from("direct_conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversation.id).eq("user_id", userId);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!activeConversation || !messageText.trim()) return;
    setBusy(true); setError("");
    const { error: sendError } = await supabase.from("direct_messages").insert({ conversation_id: activeConversation.id, sender_id: userId, message_type: "text", body: messageText.trim() });
    setBusy(false);
    if (sendError) { setError("A mensagem não foi enviada. O áudio/texto foi mantido no campo para você tentar novamente."); return; }
    setMessageText("");
    await openConversation(activeConversation);
    await load(userId);
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const { data, error: groupError } = await supabase.rpc("direct_create_group", { group_title: groupTitle.trim(), member_ids: selectedMembers });
    setBusy(false);
    if (groupError) { setError("Não foi possível criar o grupo. Escolha um nome e pelo menos uma pessoa."); return; }
    setGroupTitle(""); setSelectedMembers([]); setSearch(""); setPeople([]);
    setNotice("Grupo criado.");
    await load(userId);
    const created = conversations.find((c) => c.id === data);
    if (created) await openConversation(created);
  }

  async function saveSetting(key: keyof DirectSettings, value: boolean) {
    const previous = settings;
    const next = { ...settings, [key]: value };
    setSettings(next); setNotice("Aguardando sincronização…"); setError("");
    const { error: saveError } = await supabase.from("direct_settings").upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (saveError) { setSettings(previous); setError("A configuração não foi sincronizada. Tente novamente."); setNotice(""); return; }
    setNotice("Salvo");
  }

  async function submitSuggestion(event: FormEvent) {
    event.preventDefault();
    if (!confirmNoPersonalData || !suggestionText.trim()) return;
    setBusy(true); setError(""); setNotice("");
    const { error: suggestionError } = await supabase.from("direct_anonymous_suggestions").insert({ suggestion_text: suggestionText.trim() });
    setBusy(false);
    if (suggestionError) { setError("Não foi possível enviar a sugestão. Tente novamente."); return; }
    setSuggestionText(""); setConfirmNoPersonalData(false);
    setNotice("Sugestão recebida.");
  }

  const received = requests.filter((r) => r.recipient_id === userId && r.status === "pending");
  const sent = requests.filter((r) => r.sender_id === userId && r.status === "pending");
  const individuals = conversations.filter((c) => c.kind === "individual");
  const groups = conversations.filter((c) => c.kind === "group");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Ensina-me · Comunicação</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Direct</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Converse com outros estudantes, organize grupos e controle sua privacidade.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
          <span className="font-semibold">{received.length}</span> solicitações pendentes
        </div>
      </header>

      {(error || notice) && <div role={error ? "alert" : "status"} className={`mb-4 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-300 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-900"}`}>{error || notice}</div>}

      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-border pb-2">
        {([{id:"individual",label:"Individuais"},{id:"groups",label:"Grupos"},{id:"requests",label:`Solicitações ${received.length ? `(${received.length})` : ""}`},{id:"settings",label:"Privacidade"},{id:"suggestion",label:"Sugestões"}] as const).map((item) =>
          <button key={item.id} onClick={() => { setTab(item.id); setActiveConversation(null); setError(""); setNotice(""); }} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${tab === item.id ? "bg-blue-700 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{item.label}</button>
        )}
      </div>

      {loading ? <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">Carregando seu Direct…</div> : (
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]">
          <section className="space-y-4">
            {(tab === "individual" || tab === "groups") && <>
              <div className="rounded-2xl border border-border bg-card p-4">
                <label className="mb-2 block text-sm font-semibold" htmlFor="direct-search">Encontrar estudantes</label>
                <input id="direct-search" value={search} onChange={(e) => void searchPeople(e.target.value)} placeholder="Digite um nome (mín. 2 letras)" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                <p className="mt-2 text-xs text-muted-foreground">Solicitações só liberam mensagens depois que a outra pessoa aceitar.</p>
                {people.length > 0 && <div className="mt-3 divide-y divide-border">{people.map((person) => <div key={person.user_id} className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-sm font-semibold text-blue-800">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : person.display_name.slice(0,1).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.display_name}</p><p className="text-xs text-muted-foreground">Estudante do Ensina-me</p></div>
                  {tab === "individual" ? <button disabled={busy} onClick={() => void sendRequest(person)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Solicitar</button> : <input aria-label={`Adicionar ${person.display_name} ao grupo`} type="checkbox" checked={selectedMembers.includes(person.user_id)} onChange={(e) => setSelectedMembers((old) => e.target.checked ? [...old, person.user_id] : old.filter((id) => id !== person.user_id))} className="h-4 w-4 accent-blue-700" />}
                </div>)}</div>}
              </div>
              {tab === "groups" && <form onSubmit={createGroup} className="rounded-2xl border border-border bg-card p-4">
                <h2 className="mb-3 font-semibold">Criar grupo</h2>
                <label htmlFor="group-title" className="mb-1 block text-sm">Nome do grupo</label>
                <input id="group-title" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} maxLength={80} required minLength={2} placeholder="Ex.: Estudos de Alfabetização" className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" />
                <p className="mb-3 text-xs text-muted-foreground">{selectedMembers.length} pessoa(s) selecionada(s)</p>
                <button disabled={busy || selectedMembers.length < 1} className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Criar grupo</button>
              </form>}
              <div className="rounded-2xl border border-border bg-card p-3">
                <h2 className="px-2 py-2 text-sm font-semibold">{tab === "individual" ? "Suas conversas" : "Seus grupos"}</h2>
                {(tab === "individual" ? individuals : groups).length === 0 ? <p className="px-2 py-5 text-sm text-muted-foreground">Ainda não há {tab === "individual" ? "conversas individuais" : "grupos"} aqui.</p> : (tab === "individual" ? individuals : groups).map((conversation) => <button key={conversation.id} onClick={() => void openConversation(conversation)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted ${activeConversation?.id === conversation.id ? "bg-blue-50 ring-1 ring-blue-200" : ""}`}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-800">{conversation.kind === "group" ? "👥" : "✉"}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{conversation.title || (conversation.kind === "group" ? "Grupo" : "Conversa individual")}</p><p className="text-xs text-muted-foreground">{dateLabel(conversation.last_message_at)}</p></div>
                </button>)}
              </div>
            </>}

            {tab === "requests" && <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex gap-2"><button onClick={() => setRequestsMode("received")} className={`rounded-lg px-3 py-2 text-sm ${requestsMode === "received" ? "bg-blue-700 text-white" : "bg-muted"}`}>Recebidas ({received.length})</button><button onClick={() => setRequestsMode("sent")} className={`rounded-lg px-3 py-2 text-sm ${requestsMode === "sent" ? "bg-blue-700 text-white" : "bg-muted"}`}>Enviadas ({sent.length})</button></div>
              {(requestsMode === "received" ? received : sent).length === 0 ? <p className="py-5 text-sm text-muted-foreground">Nenhuma solicitação pendente.</p> : (requestsMode === "received" ? received : sent).map((request) => <div key={request.id} className="border-t border-border py-3"><p className="text-sm font-medium">{request.sender_id === userId ? "Solicitação enviada" : "Nova solicitação"}</p><p className="my-1 text-xs text-muted-foreground">{dateLabel(request.created_at)}</p><p className="break-all text-xs text-muted-foreground">ID do estudante: {(request.sender_id === userId ? request.recipient_id : request.sender_id).slice(0,8)}…</p><div className="mt-2 flex gap-2">{requestsMode === "received" ? <><button disabled={busy} onClick={() => void acceptRequest(request)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Aceitar</button><button disabled={busy} onClick={async () => { const { error: declineError } = await supabase.rpc("direct_decline_request", { request_id: request.id }); if (declineError) setError("Não foi possível recusar."); else { setNotice("Solicitação recusada."); await load(userId); } }} className="rounded-lg border border-border px-3 py-2 text-xs">Recusar</button></> : <button disabled={busy} onClick={() => void cancelRequest(request)} className="rounded-lg border border-border px-3 py-2 text-xs">Cancelar solicitação</button>}</div></div>)}
            </div>}
          </section>

          <section className="min-h-[440px] overflow-hidden rounded-2xl border border-border bg-card">
            {(tab === "individual" || tab === "groups") && activeConversation ? <>
              <header className="flex items-center gap-3 border-b border-border px-4 py-4"><button onClick={() => setActiveConversation(null)} className="rounded-lg px-2 py-1 text-sm hover:bg-muted">←</button><div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{activeConversation.title || (activeConversation.kind === "group" ? "Grupo" : "Conversa individual")}</h2><p className="text-xs text-muted-foreground">Mensagens privadas • histórico autorizado</p></div></header>
              <div className="flex max-h-[480px] min-h-[300px] flex-col gap-3 overflow-y-auto p-4">
                {messages.length === 0 ? <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">Esta conversa está pronta. Envie a primeira mensagem para começar.</p> : messages.map((message) => <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.sender_id === userId ? "ml-auto bg-blue-700 text-white" : "mr-auto bg-muted text-foreground"}`}><p className="whitespace-pre-wrap break-words">{message.body || (message.message_type === "voice" ? "Mensagem de voz (reprodução ainda não disponível)" : "Mensagem")}</p><p className={`mt-1 text-[10px] ${message.sender_id === userId ? "text-blue-100" : "text-muted-foreground"}`}>{dateLabel(message.created_at)}</p></div>)}
              </div>
              <form onSubmit={sendMessage} className="border-t border-border p-3"><div className="flex items-end gap-2"><textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={5000} rows={2} placeholder="Escreva uma mensagem…" className="min-h-[48px] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-blue-600" /><button disabled={busy || !messageText.trim()} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Enviar</button></div><p className="mt-2 text-[11px] text-muted-foreground">Mensagens de texto ativas. Áudio gravado e sincronização de rascunhos ainda precisam ser integrados antes do lançamento completo.</p></form>
            </> : (tab === "individual" || tab === "groups") ? <div className="flex h-full min-h-[440px] flex-col items-center justify-center p-8 text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">💬</div><h2 className="text-xl font-semibold">Suas conversas, em um só lugar</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Selecione uma conversa à esquerda ou pesquise um estudante para iniciar uma solicitação.</p><div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3 text-left"><div className="rounded-xl border border-border p-3"><p className="font-semibold">{individuals.length}</p><p className="text-xs text-muted-foreground">Conversas individuais</p></div><div className="rounded-xl border border-border p-3"><p className="font-semibold">{groups.length}</p><p className="text-xs text-muted-foreground">Grupos</p></div></div></div> : null}

            {tab === "settings" && <div className="p-5 sm:p-7"><h2 className="text-xl font-semibold">Privacidade e segurança</h2><p className="mb-5 mt-2 text-sm text-muted-foreground">As alterações são sincronizadas com sua conta.</p><div className="divide-y divide-border">{([
              ["allow_requests","Receber solicitações de conversa","Permite que outras pessoas encontrem você para iniciar uma conversa."],
              ["show_online_status","Mostrar quando estou online","Permite que participantes autorizados vejam seu status online."],
              ["show_last_seen","Mostrar último acesso","Exibe seu último acesso às conversas."],
              ["read_receipts","Confirmações de leitura","Permite que remetentes saibam quando você visualizou mensagens."],
              ["auto_play_voice","Reproduzir áudios automaticamente","Reproduz mensagens de voz em sequência quando o recurso estiver disponível."]
            ] as [keyof DirectSettings,string,string][]).map(([key,label,description]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4"><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><input type="checkbox" checked={settings[key]} onChange={(e) => void saveSetting(key,e.target.checked)} className="h-5 w-5 shrink-0 accent-blue-700" /></label>)}</div><p className="mt-4 text-xs text-muted-foreground">Bloqueios, arquivamento e fixação serão adicionados nas próximas etapas de implementação.</p></div>}

            {tab === "suggestion" && <form onSubmit={submitSuggestion} className="p-5 sm:p-7"><h2 className="text-xl font-semibold">Enviar sugestão anônima</h2><p className="mb-4 mt-2 text-sm leading-6 text-muted-foreground">Compartilhe uma ideia para melhorar o Direct. Não inclua nome, telefone, e-mail, dados acadêmicos identificáveis ou outros dados pessoais. Não anexe arquivos.</p><label htmlFor="direct-suggestion" className="mb-2 block text-sm font-medium">Sua sugestão</label><textarea id="direct-suggestion" value={suggestionText} onChange={(e) => setSuggestionText(e.target.value)} maxLength={3000} rows={6} placeholder="Escreva sua sugestão (até 3.000 caracteres)" className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-blue-600" /><p className="mb-4 mt-1 text-right text-xs text-muted-foreground">{suggestionText.length}/3000</p><label className="mb-5 flex items-start gap-3 text-sm leading-5"><input type="checkbox" checked={confirmNoPersonalData} onChange={(e) => setConfirmNoPersonalData(e.target.checked)} required className="mt-1 h-4 w-4 accent-blue-700" /><span>Confirmo que o texto não contém dados pessoais nem conteúdo de conversas privadas.</span></label><button disabled={busy || !suggestionText.trim() || !confirmNoPersonalData} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Enviar sugestão</button><p className="mt-4 text-xs text-muted-foreground">Após o envio, você verá apenas a confirmação de recebimento. Não há acompanhamento de status nem promessa de resposta.</p></form>}
          </section>
        </div>
      )}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">Versão inicial em construção. Antes da liberação geral, ainda serão necessários testes de segurança, notificações push, bloqueios, arquivamento, presença, áudio e sincronização completa em web e Android.</p>
    </main>
  );
}
