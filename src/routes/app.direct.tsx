import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/direct")({ component: DirectPage });

type Person = { user_id: string; display_name: string; avatar_url: string | null; allow_requests: boolean };
type RequestRow = { id: string; sender_id: string; recipient_id: string; status: string; created_at: string; other_name?: string };
type Conversation = { id: string; kind: "individual" | "group"; title: string | null; last_message_at: string; created_at: string; avatar_url?: string | null };
type Message = { id: string; conversation_id: string; sender_id: string; message_type: string; body: string | null; media_path?: string | null; duration_seconds?: number | null; deleted_for_everyone_at?: string | null; created_at: string; audioUrl?: string };
type ReadReceipt = { user_id: string; display_name: string; last_read_at: string };
type DirectSettings = { allow_requests: boolean; show_online_status: boolean; show_last_seen: boolean; read_receipts: boolean; auto_play_voice: boolean };

const initialSettings: DirectSettings = { allow_requests: true, show_online_status: true, show_last_seen: true, read_receipts: true, auto_play_voice: false };
const dateLabel = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function DirectPage() {
  const [demoMode] = useState(() => typeof window !== "undefined" && (window.location.pathname === "/direct-demo" || new URLSearchParams(window.location.search).get("demo") === "1" || new URLSearchParams(window.location.search).get("directTest") === "1"));
  const [userId, setUserId] = useState("");
  const [tab, setTab] = useState<"individual" | "groups" | "requests" | "settings" | "suggestion">("individual");
  const [showArchived, setShowArchived] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [contactsDrawerOpen, setContactsDrawerOpen] = useState(false);
  const [memberPreferences, setMemberPreferences] = useState<Record<string, { archived_at: string | null; pinned_at: string | null; hidden_at: string | null }>>({});
  const [blockedUsers, setBlockedUsers] = useState<{ blocked_id: string; created_at: string }[]>([]);
  const [restrictedRequesters, setRestrictedRequesters] = useState<{ requester_id: string; display_name: string }[]>([]);
  const [groupNotificationsEnabled, setGroupNotificationsEnabled] = useState(true);
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
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
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [settings, setSettings] = useState<DirectSettings>(initialSettings);
  const [search, setSearch] = useState("");
  const [myFriendCode, setMyFriendCode] = useState("");
  const [friendCodeLookup, setFriendCodeLookup] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageEmojiOpen, setMessageEmojiOpen] = useState(false);
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
    if (demoMode) {
      const demoUser = "demo-student";
      const demoConversation: Conversation = { id: "demo-conversation", kind: "individual", title: "Mariana Costa", last_message_at: new Date().toISOString(), created_at: new Date().toISOString() };
      setUserId(demoUser);
      setMyFriendCode("G1B2R3");
      setRequests([{ id: "demo-request", sender_id: "demo-mariana", recipient_id: demoUser, status: "pending", created_at: new Date().toISOString(), other_name: "Mariana Costa" }]);
      setConversations([demoConversation, { id: "demo-group", kind: "group", title: "Pedagogia • Turma 2026", last_message_at: new Date().toISOString(), created_at: new Date().toISOString() }]);
      setMemberPreferences({ "demo-conversation": { archived_at: null, pinned_at: new Date().toISOString(), hidden_at: null }, "demo-group": { archived_at: null, pinned_at: null, hidden_at: null } });
      setSettings(initialSettings);
      setBlockedUsers([]); setRestrictedRequesters([]);
      setLoading(false);
      return;
    }
    const sessionResult = await supabase.auth.getSession();
    const id = currentUserId || sessionResult.data.session?.user.id;
    if (!id) { setError("Sua sessão expirou. Entre novamente para acessar o Direct."); setLoading(false); return; }
    setUserId(id);
    const { data: ownFriendCode } = await supabase.rpc("direct_my_friend_code");
    if (typeof ownFriendCode === "string") setMyFriendCode(ownFriendCode);
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
    const requestRows = (requestResult.data ?? []) as RequestRow[];
    const peerIds = [...new Set(requestRows.map((row) => row.sender_id === id ? row.recipient_id : row.sender_id))];
    const requestNames = peerIds.length ? await supabase.from("student_profiles").select("user_id,display_name").in("user_id", peerIds) : null;
    setRequests(requestRows.map((row) => ({
      ...row,
      other_name: requestNames?.data?.find((person) => person.user_id === (row.sender_id === id ? row.recipient_id : row.sender_id))?.display_name || "Estudante"
    })));
    const memberRows = memberResult.data ?? [];
    setMemberPreferences(Object.fromEntries(memberRows.map((m) => [m.conversation_id, { archived_at: m.archived_at, pinned_at: m.pinned_at, hidden_at: m.hidden_at }])));
    const ids = memberRows.map((m) => m.conversation_id);
    if (ids.length) {
      const convResult = await supabase.from("direct_conversations").select("id,kind,title,last_message_at,created_at").in("id", ids).order("last_message_at", { ascending: false });
      if (convResult.error) setError("Não foi possível carregar suas conversas.");
      else {
        const rows = (convResult.data ?? []) as Conversation[];
        const memberDetails = await supabase.from("direct_conversation_members").select("conversation_id,user_id").in("conversation_id", ids).neq("user_id", id);
        const peerIds = [...new Set((memberDetails.data ?? []).map((member) => member.user_id as string))];
        const profileDetails = peerIds.length ? await supabase.from("student_profiles").select("user_id,avatar_url").in("user_id", peerIds) : { data: [] as { user_id: string; avatar_url: string | null }[] };
        setConversations(rows.map((conversation) => {
          const peerId = (memberDetails.data ?? []).find((member) => member.conversation_id === conversation.id)?.user_id;
          return { ...conversation, avatar_url: profileDetails.data?.find((profile) => profile.user_id === peerId)?.avatar_url ?? null };
        }));
      }
    } else setConversations([]);
    if (settingsResult.data) setSettings(settingsResult.data as DirectSettings);
    else {
      const saved = await supabase.from("direct_settings").upsert({ user_id: id, ...initialSettings }, { onConflict: "user_id" }).select("allow_requests,show_online_status,show_last_seen,read_receipts,auto_play_voice").maybeSingle();
      if (!saved.error && saved.data) setSettings(saved.data as DirectSettings);
    }
    setLoading(false);
  }, [demoMode]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container || !shouldAutoScrollRef.current) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, activeConversation?.id]);

  useEffect(() => {
    if (!userId || demoMode) return;
    const channel = supabase.channel(`direct-requests-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_requests", filter: `recipient_id=eq.${userId}` }, () => {
        setNotice("Você recebeu uma nova solicitação de conversa no Ensina-me.");
        void load(userId);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, load, demoMode]);



  async function searchPeople(value: string) {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setSearch(normalized);
    setError("");
    setNotice("");
    setPeople([]);
  }

  async function findFriendByCode(event?: FormEvent) {
    event?.preventDefault();
    const code = search.toUpperCase().trim();
    if (!/^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$/.test(code)) {
      setError("Digite um código válido com seis caracteres alternados entre letra e número.");
      return;
    }
    setFriendCodeLookup(true);
    setError("");
    setNotice("");
    setPeople([]);
    if (demoMode) {
      const demoCodes: Record<string, Person> = {
        A7B4C9: { user_id: "demo-alexandre", display_name: "Alexandre (teste)", avatar_url: null, allow_requests: true },
        M2C8D5: { user_id: "demo-mariana", display_name: "Mariana Costa", avatar_url: null, allow_requests: true },
      };
      const person = demoCodes[code];
      setPeople(person && !conversations.some((conversation) => conversation.title === person.display_name) ? [person] : []);
      if (!person) setError("Nenhum estudante encontrado com esse código de amizade.");
      setFriendCodeLookup(false);
      return;
    }
    // Perfil fictício isolado para validar o Direct sem criar uma conta falsa no banco de produção.
    if (code === "A7B4C9") {
      setPeople([{ user_id: "demo-alexandre", display_name: "Alexandre (teste)", avatar_url: null, allow_requests: true }]);
      setNotice("Perfil fictício de teste encontrado. Use “Abrir chat de teste” para experimentar sem gravar dados no banco.");
      setFriendCodeLookup(false);
      return;
    }
    const { data, error: lookupError } = await supabase.rpc("direct_find_by_friend_code", { friend_code_input: code });
    setFriendCodeLookup(false);
    if (lookupError) {
      setError(lookupError.message?.toLowerCase().includes("rate limit")
        ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
        : "Não foi possível consultar os estudantes agora. Tente novamente em instantes.");
      return;
    }
    const matches = (data ?? []) as Person[];
    setPeople(matches);
    if (matches.length === 0) setError("Não encontramos estudante com esse código. Confira os seis caracteres e tente novamente.");
  }

  async function openTestChat(person: Person) {
    const conversation: Conversation = { id: "demo-alexandre-chat", kind: "individual", title: "Alexandre (teste)", last_message_at: new Date().toISOString(), created_at: new Date().toISOString() };
    setConversations((items) => items.some((item) => item.id === conversation.id) ? items : [conversation, ...items]);
    setTab("individual"); setSearch(""); setPeople([]);
    await openConversation(conversation);
    setNotice("Chat de teste aberto com Alexandre. Mensagens, áudio e imagens ficam apenas nesta sessão; nada é enviado ao banco ou a estudantes reais.");
  }

  async function sendRequest(person: Person) {
    if (demoMode || person.user_id === "demo-alexandre") {
      if (!demoMode) { window.location.search = "?directTest=1"; return; }
      setRequests((items) => [...items, { id: crypto.randomUUID(), sender_id: userId, recipient_id: person.user_id, status: "pending", created_at: new Date().toISOString(), other_name: person.display_name }]);
      setPeople((items) => items.filter((p) => p.user_id !== person.user_id));
      setNotice("Solicitação de demonstração enviada. Nenhuma mensagem foi enviada a uma pessoa real.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    const { data: requestId, error: insertError } = await supabase.rpc("direct_send_request", { recipient_user_id: person.user_id });
    setBusy(false);
    if (insertError) { setError(insertError.code === "23505" ? "Já existe uma solicitação ou conversa para essa pessoa." : "Não foi possível enviar a solicitação. Verifique se você já pode conversar com essa pessoa."); return; }
    if (requestId) void supabase.functions.invoke("push-notifications", { body: { action: "direct-notify-request", request_id: requestId } });
    setNotice("Solicitação enviada. As mensagens só serão liberadas após o aceite.");
    setPeople((current) => current.filter((p) => p.user_id !== person.user_id));
    await load(userId);
  }

  async function acceptRequest(request: RequestRow) {
    if (demoMode) {
      const conversation: Conversation = { id: `demo-conversation-${request.id}`, kind: "individual", title: request.other_name || "Estudante", last_message_at: new Date().toISOString(), created_at: new Date().toISOString() };
      setRequests((items) => items.filter((item) => item.id !== request.id));
      setConversations((items) => [conversation, ...items]);
      setTab("individual"); setNotice("Solicitação aceita no modo de demonstração.");
      await openConversation(conversation);
      return;
    }
    setBusy(true); setError(""); setNotice("");
    const { data: acceptedConversationId, error: acceptError } = await supabase.rpc("direct_accept_request", { request_id: request.id });
    setBusy(false);
    if (acceptError || !acceptedConversationId) { setError("Esta solicitação não está mais disponível. Você pode enviar uma nova solicitação."); await load(userId); return; }
    setNotice("Solicitação aceita. A conversa está liberada.");
    setTab("individual");
    await load(userId);
    const { data: acceptedConversation } = await supabase.from("direct_conversations").select("id,kind,title,last_message_at,created_at").eq("id", acceptedConversationId).maybeSingle();
    if (acceptedConversation) await openConversation(acceptedConversation as Conversation);
  }

  async function cancelRequest(request: RequestRow) {
    if (demoMode) { setRequests((items) => items.filter((item) => item.id !== request.id)); setNotice("Solicitação cancelada na demonstração."); return; }
    setBusy(true); setError("");
    const { error: cancelError } = await supabase.from("direct_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", request.id).eq("sender_id", userId).eq("status", "pending");
    setBusy(false);
    if (cancelError) setError("Não foi possível cancelar a solicitação.");
    else { setNotice("Solicitação cancelada."); await load(userId); }
  }

  const openConversation = useCallback(async (conversation: Conversation) => {
    setActiveConversation(conversation); setContactsDrawerOpen(false); setError("");
    if (demoMode) {
      const now = new Date();
      const isAlexandreTest = conversation.id.includes("alexandre") || (conversation.title || "").toLowerCase().includes("alexandre");
      setMessages([
        { id: "demo-message-1", conversation_id: conversation.id, sender_id: conversation.kind === "group" ? "demo-joao" : isAlexandreTest ? "demo-alexandre" : "demo-mariana", message_type: "text", body: conversation.kind === "group" ? "Pessoal, alguém revisou o material de alfabetização?" : isAlexandreTest ? "Oi! Sou o Alexandre, perfil de teste do Direct. Quer testar o envio de mensagens?" : "Oi! Você conseguiu revisar o conteúdo de hoje?", created_at: new Date(now.getTime() - 3600000).toISOString() },
        { id: "demo-message-2", conversation_id: conversation.id, sender_id: userId, message_type: "text", body: "Sim! Podemos compartilhar nossas anotações por aqui.", created_at: new Date(now.getTime() - 1800000).toISOString() },
      ]);
      setGroupNotificationsEnabled(true); setReadReceipts([]);
      setVoiceDraft(null); setVoiceDraftPath(null); setVoiceDraftId(null); setVoiceDraftUrl(null); setVoiceDraftConversationId(null);
      return;
    }
    const { data, error: messageError } = await supabase.from("direct_messages").select("id,conversation_id,sender_id,message_type,body,media_path,duration_seconds,deleted_for_everyone_at,created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(200);
    if (messageError) { setError("Não foi possível carregar as mensagens desta conversa."); return; }
    if (conversation.kind === "group") {
      const { data: groupPreference } = await supabase.from("direct_group_notification_preferences").select("notifications_enabled").eq("user_id", userId).eq("conversation_id", conversation.id).maybeSingle();
      setGroupNotificationsEnabled(groupPreference?.notifications_enabled ?? true);
    } else setGroupNotificationsEnabled(true);
    const messageRows = (data ?? []) as Message[];
    let hiddenIds = new Set<string>();
    if (messageRows.length) {
      const { data: hiddenRows } = await supabase.from("direct_message_hides").select("message_id").eq("user_id", userId).in("message_id", messageRows.map((message) => message.id));
      hiddenIds = new Set((hiddenRows ?? []).map((row) => row.message_id));
    }
    const hydrated = await Promise.all(messageRows.filter((message) => !hiddenIds.has(message.id)).map(async (message) => {
      const row = message as Message;
      if (row.message_type !== "voice" || !row.media_path) return row;
      const { data: signed } = await supabase.storage.from("direct-voice").createSignedUrl(row.media_path, 3600);
      return { ...row, audioUrl: signed?.signedUrl };
    }));
    const { data: receiptData } = await supabase.rpc("direct_get_read_receipts", { target_conversation_id: conversation.id });
    setReadReceipts((receiptData ?? []) as ReadReceipt[]);
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
  }, [demoMode, userId]);

  async function deleteMessage(messageId: string) {
    if (!activeConversation) return;
    if (demoMode) { setMessages((items) => items.filter((m) => m.id !== messageId)); setNotice("Mensagem removida na demonstração."); return; }
    setBusy(true); setError(""); setNotice("");
    const { data: deleteMode, error: deleteError } = await supabase.rpc("direct_delete_message", { target_message_id: messageId });
    setBusy(false);
    if (deleteError) { setError("Não foi possível apagar esta mensagem."); return; }
    setNotice(deleteMode === "everyone" ? "Mensagem apagada para todos." : "Mensagem removida da sua visualização.");
    await openConversation(activeConversation);
  }

  async function attachTestImage(file?: File) {
    if (!file || !activeConversation || !demoMode) return;
    if (!file.type.startsWith("image/")) { setError("Escolha um arquivo de imagem."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("A imagem deve ter até 8 MB para este teste."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result || "");
      setMessages((items) => [...items, { id: crypto.randomUUID(), conversation_id: activeConversation.id, sender_id: userId, message_type: "image", body: imageData, created_at: new Date().toISOString() }]);
      setNotice("Imagem adicionada ao chat simulado nesta sessão. O upload real ao servidor ainda precisa ser validado.");
    };
    reader.onerror = () => setError("Não foi possível abrir essa imagem.");
    reader.readAsDataURL(file);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (demoMode) {
      if (!activeConversation || !messageText.trim()) return;
      setMessages((items) => [...items, { id: crypto.randomUUID(), conversation_id: activeConversation.id, sender_id: userId, message_type: "text", body: messageText.trim(), created_at: new Date().toISOString() }]);
      setMessageText(""); setNotice(""); return;
    }
    if (!activeConversation || !messageText.trim()) return;
    setBusy(true); setError("");
    const { data: sentMessage, error: sendError } = await supabase.from("direct_messages").insert({ conversation_id: activeConversation.id, sender_id: userId, message_type: "text", body: messageText.trim() }).select("id").single();
    setBusy(false);
    if (sendError) { setError("A mensagem não foi enviada. O áudio/texto foi mantido no campo para você tentar novamente."); return; }
    if (sentMessage?.id) void supabase.functions.invoke("push-notifications", { body: { action: "direct-notify-message", message_id: sentMessage.id } });
    setMessageText("");
    await openConversation(activeConversation);
    await load(userId);
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (demoMode) {
      if (!groupTitle.trim()) return;
      const group: Conversation = { id: crypto.randomUUID(), kind: "group", title: groupTitle.trim(), last_message_at: new Date().toISOString(), created_at: new Date().toISOString() };
      setConversations((items) => [group, ...items]); setGroupTitle(""); setSelectedMembers([]);
      setNotice("Grupo criado localmente na demonstração."); setTab("groups"); return;
    }
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
    if (demoMode) {
      if (!confirmNoPersonalData || !suggestionText.trim()) { setError("Confirme que a sugestão não contém dados pessoais."); return; }
      setSuggestionText(""); setConfirmNoPersonalData(false); setNotice("Sugestão simulada recebida. Nada foi enviado ao servidor."); return;
    }
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
  }, [activeConversation, openConversation, userId]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds(Math.floor((Date.now() - recordingStartRef.current) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  async function startVoiceRecording() {
    setError(""); setNotice("");
    if (!activeConversation) return;
    const recordingConversationId = activeConversation.id;
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
        const path = `${recordingConversationId}/${userId}/draft-${draftId}.${extension}`;
        setVoiceDraft(blob); setVoiceDraftUrl(URL.createObjectURL(blob)); setVoiceDraftId(draftId);
        setVoiceDraftConversationId(recordingConversationId); setRecordingSeconds(duration);
        stream.getTracks().forEach((track) => track.stop());
        if (demoMode) { setNotice("Áudio gravado localmente para teste. Nada foi enviado ao banco."); return; }
        setBusy(true);
        void (async () => {
          const { error: uploadError } = await supabase.storage.from("direct-voice").upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
          if (uploadError) { setBusy(false); setError("Áudio mantido neste dispositivo. Não foi possível sincronizar o rascunho."); return; }
          const { error: draftError } = await supabase.from("direct_voice_drafts").insert({
            id: draftId, user_id: userId, conversation_id: recordingConversationId, storage_path: path, duration_seconds: duration, sync_status: "synced"
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
    if (demoMode) {
      const audioUrl = voiceDraftUrl || (voiceDraft ? URL.createObjectURL(voiceDraft) : "");
      setMessages((items) => [...items, { id: crypto.randomUUID(), conversation_id: activeConversation.id, sender_id: userId, message_type: "voice", body: null, duration_seconds: recordingSeconds, created_at: new Date().toISOString(), audioUrl }]);
      setVoiceDraft(null); setVoiceDraftPath(null); setVoiceDraftId(null); setVoiceDraftUrl(null); setVoiceDraftConversationId(null); setRecordingSeconds(0);
      setNotice("Áudio enviado ao chat simulado nesta sessão. O envio real ao servidor ainda precisa ser testado separadamente.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    let path = voiceDraftPath;
    if (!path && voiceDraft) {
      const extension = voiceDraft.type.includes("mp4") ? "m4a" : voiceDraft.type.includes("ogg") ? "ogg" : "webm";
      path = `${activeConversation.id}/${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("direct-voice").upload(path, voiceDraft, { contentType: voiceDraft.type || "audio/webm", upsert: false });
      if (uploadError) { setBusy(false); setError("O áudio foi mantido neste campo, mas não foi enviado. Tente novamente."); return; }
    }
    if (!path) { setBusy(false); return; }
    const { data: sentMessage, error: sendError } = await supabase.from("direct_messages").insert({
      conversation_id: activeConversation.id, sender_id: userId, message_type: "voice", media_path: path, duration_seconds: recordingSeconds
    }).select("id").single();
    if (sendError) {
      setBusy(false);
      setError("O áudio foi preservado no armazenamento, mas a mensagem não foi enviada. Tente novamente.");
      return;
    }
    if (sentMessage?.id) void supabase.functions.invoke("push-notifications", { body: { action: "direct-notify-message", message_id: sentMessage.id } });
    if (voiceDraftId) await supabase.from("direct_voice_drafts").delete().eq("id", voiceDraftId).eq("user_id", userId);
    setVoiceDraft(null); setVoiceDraftPath(null); setVoiceDraftId(null); setVoiceDraftUrl(null); setVoiceDraftConversationId(null); setRecordingSeconds(0); setBusy(false);
    await openConversation(activeConversation);
    await load(userId);
  }

  async function saveGroupNotifications(enabled: boolean) {
    if (demoMode) { setGroupNotificationsEnabled(enabled); setNotice("Preferência do grupo salva localmente na demonstração."); return; }
    if (!activeConversation || activeConversation.kind !== "group") return;
    setGroupNotificationsEnabled(enabled); setError(""); setNotice("Aguardando sincronização…");
    const { error: preferenceError } = await supabase.from("direct_group_notification_preferences").upsert({
      user_id: userId, conversation_id: activeConversation.id, notifications_enabled: enabled, updated_at: new Date().toISOString()
    }, { onConflict: "user_id,conversation_id" });
    if (preferenceError) { setGroupNotificationsEnabled(!enabled); setError("Não foi possível salvar as notificações deste grupo."); setNotice(""); return; }
    setNotice("Preferência de notificações do grupo salva.");
  }

  async function updateConversationPreference(kind: "archive" | "pin", enabled: boolean, targetConversation: Conversation | null = activeConversation) {
    if (!targetConversation) return;
    if (demoMode) {
      setMemberPreferences((current) => ({ ...current, [targetConversation.id]: { archived_at: kind === "archive" ? (enabled ? new Date().toISOString() : null) : current[targetConversation.id]?.archived_at ?? null, pinned_at: kind === "pin" ? (enabled ? new Date().toISOString() : null) : current[targetConversation.id]?.pinned_at ?? null, hidden_at: null } }));
      setNotice("Preferência atualizada localmente na demonstração."); return;
    }
    setBusy(true); setError(""); setNotice("");
    const args = {
      target_conversation_id: targetConversation.id,
      should_archive: kind === "archive" ? enabled : null,
      should_pin: kind === "pin" ? enabled : null,
      mark_read: false
    };
    const { error: preferenceError } = await supabase.rpc("direct_update_member_preferences", args);
    setBusy(false);
    if (preferenceError) { setError("Não foi possível atualizar esta conversa."); return; }
    setNotice(kind === "archive" ? (enabled ? "Conversa arquivada." : "Conversa desarquivada.") : (enabled ? "Conversa adicionada aos favoritos." : "Conversa removida dos favoritos."));
    await load(userId);
    if (kind === "archive" && enabled && activeConversation?.id === targetConversation.id) setActiveConversation(null);
  }

  async function blockPerson(personId: string) {
    if (demoMode) { setBlockedUsers((items) => [...items, { blocked_id: personId, created_at: new Date().toISOString() }]); setNotice("Pessoa bloqueada na demonstração."); return; }
    setBusy(true); setError(""); setNotice("");
    const { error: blockError } = await supabase.rpc("direct_block_user", { target_user_id: personId });
    setBusy(false);
    if (blockError) { setError("Não foi possível bloquear esta pessoa."); return; }
    setNotice("Pessoa bloqueada. Novas mensagens foram impedidas.");
    if (activeConversation) setActiveConversation(null);
    await load(userId);
  }

  async function reallowRequester(personId: string) {
    if (demoMode) { setRestrictedRequesters((items) => items.filter((p) => p.requester_id !== personId)); setNotice("Permissão restaurada na demonstração."); return; }
    setBusy(true); setError(""); setNotice("");
    const { error: permissionError } = await supabase.rpc("direct_set_request_permission", { requester_user_id: personId, is_allowed: true });
    setBusy(false);
    if (permissionError) { setError("Não foi possível permitir novas solicitações desta pessoa."); return; }
    setNotice("Solicitações desta pessoa permitidas novamente.");
    await load(userId);
  }

  async function unblockPerson(personId: string) {
    if (demoMode) { setBlockedUsers((items) => items.filter((p) => p.blocked_id !== personId)); setNotice("Pessoa desbloqueada na demonstração."); return; }
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
  const visibleConversations = (tab === "individual" ? individuals : groups)
    .filter((c) => showArchived ? Boolean(memberPreferences[c.id]?.archived_at) : !memberPreferences[c.id]?.archived_at && !memberPreferences[c.id]?.hidden_at)
    .filter((c) => !favoriteOnly || Boolean(memberPreferences[c.id]?.pinned_at))
    .filter((c) => ((c.title || "") + " " + (c.kind === "group" ? "grupo" : "individual")).toLowerCase().includes(conversationSearch.trim().toLowerCase()))
    .sort((a, b) => Number(Boolean(memberPreferences[b.id]?.pinned_at)) - Number(Boolean(memberPreferences[a.id]?.pinned_at)));
  const activeTopView = tab === "requests" ? "requests" : tab === "settings" ? "settings" : tab === "suggestion" ? "suggestion" : tab === "groups" ? "groups" : showArchived ? "archived" : favoriteOnly ? "starred" : "inbox";

  function changeView(view: "inbox" | "starred" | "groups" | "requests" | "archived" | "settings" | "suggestion") {
    setError("");
    setNotice("");
    setActiveConversation(null);
    setFavoriteOnly(view === "starred");
    setShowArchived(view === "archived");
    if (view === "groups") setTab("groups");
    else if (view === "requests") setTab("requests");
    else if (view === "settings") setTab("settings");
    else if (view === "suggestion") setTab("suggestion");
    else setTab("individual");
  }

  return (
    <section className="direct-shell fixed inset-x-0 top-[60px] bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 flex min-h-0 flex-col overflow-hidden border-0 bg-white text-[#172334] shadow-none lg:bottom-0 lg:left-[252px] lg:right-0 lg:top-[58px] dark:bg-black dark:text-white" aria-label="Direct do Ensina-me">
      <header className={(activeConversation ? "hidden " : "") + "shrink-0 border-b border-[#E5EAF1] bg-white dark:border-[#252525] dark:bg-black"}>
        <div className="flex min-h-[58px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setContactsDrawerOpen((open) => !open)} aria-label={contactsDrawerOpen ? "Fechar lista de contatos" : "Abrir lista de contatos"} aria-expanded={contactsDrawerOpen} title="Contatos" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDE4ED] bg-white text-xl font-bold text-[#0242D7] shadow-sm hover:bg-[#EAF1FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] dark:border-[#3A3A3A] dark:bg-[#151515] dark:text-white dark:hover:bg-[#252525]">☰</button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0242D7] text-lg text-white" aria-hidden="true">✉</div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">Direct</h1>
              <p className="hidden text-xs text-[#718096] sm:block dark:text-[#B6B6B6]">Conversas e grupos do Ensina-me</p>
            </div>
          </div>
          <details className="group relative shrink-0">
            <summary aria-label="Mais opções do Direct" title="Mais opções" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-2xl font-bold hover:bg-[#F1F4F9] dark:hover:bg-[#191919]">⋮</summary>
            <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-[#DDE4ED] bg-white p-2 shadow-xl dark:border-[#333] dark:bg-[#111]">
              {([
                { id: "inbox", label: "Contatos", mark: "▣" },
                { id: "starred", label: "Favoritas", mark: "☆" },
                { id: "groups", label: "Grupos", mark: "♧" },
                { id: "requests", label: "Solicitações", mark: "↗" },
                { id: "archived", label: "Arquivadas", mark: "▤" },
                { id: "settings", label: "Privacidade", mark: "⚙" },
                { id: "suggestion", label: "Sugestões", mark: "✎" },
              ] as const).map((item) => (
                <button key={item.id} type="button" onClick={(event) => { changeView(item.id); const menu = event.currentTarget.closest("details"); if (menu) menu.open = false; }} aria-current={activeTopView === item.id ? "page" : undefined} className={"flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold " + (activeTopView === item.id ? "bg-[#EAF1FF] text-[#0242D7] dark:bg-[#202020] dark:text-white" : "hover:bg-[#F5F7FA] dark:hover:bg-[#191919]")}>
                  <span aria-hidden="true" className="w-5 text-center text-base">{item.mark}</span><span className="flex-1">{item.label}</span>
                  {item.id === "requests" && received.length > 0 && <span className="rounded-full bg-[#0242D7] px-2 py-0.5 text-[10px] text-white">{received.length}</span>}
                </button>
              ))}
            </div>
          </details>
        </div>

      </header>

      {(error || notice) && <div role={error ? "alert" : "status"} className={"mx-3 mt-3 flex shrink-0 items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold leading-relaxed sm:mx-5 " + (error ? "border-[#E7A4A4] bg-[#FFF1F1] text-[#7F1D1D] dark:border-[#7F3030] dark:bg-[#2B1111] dark:text-[#FFE4E4]" : "border-[#B8CCFF] bg-[#EEF4FF] text-[#173A8A] dark:border-[#454545] dark:bg-[#171717] dark:text-white")}>
        <span aria-hidden="true" className="mt-0.5 shrink-0">{error ? "!" : "✓"}</span><p className="min-w-0 break-words">{error || notice}</p>
      </div>}

      {loading ? (
        <div className="m-5 flex flex-1 items-center justify-center rounded-2xl border border-[#E5EAF1] text-sm text-[#687688] dark:border-[#252525] dark:text-white">Carregando suas conversas…</div>
      ) : tab === "requests" ? (
        <section className="m-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[#E5EAF1] bg-white p-4 sm:m-6 sm:p-6 dark:border-[#252525] dark:bg-black" aria-labelledby="direct-requests-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h2 id="direct-requests-title" className="text-xl font-black">Solicitações de conversa</h2><p className="mt-1 text-sm text-[#718096] dark:text-[#B6B6B6]">Você decide quem pode iniciar uma conversa com você.</p></div>
            <div className="flex gap-2"><button onClick={() => setRequestsMode("received")} className={"rounded-xl px-4 py-2.5 text-sm font-bold " + (requestsMode === "received" ? "bg-[#0242D7] text-white" : "bg-[#F3F5F8] text-[#475569] dark:bg-[#171717] dark:text-white")}>Recebidas ({received.length})</button><button onClick={() => setRequestsMode("sent")} className={"rounded-xl px-4 py-2.5 text-sm font-bold " + (requestsMode === "sent" ? "bg-[#0242D7] text-white" : "bg-[#F3F5F8] text-[#475569] dark:bg-[#171717] dark:text-white")}>Enviadas ({sent.length})</button></div>
          </div>
          {(requestsMode === "received" ? received : sent).length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center text-center"><span className="text-3xl">✉</span><p className="mt-3 text-sm font-bold">Nenhuma solicitação pendente.</p><p className="mt-1 text-sm text-[#718096] dark:text-[#B6B6B6]">Quando alguém pedir para conversar, ela aparecerá aqui.</p></div> : (requestsMode === "received" ? received : sent).map((request) => <div key={request.id} className="flex flex-wrap items-center gap-4 border-t border-[#E9EDF3] py-4 dark:border-[#282828]"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF1FF] font-black text-[#0242D7] dark:bg-[#171717] dark:text-white">{(request.other_name || "E").slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="font-bold">{request.other_name || "Estudante"}</p><p className="mt-1 text-xs text-[#718096] dark:text-[#B6B6B6]">{request.sender_id === userId ? "Solicitação enviada" : "Quer iniciar uma conversa"} · {dateLabel(request.created_at)}</p></div><div className="flex gap-2">{requestsMode === "received" ? <><button disabled={busy} onClick={() => void acceptRequest(request)} className="rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Aceitar</button><button disabled={busy} onClick={async () => { const { error: declineError } = await supabase.rpc("direct_decline_request", { request_id: request.id }); if (declineError) setError("Não foi possível recusar."); else { setNotice("Solicitação recusada."); await load(userId); } }} className="rounded-xl border border-[#DDE4ED] px-4 py-2.5 text-sm font-bold dark:border-[#333]">Recusar</button></> : <button disabled={busy} onClick={() => void cancelRequest(request)} className="rounded-xl border border-[#DDE4ED] px-4 py-2.5 text-sm font-bold dark:border-[#333]">Cancelar solicitação</button>}</div></div>)}
        </section>
      ) : tab === "settings" ? (
        <section className="m-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[#E5EAF1] bg-white p-4 sm:m-6 sm:p-6 dark:border-[#252525] dark:bg-black" aria-labelledby="direct-settings-title">
          <h2 id="direct-settings-title" className="text-xl font-black">Privacidade e segurança</h2><p className="mb-5 mt-2 text-sm text-[#718096] dark:text-[#B6B6B6]">Você controla como outras pessoas podem encontrar e contatar você.</p>
          <div className="mb-6 rounded-2xl border border-[#E5EAF1] bg-[#F8FAFC] p-4 dark:border-[#282828] dark:bg-[#111]"><h3 className="font-bold">Meu código de amizade</h3><p className="mt-1 text-sm text-[#718096] dark:text-[#B6B6B6]">Compartilhe para que colegas encontrem seu perfil sem pesquisar seu nome.</p><div className="mt-3 flex items-center gap-2"><code className="flex-1 rounded-xl bg-white px-3 py-3 text-center text-lg font-black tracking-[0.25em] dark:bg-[#191919]">{myFriendCode || "Carregando…"}</code><button type="button" disabled={!myFriendCode} onClick={() => { void navigator.clipboard?.writeText(myFriendCode); setNotice("Código de amizade copiado."); }} className="rounded-xl bg-[#0242D7] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Copiar</button></div></div>
          <div className="divide-y divide-[#E9EDF3] dark:divide-[#282828]">{([
            ["allow_requests","Receber solicitações de conversa","Permite que outras pessoas encontrem você para iniciar uma conversa."],
            ["show_online_status","Mostrar quando estou online","Permite que participantes autorizados vejam seu status online."],
            ["show_last_seen","Mostrar último acesso","Exibe seu último acesso às conversas."],
            ["read_receipts","Confirmações de leitura","Permite que remetentes saibam quando você visualizou mensagens."],
            ["auto_play_voice","Reproduzir áudios automaticamente","Reproduz mensagens de voz em sequência quando o recurso estiver disponível."]
          ] as [keyof DirectSettings,string,string][]).map(([key,label,description]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4"><span><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-sm leading-5 text-[#718096] dark:text-[#B6B6B6]">{description}</span></span><input type="checkbox" checked={settings[key]} onChange={(e) => void saveSetting(key,e.target.checked)} className="h-5 w-5 shrink-0 accent-blue-700" /></label>)}</div>
          <div className="mt-6 border-t border-[#E9EDF3] pt-5 dark:border-[#282828]"><h3 className="font-bold">Solicitações recusadas</h3><p className="mt-1 text-sm text-[#718096] dark:text-[#B6B6B6]">Você pode permitir novamente que uma pessoa envie uma solicitação. Ela precisará pedir e aguardar seu aceite.</p>{restrictedRequesters.length === 0 ? <p className="mt-3 text-sm text-[#718096] dark:text-[#B6B6B6]">Nenhuma restrição individual ativa.</p> : restrictedRequesters.map((person) => <div key={person.requester_id} className="flex items-center justify-between gap-3 border-b border-[#E9EDF3] py-3 dark:border-[#282828]"><span className="text-sm">{person.display_name}</span><button disabled={busy} onClick={() => void reallowRequester(person.requester_id)} className="rounded-xl border border-[#DDE4ED] px-3 py-2 text-sm font-bold dark:border-[#333]">Permitir novamente</button></div>)}</div>
          <div className="mt-6 border-t border-[#E9EDF3] pt-5 dark:border-[#282828]"><h3 className="font-bold">Pessoas bloqueadas</h3>{blockedUsers.length === 0 ? <p className="mt-2 text-sm text-[#718096] dark:text-[#B6B6B6]">Você não bloqueou ninguém.</p> : blockedUsers.map((person) => <div key={person.blocked_id} className="flex items-center justify-between gap-3 border-b border-[#E9EDF3] py-3 dark:border-[#282828]"><span className="text-sm text-[#718096] dark:text-[#B6B6B6]">Estudante {person.blocked_id.slice(0, 8)}…</span><button disabled={busy} onClick={() => void unblockPerson(person.blocked_id)} className="rounded-xl border border-[#DDE4ED] px-3 py-2 text-sm font-bold dark:border-[#333]">Desbloquear</button></div>)}</div>
        </section>
      ) : tab === "suggestion" ? (
        <form onSubmit={submitSuggestion} className="m-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[#E5EAF1] bg-white p-4 sm:m-6 sm:p-6 dark:border-[#252525] dark:bg-black"><h2 className="text-xl font-black">Enviar sugestão anônima</h2><p className="mb-5 mt-2 max-w-2xl text-sm leading-6 text-[#718096] dark:text-[#B6B6B6]">Compartilhe uma ideia para melhorar o Direct. Não inclua nome, telefone, e-mail, dados acadêmicos identificáveis ou outros dados pessoais. Não anexe arquivos.</p><label htmlFor="direct-suggestion" className="mb-2 block text-sm font-bold">Sua sugestão</label><textarea id="direct-suggestion" value={suggestionText} onChange={(e) => setSuggestionText(e.target.value)} maxLength={3000} rows={7} placeholder="Escreva sua sugestão (até 3.000 caracteres)" className="w-full rounded-xl border border-[#DDE4ED] bg-white p-4 text-sm leading-6 outline-none focus:border-[#0242D7] dark:border-[#333] dark:bg-[#111] dark:text-white" /><p className="mb-4 mt-1 text-right text-xs text-[#718096] dark:text-[#B6B6B6]">{suggestionText.length}/3000</p><label className="mb-5 flex items-start gap-3 text-sm leading-5"><input type="checkbox" checked={confirmNoPersonalData} onChange={(e) => setConfirmNoPersonalData(e.target.checked)} required className="mt-1 h-4 w-4 accent-blue-700" /><span>Confirmo que o texto não contém dados pessoais nem conteúdo de conversas privadas.</span></label><button disabled={busy || !suggestionText.trim() || !confirmNoPersonalData} className="rounded-xl bg-[#0242D7] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Enviar sugestão anônima</button><p className="mt-4 text-xs text-[#718096] dark:text-[#B6B6B6]">Após o envio, você verá apenas a confirmação de recebimento. Não há acompanhamento de status nem promessa de resposta.</p></form>
      ) : (
        <div className="relative flex min-h-0 min-w-0 flex-1">
          {contactsDrawerOpen && <button type="button" aria-label="Fechar painel de contatos" onClick={() => setContactsDrawerOpen(false)} className="absolute inset-0 z-30 cursor-default bg-black/35 backdrop-blur-[1px]" />}
          <aside className={(contactsDrawerOpen ? "flex" : "hidden") + " absolute inset-y-0 left-0 z-40 w-[min(88vw,360px)] min-h-0 flex-col border-r border-[#DDE4ED] bg-white shadow-2xl dark:border-[#303030] dark:bg-[#080808]"} aria-label="Lista de contatos">
            <div className="shrink-0 border-b border-[#E5EAF1] p-3 sm:p-4 dark:border-[#252525]">
              <label htmlFor="direct-conversation-search" className="sr-only">Buscar conversas</label>
              <div className="flex items-center gap-2 rounded-xl bg-[#F0F2F5] px-3 dark:bg-[#161616]">
                <span aria-hidden="true" className="text-lg text-[#718096]">⌕</span>
                <input id="direct-conversation-search" value={conversationSearch} onChange={(e) => setConversationSearch(e.target.value)} placeholder="Buscar ou iniciar conversa" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#7B8795] dark:placeholder:text-[#A0A0A0]" />
                {conversationSearch && <button type="button" onClick={() => setConversationSearch("")} aria-label="Limpar busca" className="text-[#718096]">×</button>}
              </div>
              <details className="mt-3 rounded-xl border border-[#E2E8F0] dark:border-[#303030]">
                <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-bold text-[#475569] dark:text-[#E7E7E7]">＋ Encontrar estudante por código</summary>
                <div className="border-t border-[#E2E8F0] p-3 dark:border-[#303030]">
                  <form onSubmit={findFriendByCode}>
                    <label className="mb-2 block text-xs font-bold" htmlFor="direct-search">Código de amizade · 6 caracteres</label>
                    <div className="flex gap-2">
                      <input id="direct-search" value={search} onChange={(e) => void searchPeople(e.target.value)} placeholder="Ex.: A7B4C9" autoCapitalize="characters" autoComplete="off" maxLength={6} className="min-w-0 flex-1 rounded-xl border border-[#DDE4ED] bg-white px-3 py-2.5 text-sm uppercase tracking-widest outline-none focus:border-[#0242D7] dark:border-[#333] dark:bg-[#111] dark:text-white" />
                      <button type="submit" disabled={friendCodeLookup || search.length !== 6} className="rounded-xl bg-[#0242D7] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">{friendCodeLookup ? "Buscando…" : "Buscar"}</button>
                    </div>
                  </form>
                  {people.length > 0 && <div className="mt-3 space-y-2">{people.map((person) => <div key={person.user_id} className="rounded-xl border border-[#E2E8F0] p-3 dark:border-[#303030]"><div className="flex items-center gap-2"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF1FF] font-black text-[#0242D7] dark:bg-[#171717] dark:text-white">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : person.display_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{person.display_name}</p><p className="text-xs text-[#718096] dark:text-[#B6B6B6]">Perfil encontrado</p></div></div>{tab === "groups" ? <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#DDE4ED] px-3 py-2 text-xs font-bold dark:border-[#333]"><input type="checkbox" checked={selectedMembers.includes(person.user_id)} onChange={(e) => setSelectedMembers((items) => e.target.checked ? [...items, person.user_id] : items.filter((id) => id !== person.user_id))} className="h-4 w-4 accent-blue-700" />Adicionar ao grupo</label> : <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void sendRequest(person)} className="rounded-lg bg-[#0242D7] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{demoMode || person.user_id === "demo-alexandre" ? "Enviar solicitação (teste)" : "Enviar solicitação"}</button>{person.user_id === "demo-alexandre" && <button type="button" onClick={() => { if (!demoMode) { window.location.search = "?directTest=1"; return; } void openTestChat(person); }} className="rounded-lg border border-[#0242D7] px-3 py-2 text-xs font-bold text-[#0242D7] dark:border-white dark:text-white">Abrir chat de teste</button>}{person.user_id !== "demo-alexandre" && <button disabled={busy} onClick={() => void blockPerson(person.user_id)} className="rounded-lg border border-[#DDE4ED] px-3 py-2 text-xs font-bold dark:border-[#333]">Bloquear</button>}</div>}</div>)}</div>}
                </div>
              </details>
              {tab === "groups" && <form onSubmit={createGroup} className="mt-3 rounded-xl border border-[#E2E8F0] p-3 dark:border-[#303030]"><h3 className="text-sm font-black">Criar grupo</h3><label htmlFor="direct-group-title" className="mb-1 mt-3 block text-xs font-bold">Nome do grupo</label><input id="direct-group-title" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} maxLength={80} minLength={2} required placeholder="Ex.: Estudos de Alfabetização" className="w-full rounded-lg border border-[#DDE4ED] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0242D7] dark:border-[#333] dark:bg-[#111] dark:text-white" /><p className="mt-2 text-xs text-[#718096] dark:text-[#B6B6B6]">{selectedMembers.length} pessoa(s) selecionada(s). Busque os códigos acima para adicionar participantes.</p><button disabled={busy || selectedMembers.length < 1} className="mt-3 w-full rounded-lg bg-[#0242D7] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">Criar grupo</button></form>}
            </div>
            <div className="flex items-center justify-between px-4 py-3"><h2 className="text-xs font-black uppercase tracking-[0.12em] text-[#7A8796] dark:text-[#B6B6B6]">{showArchived ? "Arquivadas" : favoriteOnly ? "Favoritas" : tab === "groups" ? "Seus grupos" : "Contatos"}</h2><button type="button" onClick={() => setContactsDrawerOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-[#F1F4F9] dark:hover:bg-[#191919]" aria-label="Fechar contatos">×</button></div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {visibleConversations.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center"><span className="text-3xl">✉</span><p className="mt-3 text-sm font-bold">{favoriteOnly ? "Nenhuma conversa favorita" : showArchived ? "Nenhuma conversa arquivada" : conversationSearch ? "Nenhuma conversa encontrada" : tab === "groups" ? "Você ainda não participa de grupos" : "Sua caixa de entrada está vazia"}</p><p className="mt-1 max-w-[250px] text-xs leading-5 text-[#718096] dark:text-[#B6B6B6]">{tab === "groups" ? "Encontre estudantes e organize um grupo de estudos." : "Pesquise o código de amizade de um estudante para começar uma conversa."}</p></div> : visibleConversations.map((conversation) => (
                <div key={conversation.id} className={"group flex items-center gap-3 border-b border-[#F0F2F5] px-3 py-3 transition-colors dark:border-[#202020] " + (activeConversation?.id === conversation.id ? "bg-[#EAF1FF] dark:bg-[#171717]" : "hover:bg-[#F8FAFC] dark:hover:bg-[#111]")}>
                  <button type="button" onClick={() => void openConversation(conversation)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={"Abrir conversa com " + (conversation.title || "Estudante")}>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF1FF] text-sm font-black text-[#0242D7] dark:bg-[#222] dark:text-white">{conversation.kind === "group" ? "👥" : conversation.avatar_url ? <img src={conversation.avatar_url} alt="" className="h-full w-full object-cover" /> : (conversation.title || "E").slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{conversation.title || (conversation.kind === "group" ? "Grupo de estudos" : "Conversa individual")}</p><time className="shrink-0 text-[10px] text-[#718096] dark:text-[#B6B6B6]">{new Date(conversation.last_message_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</time></div><p className="mt-1 truncate text-xs text-[#687688] dark:text-[#B6B6B6]">{conversation.kind === "group" ? "Grupo de estudos" : "Conversa privada"} · {dateLabel(conversation.last_message_at)}</p></div>
                  </button>
                  <button type="button" disabled={busy} onClick={() => void updateConversationPreference("pin", !memberPreferences[conversation.id]?.pinned_at, conversation)} className="hidden rounded-lg px-2 py-1 text-lg text-[#7A8796] hover:bg-white disabled:opacity-50 sm:block dark:text-[#B6B6B6] dark:hover:bg-[#222]" title={memberPreferences[conversation.id]?.pinned_at ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-label={memberPreferences[conversation.id]?.pinned_at ? "Remover dos favoritos" : "Adicionar aos favoritos"}>{memberPreferences[conversation.id]?.pinned_at ? "★" : "☆"}</button>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F8F7F3] dark:bg-[#101010]" aria-label="Conversa selecionada">
            {activeConversation ? <>
              <header className="flex shrink-0 items-center gap-3 border-b border-[#E5EAF1] bg-white px-3 py-3 sm:px-5 dark:border-[#252525] dark:bg-black">
                <button type="button" onClick={() => setContactsDrawerOpen((open) => !open)} aria-label={contactsDrawerOpen ? "Fechar lista de contatos" : "Abrir lista de contatos"} aria-expanded={contactsDrawerOpen} title="Contatos" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDE4ED] text-lg font-bold text-[#0242D7] hover:bg-[#EAF1FF] dark:border-[#333] dark:text-white dark:hover:bg-[#171717]">☰</button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF1FF] font-black text-[#0242D7] dark:bg-[#222] dark:text-white">{activeConversation.kind === "group" ? "👥" : activeConversation.avatar_url ? <img src={activeConversation.avatar_url} alt="" className="h-full w-full object-cover" /> : (activeConversation.title || "E").slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-black sm:text-base">{activeConversation.title || (activeConversation.kind === "group" ? "Grupo de estudos" : "Conversa individual")}</h2><p className="mt-0.5 text-xs text-[#718096] dark:text-[#B6B6B6]">{activeConversation.kind === "group" ? "Grupo do Ensina-me" : "Mensagens privadas · histórico autorizado"}</p></div>
                {activeConversation.kind === "group" && <label className="hidden items-center gap-2 text-xs sm:flex"><input type="checkbox" checked={groupNotificationsEnabled} onChange={(e) => void saveGroupNotifications(e.target.checked)} className="h-4 w-4 accent-blue-700" />Notificações</label>}
                <button disabled={busy} onClick={() => void updateConversationPreference("pin", !memberPreferences[activeConversation.id]?.pinned_at)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDE4ED] text-lg hover:bg-[#F6F8FB] disabled:opacity-50 dark:border-[#333] dark:hover:bg-[#171717]" title={memberPreferences[activeConversation.id]?.pinned_at ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-label={memberPreferences[activeConversation.id]?.pinned_at ? "Remover dos favoritos" : "Adicionar aos favoritos"}>{memberPreferences[activeConversation.id]?.pinned_at ? "★" : "☆"}</button>
                <button disabled={busy} onClick={() => void updateConversationPreference("archive", !memberPreferences[activeConversation.id]?.archived_at)} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDE4ED] text-sm hover:bg-[#F6F8FB] disabled:opacity-50 sm:flex dark:border-[#333] dark:hover:bg-[#171717]" title={memberPreferences[activeConversation.id]?.archived_at ? "Desarquivar conversa" : "Arquivar conversa"} aria-label={memberPreferences[activeConversation.id]?.archived_at ? "Desarquivar conversa" : "Arquivar conversa"}>{memberPreferences[activeConversation.id]?.archived_at ? "↩" : "▤"}</button>
                <button type="button" onClick={() => changeView("settings")} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDE4ED] text-sm hover:bg-[#F6F8FB] sm:flex dark:border-[#333] dark:hover:bg-[#171717]" title="Privacidade e segurança" aria-label="Privacidade e segurança">⋯</button>
                <details className="group relative ml-auto shrink-0">
                  <summary aria-label="Mais opções do Direct" title="Mais opções" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl text-2xl font-bold hover:bg-[#F1F4F9] dark:hover:bg-[#191919]">⋮</summary>
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl border border-[#DDE4ED] bg-white p-2 shadow-xl dark:border-[#333] dark:bg-[#111]">
                    {([{ id: "inbox", label: "Contatos", mark: "▣" }, { id: "starred", label: "Favoritas", mark: "☆" }, { id: "groups", label: "Grupos", mark: "♧" }, { id: "requests", label: "Solicitações", mark: "↗" }, { id: "archived", label: "Arquivadas", mark: "▤" }, { id: "settings", label: "Privacidade", mark: "⚙" }, { id: "suggestion", label: "Sugestões", mark: "✎" }] as const).map((item) => (
                      <button key={item.id} type="button" onClick={(event) => { changeView(item.id); const menu = event.currentTarget.closest("details"); if (menu) menu.open = false; }} aria-current={activeTopView === item.id ? "page" : undefined} className={"flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold " + (activeTopView === item.id ? "bg-[#EAF1FF] text-[#0242D7] dark:bg-[#202020] dark:text-white" : "hover:bg-[#F5F7FA] dark:hover:bg-[#191919]")}>
                        <span aria-hidden="true" className="w-5 text-center text-base">{item.mark}</span><span className="flex-1">{item.label}</span>
                        {item.id === "requests" && received.length > 0 && <span className="rounded-full bg-[#0242D7] px-2 py-0.5 text-[10px] text-white">{received.length}</span>}
                      </button>
                    ))}
                  </div>
                </details>
              </header>
              <div ref={messagesScrollRef} onScroll={(event) => { const el = event.currentTarget; shouldAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96; }} className="direct-message-wallpaper min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(100,116,139,0.12) 1px, transparent 0)", backgroundSize: "22px 22px" }}>
                {messages.length === 0 ? <div className="m-auto flex h-full max-w-sm flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-[#171717]">☏</div><h3 className="mt-4 text-lg font-black">Esta conversa está pronta</h3><p className="mt-2 text-sm leading-6 text-[#687688] dark:text-[#B6B6B6]">Envie a primeira mensagem para começar.</p></div> : messages.map((message) => (
                  <div key={message.id} className={"flex " + (message.sender_id === userId ? "justify-end" : "justify-start")}>
                    <div className={"max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-6 shadow-sm sm:max-w-[78%] " + (message.sender_id === userId ? "rounded-br-md bg-[#0242D7] text-white dark:bg-[#0242D7] dark:text-white" : "rounded-bl-md bg-[#F7F5EF] text-[#172334] dark:bg-[#F2F0E8] dark:text-[#172334]")}>
                      {message.deleted_for_everyone_at ? <p className="italic opacity-80">Esta mensagem foi apagada.</p> : message.message_type === "voice" ? (message.audioUrl ? <audio controls preload="none" src={message.audioUrl} className="max-w-full" /> : <p>Áudio indisponível</p>) : message.message_type === "image" && message.body ? <img src={message.body} alt="Imagem anexada" className="max-h-72 max-w-full rounded-lg object-contain" /> : <p className="whitespace-pre-wrap break-words">{message.body || "Mensagem"}</p>}
                      {message.sender_id === userId && !message.deleted_for_everyone_at && <button type="button" disabled={busy} onClick={() => void deleteMessage(message.id)} className="mt-1 block text-[10px] underline opacity-70">Apagar mensagem</button>}
                      <p className={"mt-1 text-right text-[10px] " + (message.sender_id === userId ? "text-white/80" : "text-[#596273]")}>{dateLabel(message.created_at)}{message.message_type === "voice" && message.duration_seconds ? " · " + message.duration_seconds + "s" : ""}{message.sender_id === userId && readReceipts.some((receipt) => new Date(receipt.last_read_at).getTime() >= new Date(message.created_at).getTime()) ? " · Lida" : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0 bg-transparent px-3 pb-3 pt-1 sm:px-5 sm:pb-4">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {demoMode && <label title="Anexar imagem" aria-label="Anexar imagem" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg text-[#0242D7] hover:bg-[#EAF1FF] dark:text-white dark:hover:bg-[#202020]">▧<input type="file" accept="image/*" className="hidden" onChange={(e) => { void attachTestImage(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>}
                  {!recording ? <button type="button" disabled={busy} onClick={() => void startVoiceRecording()} title="Gravar áudio" aria-label="Gravar áudio" className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[#0242D7] hover:bg-[#EAF1FF] dark:text-white dark:hover:bg-[#202020]">🎙</button> : <button type="button" onClick={stopVoiceRecording} className="rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Parar gravação · {recordingSeconds}s</button>}
                  {(voiceDraft || voiceDraftPath) && <><span className="text-xs text-[#718096] dark:text-[#B6B6B6]">Rascunho de áudio · {recordingSeconds}s</span>{voiceDraftUrl && <audio controls src={voiceDraftUrl} className="max-w-full" />}<button type="button" disabled={busy} onClick={() => void sendVoiceMessage()} className="rounded-lg bg-[#0242D7] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Enviar áudio</button><button type="button" disabled={busy} onClick={async () => { if (voiceDraftPath) await supabase.storage.from("direct-voice").remove([voiceDraftPath]); if (voiceDraftId) await supabase.from("direct_voice_drafts").delete().eq("id", voiceDraftId).eq("user_id", userId); setVoiceDraft(null); setVoiceDraftPath(null); setVoiceDraftId(null); setVoiceDraftUrl(null); setVoiceDraftConversationId(null); setRecordingSeconds(0); }} className="rounded-lg border border-[#DDE4ED] px-3 py-2 text-xs font-bold dark:border-[#333]">Descartar</button></>}
                </div>
                <form onSubmit={sendMessage} className="flex items-end gap-2">
                  <div className="relative shrink-0"><button type="button" onClick={() => setMessageEmojiOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-[#687688] hover:bg-[#F2F4F7] dark:text-white dark:hover:bg-[#171717]" aria-label="Abrir emojis" aria-expanded={messageEmojiOpen}>☺</button>
                    {messageEmojiOpen && <div className="absolute bottom-12 left-0 z-20 flex w-[min(280px,80vw)] flex-wrap gap-1 rounded-xl border border-[#E1E7EF] bg-white p-2 shadow-xl dark:border-[#333] dark:bg-[#111]">{["😀","😂","🥰","😍","😊","😉","🤔","😎","😭","👍","🙏","👏","❤️","🔥","✨","🎓","📚","💡","✅","🎉"].map((emoji) => <button key={emoji} type="button" onClick={() => setMessageText((text) => text + emoji)} className="rounded-lg p-2 text-lg hover:bg-[#F2F4F7] dark:hover:bg-[#222]" aria-label={"Inserir " + emoji}>{emoji}</button>)}</div>}
                  </div>
                  <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={5000} rows={1} placeholder="Digite uma mensagem" className="min-h-[44px] min-w-0 flex-1 resize-y rounded-full border border-[#DDE4ED] bg-transparent px-4 py-3 text-sm outline-none focus:border-[#0242D7] dark:border-[#333] dark:text-white" />
                  <button disabled={busy || !messageText.trim()} className="flex h-11 shrink-0 items-center justify-center rounded-full bg-[#0242D7] px-4 text-sm font-bold text-white disabled:opacity-50" aria-label="Enviar mensagem">Enviar</button>
                </form>
              </div>
            </> : (
              <div className="direct-message-wallpaper flex min-h-[420px] flex-1 flex-col items-center justify-center p-7 text-center lg:min-h-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(100,116,139,0.12) 1px, transparent 0)", backgroundSize: "22px 22px" }}>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm dark:bg-[#171717]">✉</div>
                <h2 className="mt-4 text-xl font-black">Suas conversas, em um só lugar</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#687688] dark:text-[#B6B6B6]">Escolha uma conversa à esquerda ou pesquise pelo código de amizade de um estudante para iniciar uma solicitação.</p>
                <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3 text-left"><div className="rounded-xl border border-[#DDE4ED] bg-white/90 p-3 dark:border-[#333] dark:bg-[#111]"><p className="text-xl font-black">{individuals.length}</p><p className="mt-1 text-xs text-[#687688] dark:text-[#B6B6B6]">Conversas individuais</p></div><div className="rounded-xl border border-[#DDE4ED] bg-white/90 p-3 dark:border-[#333] dark:bg-[#111]"><p className="text-xl font-black">{groups.length}</p><p className="mt-1 text-xs text-[#687688] dark:text-[#B6B6B6]">Grupos de estudo</p></div></div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
