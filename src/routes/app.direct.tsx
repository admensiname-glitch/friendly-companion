import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/direct")({ component: DirectPage });

type Person = { user_id: string; display_name: string; avatar_url: string | null; allow_requests: boolean };
type RequestRow = { id: string; sender_id: string; recipient_id: string; status: string; created_at: string };
type Conversation = { id: string; kind: "individual" | "group"; title: string | null; last_message_at: string; created_at: string };
type Message = { id: string; conversation_id: string; sender_id: string; message_type: string; body: string | null; media_path?: string | null; duration_seconds?: number | null; created_at: string; audioUrl?: string };
type DirectSettings = { allow_requests: boolean; show_online_status: boolean; show_last_seen: boolean; read_receipts: boolean; auto_play_voice: boolean };

const initialSettings: DirectSettings = { allow_requests: true, show_online_status: true, show_last_seen: true, read_receipts: true, auto_play_voice: false };
const dateLabel = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function DirectPage() {
  const [userId, setUserId] = useState("");
  const [tab, setTab] = useState<"individual" | "groups" | "requests" | "settings" | "suggestion">("individual");
  const [showArchived, setShowArchived] = useState(false);
  const [memberPreferences, setMemberPreferences] = useState<Record<string, { archived_at: string | null; pinned_at: string | null; hidden_at: string | null }>>({});
  const [blockedUsers, setBlockedUsers] = useState<{ blocked_id: string; created_at: string }[]>([]);
  const [restrictedRequesters, setRestrictedRequesters] = useState<{ requester_id: string; display_name: string }[]>([]);
  const [recording, setRecording] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<Blob | null>(null);
  const [voiceDraftPath, setVoiceDraftPath] = useState<string | null>(null);
  const [voiceDraftId, setVoiceDraftId] = useState<string | null>(null);
  const [voiceDraftUrl, setVoiceDraftUrl] = useState<string | null>(null);
  const [voiceDraftConversationId, setVoiceDraftConversationId] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingStartRef = useRef<number>(0);
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
    const [requestResult, memberResult, blocksResult, permissionsResult, settingsResult] = await Promise.all([
      supabase.from("direct_requests").select("id,sender_id,recipient_id,status,created_at").in("status", ["pending"]).order("created_at", { ascending: false }).limit(100),
      supabase.from("direct_conversation_members").select("conversation_id,archived_at,pinned_at,hidden_at").eq("user_id", id),
      supabase.from("direct_blocks").select("blocked_id,created_at").eq("blocker_id", id),
      supabase.from("direct_request_permissions").select("requester_id").eq("recipient_id", id).eq("allowed", false),
      supabase.from("direct_settings").select("allow_requests,show_online_status,show_last_seen,read_receipts,auto_play_voice").eq("user_id", id).maybeSingle(),
    ]);
    if (requestResult.error || memberResult.error) { setError("Não foi possível carregar o Direct. Confira a conexão e tente novamente."); setLoading(false); return; }
    if (blocksResult.error) setBlockedUsers([]); else setBlockedUsers((blocksResult.data ?? []) as { blocked_id: string; created_at: string }[]);
    if (!permissionsResult.error && permissionsResult.data?.length) {
      const requesterIds = permissionsResult.data.map((row) => row.requester_id as string);
      const names = await supabase.from("student_profiles").select("user_id,display_name").in("user_id", requesterIds);
      setRestrictedRequesters(requesterIds.map((requester_id) => ({ requester_id, display_name: names.data?.find((p) => p.user_id === requester_id)?.display_name || `Estudante ${requester_id.slice(0, 8)}…` })));
    } else setRestrictedRequesters([]);
    setRequests((requestResult.data ?? []) as RequestRow[]);
    const memberRows = memberResult.data ?? [];
    setMemberPreferences(Object.fromEntries(memberRows.map((m) => [m.conversation_id, { archived_at: m.archived_at, pinned_at: m.pinned_at, hidden_at: m.hidden_at }])));
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
    const { data: acceptedConversationId, error: acceptError } = await supabase.rpc("direct_accept_request", { request_id: request.id });
    setBusy(false);
    if (acceptError || !acceptedConversationId) { setError("Esta solicitação não está mais disponível. Você pode enviar uma nova solicitação."); await load(userId); return; }
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
    const { data, error: messageError } = await supabase.from("direct_messages").select("id,conversation_id,sender_id,message_type,body,media_path,duration_seconds,created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(200);
    if (messageError) { setError("Não foi possível carregar as mensagens desta conversa."); return; }
    const hydrated = await Promise.all((data ?? []).map(async (message) => {
      const row = message as Message;
      if (row.message_type !== "voice" || !row.media_path) return row;
      const { data: signed } = await supabase.storage.from("direct-voice").createSignedUrl(row.media_path, 3600);
      return { ...row, audioUrl: signed?.signedUrl };
    }));
    setMessages(hydrated);
    setVoiceDraft(null); setVoiceDraftPath(null); setVoiceDraftId(null); setVoiceDraftUrl(null); setVoiceDraftConversationId(null);
    const { data: drafts } = await supabase.from("direct_voice_drafts").select("id,storage_path,duration_seconds").eq("conversation_id", conversation.id).eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
    const draft = drafts?.[0];
    if (draft) {
      const { data: draftUrl } = await supabase.storage.from("direct-voice").createSignedUrl(draft.storage_path, 3600);
      setVoiceDraftPath(draft.storage_path); setVoiceDraftId(draft.id); setVoiceDraftUrl(draftUrl?.signedUrl ?? null);
      setVoiceDraftConversationId(conversation.id); setRecordingSeconds(draft.duration_seconds ?? 0);
    }
    await supabase.rpc("direct_update_member_preferences", { target_conversation_id: conversation.id, should_archive: null, should_pin: null, mark_read: true });
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

  useEffect(() => {
    if (!activeConversation || !userId) return;
    const channel = supabase.channel(`direct-messages-${activeConversation.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${activeConversation.id}` }, () => {
        void openConversation(activeConversation);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeConversation?.id, userId]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds(Math.floor((Date.now() - recordingStartRef.current) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  async function startVoiceRecording() {
    setError(""); setNotice("");
    if (!activeConversation) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este dispositivo/navegador não permite gravar áudio. Tente atualizar o navegador ou usar o app Android.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const duration = Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000));
        const draftId = crypto.randomUUID();
        const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        const path = `${activeConversation.id}/${userId}/draft-${draftId}.${extension}`;
        setVoiceDraft(blob); setVoiceDraftUrl(URL.createObjectURL(blob)); setVoiceDraftId(draftId);
        setVoiceDraftConversationId(activeConversation.id); setRecordingSeconds(duration);
        stream.getTracks().forEach((track) => track.stop());
        setBusy(true);
        void (async () => {
          const { error: uploadError } = await supabase.storage.from("direct-voice").upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
          if (uploadError) { setBusy(false); setError("Áudio mantido neste dispositivo. Não foi possível sincronizar o rascunho."); return; }
          const { error: draftError } = await supabase.from("direct_voice_drafts").insert({
            id: draftId, user_id: userId, conversation_id: activeConversation.id, storage_path: path, duration_seconds: duration, sync_status: "synced"
          });
          if (draftError) {
            await supabase.storage.from("direct-voice").remove([path]);
            setBusy(false); setError("Áudio mantido neste dispositivo, mas o rascunho não foi sincronizado."); return;
          }
          const { data: signed } = await supabase.storage.from("direct-voice").createSignedUrl(path, 3600);
          setVoiceDraftPath(path); setVoiceDraftUrl(signed?.signedUrl ?? URL.createObjectURL(blob));
          setBusy(false); setNotice("Rascunho de áudio salvo e sincronizado.");
        })();
      };
      recorderRef.current = recorder;
      recordingStartRef.current = Date.now();
      setRecordingSeconds(0);
      setVoiceDraft(null);
      setRecording(true);
      recorder.start();
    } catch {
      setError("Não foi possível acessar o microfone. Confira a permissão do dispositivo.");
    }
  }

  function stopVoiceRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    setRecording(false);
  }

  async function sendVoiceMessage() {
    if (!activeConversation || (!voiceDraft && !voiceDraftPath) || !userId || voiceDraftConversationId !== activeConversation.id) return;
    setBusy(true); setError(""); setNotice("");
    let path = voiceDraftPath;
    if (!path && voiceDraft) {
      const extension = voiceDraft.type.includes("mp4") ? "m4a" : voiceDraft.type.includes("ogg") ? "ogg" : "webm";
      path = `${activeConversation.id}/${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("direct-voice").upload(path, voiceDraft, { contentType: voiceDraft.type || "audio/webm", upsert: false });
      if (uploadError) { setBusy(false); setError("O áudio foi mantido neste campo, mas não foi enviado. Tente novamente."); return; }
    }
    if (!path) { setBusy(false); return; }
    const { error: sendError } = await supabase.from("direct_messages").insert({
      conversation_id: activeConversation.id, sender_id: userId, message_type: "voice", media_path: path, duration_seconds: recordingSeconds
    });
    if (sendError) {
      setBusy(false);
      setError("O áudio foi preservado no armazenamento, mas a mensagem não foi enviada. Tente novamente.");
      return;
    }
    if (voiceDraftId) await supabase.from("direct_voice_drafts").delete().eq("id", voiceDraftId).eq("user_id", userId);
    setVoiceDraft(null); setVoiceDraftPath(null); setVoiceDraftId(null); setVoiceDraftUrl(null); setVoiceDraftConversationId(null); setRecordingSeconds(0); setBusy(false);
    await openConversation(activeConversation);
    await load(userId);
  }

  async function updateConversationPreference(kind: "archive" | "pin", enabled: boolean) {
    if (!activeConversation) return;
    setBusy(true); setError(""); setNotice("");
    const args = {
      target_conversation_id: activeConversation.id,
      should_archive: kind === "archive" ? enabled : null,
      should_pin: kind === "pin" ? enabled : null,
      mark_read: false
    };
    const { error: preferenceError } = await supabase.rpc("direct_update_member_preferences", args);
    setBusy(false);
    if (preferenceError) { setError("Não foi possível atualizar esta conversa."); return; }
    setNotice(kind === "archive" ? (enabled ? "Conversa arquivada." : "Conversa desarquivada.") : (enabled ? "Conversa fixada no topo." : "Conversa desafixada."));
    await load(userId);
    if (kind === "archive" && enabled) setActiveConversation(null);
  }

  async function blockPerson(personId: string) {
    setBusy(true); setError(""); setNotice("");
    const { error: blockError } = await supabase.rpc("direct_block_user", { target_user_id: personId });
    setBusy(false);
    if (blockError) { setError("Não foi possível bloquear esta pessoa."); return; }
    setNotice("Pessoa bloqueada. Novas mensagens foram impedidas.");
    if (activeConversation) setActiveConversation(null);
    await load(userId);
  }

  async function reallowRequester(personId: string) {
    setBusy(true); setError(""); setNotice("");
    const { error: permissionError } = await supabase.rpc("direct_set_request_permission", { requester_user_id: personId, is_allowed: true });
    setBusy(false);
    if (permissionError) { setError("Não foi possível permitir novas solicitações desta pessoa."); return; }
    setNotice("Solicitações desta pessoa permitidas novamente.");
    await load(userId);
  }

  async function unblockPerson(personId: string) {
    setBusy(true); setError(""); setNotice("");
    const { error: unblockError } = await supabase.rpc("direct_unblock_user", { target_user_id: personId });
    setBusy(false);
    if (unblockError) { setError("Não foi possível desbloquear esta pessoa."); return; }
    setNotice("Pessoa desbloqueada. Uma nova conversa ainda exige solicitação e aceite.");
    await load(userId);
  }

  const received = requests.filter((r) => r.recipient_id === userId && r.status === "pending");
  const sent = requests.filter((r) => r.sender_id === userId && r.status === "pending");
  const individuals = conversations.filter((c) => c.kind === "individual");
  const groups = conversations.filter((c) => c.kind === "group");
  const visibleConversations = (tab === "individual" ? individuals : groups).filter((c) => showArchived ? Boolean(memberPreferences[c.id]?.archived_at) : !memberPreferences[c.id]?.archived_at && !memberPreferences[c.id]?.hidden_at).sort((a, b) => Number(Boolean(memberPreferences[b.id]?.pinned_at)) - Number(Boolean(memberPreferences[a.id]?.pinned_at)));

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
                  {tab === "individual" ? <div className="flex gap-1"><button disabled={busy} onClick={() => void sendRequest(person)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Solicitar</button><button disabled={busy} onClick={() => void blockPerson(person.user_id)} className="rounded-lg border border-border px-2 py-2 text-xs">Bloquear</button></div> : <input aria-label={`Adicionar ${person.display_name} ao grupo`} type="checkbox" checked={selectedMembers.includes(person.user_id)} onChange={(e) => setSelectedMembers((old) => e.target.checked ? [...old, person.user_id] : old.filter((id) => id !== person.user_id))} className="h-4 w-4 accent-blue-700" />}
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
                <div className="flex items-center justify-between gap-2 px-2 py-2"><h2 className="text-sm font-semibold">{showArchived ? "Arquivadas" : (tab === "individual" ? "Suas conversas" : "Seus grupos")}</h2><button onClick={() => setShowArchived((value) => !value)} className="text-xs font-medium text-blue-700">{showArchived ? "Voltar" : "Arquivadas"}</button></div>
                {visibleConversations.length === 0 ? <p className="px-2 py-5 text-sm text-muted-foreground">Ainda não há {showArchived ? "conversas arquivadas" : (tab === "individual" ? "conversas individuais" : "grupos")} aqui.</p> : visibleConversations.map((conversation) => <button key={conversation.id} onClick={() => void openConversation(conversation)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted ${activeConversation?.id === conversation.id ? "bg-blue-50 ring-1 ring-blue-200" : ""}`}>
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
              <header className="flex items-center gap-3 border-b border-border px-4 py-4"><button onClick={() => setActiveConversation(null)} className="rounded-lg px-2 py-1 text-sm hover:bg-muted">←</button><div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{activeConversation.title || (activeConversation.kind === "group" ? "Grupo" : "Conversa individual")}</h2><p className="text-xs text-muted-foreground">Mensagens privadas • histórico autorizado</p></div><button disabled={busy} onClick={() => void updateConversationPreference("pin", !memberPreferences[activeConversation.id]?.pinned_at)} className="rounded-lg border border-border px-2 py-2 text-xs">{memberPreferences[activeConversation.id]?.pinned_at ? "Desafixar" : "Fixar"}</button><button disabled={busy} onClick={() => void updateConversationPreference("archive", !memberPreferences[activeConversation.id]?.archived_at)} className="rounded-lg border border-border px-2 py-2 text-xs">{memberPreferences[activeConversation.id]?.archived_at ? "Desarquivar" : "Arquivar"}</button></header>
              <div className="flex max-h-[480px] min-h-[300px] flex-col gap-3 overflow-y-auto p-4">
                {messages.length === 0 ? <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">Esta conversa está pronta. Envie a primeira mensagem para começar.</p> : messages.map((message) => <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.sender_id === userId ? "ml-auto bg-blue-700 text-white" : "mr-auto bg-muted text-foreground"}`}>{message.message_type === "voice" ? (message.audioUrl ? <audio controls preload="none" src={message.audioUrl} className="max-w-full" /> : <p>Áudio indisponível</p>) : <p className="whitespace-pre-wrap break-words">{message.body || "Mensagem"}</p>}<p className={`mt-1 text-[10px] ${message.sender_id === userId ? "text-blue-100" : "text-muted-foreground"}`}>{dateLabel(message.created_at)}{message.message_type === "voice" && message.duration_seconds ? ` · ${message.duration_seconds}s` : ""}</p></div>)}
              </div>
              <div className="border-t border-border p-3"><div className="mb-3 flex flex-wrap items-center gap-2">{!recording ? <button type="button" disabled={busy} onClick={() => void startVoiceRecording()} className="rounded-xl border border-border px-3 py-2 text-sm">Gravar áudio</button> : <button type="button" onClick={stopVoiceRecording} className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700">Parar gravação · {recordingSeconds}s</button>}{(voiceDraft || voiceDraftPath) && <><span className="text-xs text-muted-foreground">Rascunho de áudio · {recordingSeconds}s</span>{voiceDraftUrl && <audio controls src={voiceDraftUrl} className="max-w-full" />}<button type="button" disabled={busy} onClick={() => void sendVoiceMessage()} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Enviar áudio</button><button type="button" disabled={busy} onClick={async () => { if (voiceDraftPath) await supabase.storage.from("direct-voice").remove([voiceDraftPath]); if (voiceDraftId) await supabase.from("direct_voice_drafts").delete().eq("id", voiceDraftId).eq("user_id", userId); setVoiceDraft(null); setVoiceDraftPath(null); setVoiceDraftId(null); setVoiceDraftUrl(null); setVoiceDraftConversationId(null); setRecordingSeconds(0); }} className="rounded-xl border border-border px-3 py-2 text-sm">Descartar</button></>}</div><form onSubmit={sendMessage}><div className="flex items-end gap-2"><textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={5000} rows={2} placeholder="Escreva uma mensagem…" className="min-h-[48px] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-blue-600" /><button disabled={busy || !messageText.trim()} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Enviar</button></div></form></div>
            </> : (tab === "individual" || tab === "groups") ? <div className="flex h-full min-h-[440px] flex-col items-center justify-center p-8 text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">💬</div><h2 className="text-xl font-semibold">Suas conversas, em um só lugar</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Selecione uma conversa à esquerda ou pesquise um estudante para iniciar uma solicitação.</p><div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3 text-left"><div className="rounded-xl border border-border p-3"><p className="font-semibold">{individuals.length}</p><p className="text-xs text-muted-foreground">Conversas individuais</p></div><div className="rounded-xl border border-border p-3"><p className="font-semibold">{groups.length}</p><p className="text-xs text-muted-foreground">Grupos</p></div></div></div> : null}

            {tab === "settings" && <div className="p-5 sm:p-7"><h2 className="text-xl font-semibold">Privacidade e segurança</h2><p className="mb-5 mt-2 text-sm text-muted-foreground">As alterações são sincronizadas com sua conta.</p><div className="divide-y divide-border">{([
              ["allow_requests","Receber solicitações de conversa","Permite que outras pessoas encontrem você para iniciar uma conversa."],
              ["show_online_status","Mostrar quando estou online","Permite que participantes autorizados vejam seu status online."],
              ["show_last_seen","Mostrar último acesso","Exibe seu último acesso às conversas."],
              ["read_receipts","Confirmações de leitura","Permite que remetentes saibam quando você visualizou mensagens."],
              ["auto_play_voice","Reproduzir áudios automaticamente","Reproduz mensagens de voz em sequência quando o recurso estiver disponível."]
            ] as [keyof DirectSettings,string,string][]).map(([key,label,description]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4"><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><input type="checkbox" checked={settings[key]} onChange={(e) => void saveSetting(key,e.target.checked)} className="h-5 w-5 shrink-0 accent-blue-700" /></label>)}</div><div className="mt-6 border-t border-border pt-5"><h3 className="font-semibold">Solicitações recusadas</h3><p className="mt-1 text-xs text-muted-foreground">Você pode permitir novamente que uma pessoa envie uma solicitação. Ela precisará pedir e aguardar seu aceite.</p>{restrictedRequesters.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhuma restrição individual ativa.</p> : restrictedRequesters.map((person) => <div key={person.requester_id} className="flex items-center justify-between gap-3 border-b border-border py-3"><span className="text-xs">{person.display_name}</span><button disabled={busy} onClick={() => void reallowRequester(person.requester_id)} className="rounded-lg border border-border px-3 py-2 text-xs">Permitir novamente</button></div>)}</div><div className="mt-6 border-t border-border pt-5"><h3 className="font-semibold">Pessoas bloqueadas</h3>{blockedUsers.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Você não bloqueou ninguém.</p> : blockedUsers.map((person) => <div key={person.blocked_id} className="flex items-center justify-between gap-3 border-b border-border py-3"><span className="text-xs text-muted-foreground">Estudante {person.blocked_id.slice(0,8)}…</span><button disabled={busy} onClick={() => void unblockPerson(person.blocked_id)} className="rounded-lg border border-border px-3 py-2 text-xs">Desbloquear</button></div>)}</div></div>}

            {tab === "suggestion" && <form onSubmit={submitSuggestion} className="p-5 sm:p-7"><h2 className="text-xl font-semibold">Enviar sugestão anônima</h2><p className="mb-4 mt-2 text-sm leading-6 text-muted-foreground">Compartilhe uma ideia para melhorar o Direct. Não inclua nome, telefone, e-mail, dados acadêmicos identificáveis ou outros dados pessoais. Não anexe arquivos.</p><label htmlFor="direct-suggestion" className="mb-2 block text-sm font-medium">Sua sugestão</label><textarea id="direct-suggestion" value={suggestionText} onChange={(e) => setSuggestionText(e.target.value)} maxLength={3000} rows={6} placeholder="Escreva sua sugestão (até 3.000 caracteres)" className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-blue-600" /><p className="mb-4 mt-1 text-right text-xs text-muted-foreground">{suggestionText.length}/3000</p><label className="mb-5 flex items-start gap-3 text-sm leading-5"><input type="checkbox" checked={confirmNoPersonalData} onChange={(e) => setConfirmNoPersonalData(e.target.checked)} required className="mt-1 h-4 w-4 accent-blue-700" /><span>Confirmo que o texto não contém dados pessoais nem conteúdo de conversas privadas.</span></label><button disabled={busy || !suggestionText.trim() || !confirmNoPersonalData} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Enviar sugestão</button><p className="mt-4 text-xs text-muted-foreground">Após o envio, você verá apenas a confirmação de recebimento. Não há acompanhamento de status nem promessa de resposta.</p></form>}
          </section>
        </div>
      )}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">Prévia de desenvolvimento. O envio de texto, solicitações, grupos, gravação/reprodução de áudio, bloqueio, arquivamento e fixação dependem da migração Direct e devem ser validados nesta prévia. Notificações push, presença, rascunhos de áudio sincronizados e testes de segurança completos ainda precisam de validação antes da liberação geral.</p>
    </main>
  );
}
