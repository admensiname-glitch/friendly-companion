import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/comunidade")({ component: CommunityPage });

type Course = { id: string; name: string };
type Discipline = { id: string; name: string; course_id: string };
type Topic = { id: string; name: string; discipline_id: string };
type Post = {
  id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  course_id: string | null;
  discipline_id: string | null;
  topic_id: string | null;
  courses?: { name: string } | null;
  disciplines?: { name: string } | null;
  topics?: { name: string } | null;
};
type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string; authorName?: string; authorAvatar?: string | null };

const COMMON_EMOJIS = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😎","🤓","🧐","🤔","🤗","🤩","🥳","😢","😭","😤","😡","😱","😴","🤯","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💯","🔥","✨","⭐","🎉","👏","🙌","👍","👎","🙏","💪","🤝","👀","🧠","📚","✏️","📝","🎓","💡","✅","❌","❗","❓","🚀","🌟","☕","📌"];


function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("Estudante Ensina-me");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState<"post" | string | null>(null);

  async function loadFeed() {
    setLoading(true);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    setCurrentUserId(userId ?? null);
    if (userId) {
      const { data: profile } = await supabase.from("student_profiles").select("display_name,avatar_url").eq("user_id", userId).maybeSingle();
      setProfileName(profile?.display_name?.trim() || "Estudante Ensina-me");
      setAvatarUrl(profile?.avatar_url ?? null);
    }
    if (!userId) {
      setError("Sua sessão expirou. Entre novamente.");
      setLoading(false);
      return;
    }

    const [postResult, likeResult, saveResult, courseResult] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id,author_id,body,image_url,created_at,course_id,discipline_id,topic_id,courses(name),disciplines(name),topics(name)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("community_likes").select("post_id").eq("user_id", userId),
      supabase.from("community_saves").select("post_id").eq("user_id", userId),
      supabase.from("courses").select("id,name").eq("published", true).order("name"),
    ]);

    if (postResult.error || likeResult.error || saveResult.error || courseResult.error) {
      setError("Não foi possível carregar a comunidade agora.");
      setLoading(false);
      return;
    }

    const nextPosts = (postResult.data ?? []) as unknown as Post[];
    setPosts(nextPosts);
    setLiked(new Set((likeResult.data ?? []).map((item) => item.post_id)));
    setSaved(new Set((saveResult.data ?? []).map((item) => item.post_id)));
    setCourses((courseResult.data ?? []) as Course[]);

    if (nextPosts.length) {
      const ids = nextPosts.map((post) => post.id);
      const { data: likes } = await supabase.from("community_likes").select("post_id").in("post_id", ids);
      const counts: Record<string, number> = {};
      for (const like of likes ?? []) counts[like.post_id] = (counts[like.post_id] ?? 0) + 1;
      setLikeCounts(counts);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadFeed();
    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get("share_text");
    const courseId = params.get("course_id");
    const disciplineId = params.get("discipline_id");
    const topicId = params.get("topic_id");
    if (sharedText) {
      setBody(sharedText.slice(0, 2000));
      setSelectedCourse(courseId ?? "");
      setSelectedDiscipline(disciplineId ?? "");
      setSelectedTopic(topicId ?? "");
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      setDisciplines([]);
      setTopics([]);
      setSelectedDiscipline("");
      setSelectedTopic("");
      return;
    }
    void (async () => {
      const { data } = await supabase.from("disciplines").select("id,name,course_id").eq("course_id", selectedCourse).eq("published", true).order("curriculum_order");
      setDisciplines((data ?? []) as Discipline[]);
      setSelectedDiscipline("");
      setSelectedTopic("");
      setTopics([]);
    })();
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedDiscipline) {
      setTopics([]);
      setSelectedTopic("");
      return;
    }
    void (async () => {
      const { data } = await supabase.from("topics").select("id,name,discipline_id").eq("discipline_id", selectedDiscipline).eq("published", true).order("position");
      setTopics((data ?? []) as Topic[]);
      setSelectedTopic("");
    })();
  }, [selectedDiscipline]);

  async function saveProfile() {
    if (!currentUserId) return;
    const name = profileNameDraft.trim();
    if (name.length < 2 || name.length > 60) { setError("O nome precisa ter entre 2 e 60 caracteres."); return; }
    setProfileSaving(true); setError(null);
    try {
      let nextAvatar = avatarUrl;
      if (avatarFile) {
        if (!avatarFile.type.startsWith("image/")) throw new Error("AVATAR_TYPE");
        if (avatarFile.size > 5 * 1024 * 1024) throw new Error("AVATAR_SIZE");
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = currentUserId + "/avatar-" + crypto.randomUUID() + "." + ext;
        const upload = await supabase.storage.from("profile-media").upload(path, avatarFile, { contentType: avatarFile.type, upsert: false, cacheControl: "31536000" });
        if (upload.error) throw upload.error;
        nextAvatar = supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
      }
      const { error: updateError } = await supabase.from("student_profiles").update({ display_name: name, avatar_url: nextAvatar }).eq("user_id", currentUserId);
      if (updateError) throw updateError;
      setProfileName(name);
      setAvatarUrl(nextAvatar);
      setProfileNameDraft(name);
      setAvatarFile(null);
      setProfileEditing(false);
      setComments((current) => Object.fromEntries(
        Object.entries(current).map(([postId, items]) => [
          postId,
          items.map((comment) =>
            comment.author_id === currentUserId
              ? { ...comment, authorName: name, authorAvatar: nextAvatar }
              : comment,
          ),
        ]),
      ));
      window.dispatchEvent(new CustomEvent("ensina-me-profile-updated", {
        detail: { displayName: name, avatarUrl: nextAvatar },
      }));
    } catch (e) { setError(e instanceof Error && e.message === "AVATAR" ? "A foto precisa ser uma imagem de até 5 MB." : "Não foi possível salvar seu perfil agora."); }
    finally { setProfileSaving(false); }
  }

  async function deletePost(postId: string) {
    if (!currentUserId) return;
    if (!window.confirm("Excluir esta publicação? Essa ação não pode ser desfeita.")) return;
    const { error: deleteError } = await supabase.from("community_posts").delete().eq("id", postId).eq("author_id", currentUserId);
    if (deleteError) { setError("Não foi possível excluir a publicação."); return; }
    setPosts((current) => current.filter((post) => post.id !== postId));
  }

  async function publish() {
    const text = body.trim();
    if (!text && !imageFile) return;
    if (text.length > 2000) {
      setError("A publicação pode ter no máximo 2.000 caracteres.");
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("SESSION");

      let imageUrl: string | null = null;
      let imagePath: string | null = null;
      if (imageFile) {
        if (!imageFile.type.startsWith("image/")) throw new Error("IMAGE");
        if (imageFile.size > 8 * 1024 * 1024) throw new Error("SIZE");
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        imagePath = userId + "/" + crypto.randomUUID() + "." + ext;
        const upload = await supabase.storage.from("community-media").upload(imagePath, imageFile, { contentType: imageFile.type, upsert: false });
        if (upload.error) throw upload.error;
        const { data } = supabase.storage.from("community-media").getPublicUrl(imagePath);
        imageUrl = data.publicUrl;
      }

      const { error: insertError } = await supabase.from("community_posts").insert({
        author_id: userId,
        body: text || "Compartilhei uma imagem de estudo.",
        image_path: imagePath,
        image_url: imageUrl,
        course_id: selectedCourse || null,
        discipline_id: selectedDiscipline || null,
        topic_id: selectedTopic || null,
      });
      if (insertError) throw insertError;

      setBody("");
      setImageFile(null);
      setSelectedTopic("");
      await loadFeed();
    } catch (caught) {
      const message = caught instanceof Error && caught.message === "SIZE"
        ? "A imagem precisa ter até 8 MB."
        : caught instanceof Error && caught.message === "IMAGE"
          ? "Envie apenas uma imagem."
          : "Não foi possível publicar agora.";
      setError(message);
    } finally {
      setPublishing(false);
    }
  }

  async function toggleLike(postId: string) {
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    if (!userId) return;
    if (liked.has(postId)) {
      await supabase.from("community_likes").delete().eq("post_id", postId).eq("user_id", userId);
      setLiked((set) => { const next = new Set(set); next.delete(postId); return next; });
      setLikeCounts((counts) => ({ ...counts, [postId]: Math.max(0, (counts[postId] ?? 1) - 1) }));
    } else {
      await supabase.from("community_likes").insert({ post_id: postId, user_id: userId });
      setLiked((set) => new Set(set).add(postId));
      setLikeCounts((counts) => ({ ...counts, [postId]: (counts[postId] ?? 0) + 1 }));
    }
  }

  async function toggleSave(postId: string) {
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    if (!userId) return;
    if (saved.has(postId)) {
      await supabase.from("community_saves").delete().eq("post_id", postId).eq("user_id", userId);
      setSaved((set) => { const next = new Set(set); next.delete(postId); return next; });
    } else {
      await supabase.from("community_saves").insert({ post_id: postId, user_id: userId });
      setSaved((set) => new Set(set).add(postId));
    }
  }

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from("community_comments")
      .select("id,post_id,author_id,body,created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    const rows = (data ?? []) as Comment[];
    const authorIds = [...new Set(rows.map((comment) => comment.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("student_profiles").select("user_id,display_name,avatar_url").in("user_id", authorIds)
      : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.user_id,
        {
          name: profile.display_name?.trim() || "Estudante Ensina-me",
          avatar: profile.avatar_url ?? null,
        },
      ]),
    );

    const enriched = rows.map((comment) => {
      const profile = profileMap.get(comment.author_id);
      const isCurrentUser = comment.author_id === currentUserId;
      return {
        ...comment,
        authorName: isCurrentUser ? profileName : (profile?.name ?? "Estudante Ensina-me"),
        authorAvatar: isCurrentUser ? avatarUrl : (profile?.avatar ?? null),
      };
    });

    setComments((current) => ({ ...current, [postId]: enriched }));
  }

  async function addComment(postId: string) {
    const text = (commentInput[postId] ?? "").trim();
    if (!text) return;
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    if (!userId) return;
    const { error: insertError } = await supabase.from("community_comments").insert({ post_id: postId, author_id: userId, body: text });
    if (insertError) {
      setError("Não foi possível responder agora.");
      return;
    }
    setCommentInput((current) => ({ ...current, [postId]: "" }));
    await loadComments(postId);
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    setImageFile(event.target.files?.[0] ?? null);
  }

  return (
    <section className="mx-auto w-full max-w-[1080px]" aria-labelledby="community-title">
      <header className="flex flex-col gap-5 border-b border-[#DCE5F0] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0242D7]">Comunidade</p>
          <h1 id="community-title" className="mt-2 text-[34px] font-black tracking-[-0.04em] text-[#172334] sm:text-[42px]">Aprenda junto.</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688]">Dúvidas, trabalhos, dicas e descobertas de outros estudantes — sempre conectados ao estudo.</p>
        </div>
        <Link to="/app/estude-agora" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0242D7] px-4 text-sm font-black text-white">Estudar agora</Link>
      </header>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#DCE5F0] bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.05)]">
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => { setProfileNameDraft(profileName); setProfileEditing(true); }} className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#0242D7] text-xs font-black text-white" aria-label="Editar perfil">{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : "EM"}</button>
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-2"><button type="button" onClick={() => { setProfileNameDraft(profileName); setProfileEditing(true); }} className="text-sm font-black text-[#172334] hover:text-[#0242D7]">{profileName}</button><button type="button" onClick={() => { setProfileNameDraft(profileName); setProfileEditing(true); }} className="text-xs font-bold text-[#64748B] hover:text-[#0242D7]">Editar perfil</button></div><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} maxLength={2000} placeholder="O que você quer compartilhar com a comunidade?" className="w-full resize-none rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#172334] outline-none focus:border-[#0242D7]" /><details className="mt-2 relative"><summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-[#DCE5F0] bg-white px-3 py-2 text-sm font-bold text-[#475569]">😊 Emoji</summary><div className="mt-2 flex max-w-[420px] flex-wrap gap-1 rounded-xl border border-[#DCE5F0] bg-white p-2 shadow-lg">{COMMON_EMOJIS.map((item) => <button key={item} type="button" onClick={(event) => { event.preventDefault(); const next = body + item; setBody(next); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="h-8 w-8 rounded text-lg hover:bg-[#F0F5FF]" aria-label="Adicionar emoji">{item}</button>)}</div></details>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)} className="rounded-xl border border-[#DCE5F0] bg-white px-3 py-2.5 text-sm text-[#334155]">
                    <option value="">Curso (opcional)</option>
                    {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                  </select>
                  <select value={selectedDiscipline} onChange={(event) => setSelectedDiscipline(event.target.value)} disabled={!disciplines.length} className="rounded-xl border border-[#DCE5F0] bg-white px-3 py-2.5 text-sm text-[#334155]">
                    <option value="">Disciplina (opcional)</option>
                    {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}
                  </select>
                  <select value={selectedTopic} onChange={(event) => setSelectedTopic(event.target.value)} disabled={!topics.length} className="rounded-xl border border-[#DCE5F0] bg-white px-3 py-2.5 text-sm text-[#334155]">
                    <option value="">Tópico (opcional)</option>
                    {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#DCE5F0] px-3 py-2 text-xs font-extrabold text-[#334155] hover:border-[#0242D7] hover:text-[#0242D7]">
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onImageChange} className="sr-only" />
                    Adicionar imagem
                  </label>
                  {imageFile && <span className="max-w-[230px] truncate text-xs font-semibold text-[#64748B]">{imageFile.name}</span>}
                  <button type="button" onClick={publish} disabled={publishing || (!body.trim() && !imageFile)} className="ml-auto rounded-xl bg-[#0242D7] px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{publishing ? "Publicando…" : "Publicar"}</button>
                </div>
                {error && <p className="mt-3 text-xs font-bold text-[#B42318]" role="alert">{error}</p>}
              </div>
            </div>
          </section>

          {loading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-[#F3F6FA]" />
          ) : posts.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-[#C8D4E2] bg-white p-10 text-center">
              <p className="text-sm font-black text-[#172334]">A comunidade está começando agora.</p>
              <p className="mt-2 text-sm leading-6 text-[#687688]">Seja o primeiro a compartilhar uma dica, uma dúvida ou um avanço nos estudos.</p>
            </section>
          ) : posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-[#DCE5F0] bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.04)]">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#EAF1FF] text-xs font-black text-[#0242D7]">{post.author_id === currentUserId && avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : post.author_id === currentUserId ? "EM" : "E"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[#172334]">{post.author_id === currentUserId ? profileName : "Estudante Ensina-me"}</p>
                    <span className="text-xs text-[#94A3B8]">· {new Date(post.created_at).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  {(post.courses?.name || post.disciplines?.name || post.topics?.name) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[post.courses?.name, post.disciplines?.name, post.topics?.name].filter(Boolean).map((tag) => <span key={tag} className="rounded-full bg-[#F0F5FF] px-2.5 py-1 text-[11px] font-extrabold text-[#0242D7]">{tag}</span>)}
                    </div>
                  )}
                  <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[#334155]">{post.body}</p>
                  {post.image_url && <img src={post.image_url} alt="Imagem compartilhada por um estudante" className="mt-4 max-h-[560px] w-full rounded-xl border border-[#E2E8F0] object-contain" loading="lazy" />}
                  <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-[#EEF2F6] pt-3">
                    <button type="button" onClick={() => void toggleLike(post.id)} className={liked.has(post.id) ? "rounded-lg bg-[#EAF1FF] px-3 py-2 text-xs font-black text-[#0242D7]" : "rounded-lg px-3 py-2 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"}>♥ {likeCounts[post.id] ?? 0}</button>
                    <button type="button" onClick={() => void loadComments(post.id)} className="rounded-lg px-3 py-2 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">Responder</button>
                    <button type="button" onClick={() => void toggleSave(post.id)} className={saved.has(post.id) ? "rounded-lg bg-[#F1F5F9] px-3 py-2 text-xs font-black text-[#172334]" : "rounded-lg px-3 py-2 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"}>{saved.has(post.id) ? "Salvo" : "Salvar"}</button>
                  </div>
                  {post.author_id === currentUserId && <button type="button" onClick={() => void deletePost(post.id)} className="mt-2 text-xs font-bold text-[#B42318] hover:underline">Excluir publicação</button>}
                  {comments[post.id] && (
                    <div className="mt-3 space-y-3 rounded-xl bg-[#F8FAFC] p-3">
                      {comments[post.id].map((comment) => <div key={comment.id}><div className="flex items-center gap-2"><div className="h-7 w-7 overflow-hidden rounded-full bg-[#EAF1FF] text-[9px] font-black text-[#0242D7]">{comment.authorAvatar ? <img src={comment.authorAvatar} alt="" className="h-full w-full object-cover" /> : "E"}</div><p className="text-[11px] font-black text-[#172334]">{comment.authorName ?? "Estudante Ensina-me"}</p></div><p className="mt-1 text-sm leading-6 text-[#475569]">{comment.body}</p></div>)}
                      <div className="flex gap-2">
                        <input value={commentInput[post.id] ?? ""} onChange={(event) => setCommentInput((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={1000} placeholder="Escreva uma resposta…" className="min-w-0 flex-1 rounded-lg border border-[#DCE5F0] bg-white px-3 py-2 text-sm outline-none focus:border-[#0242D7]" /><details className="relative"><summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-lg border border-[#DCE5F0] bg-white px-3 text-lg" aria-label="Adicionar emoji">😊</summary><div className="absolute bottom-12 right-0 z-20 flex w-[280px] flex-wrap gap-1 rounded-xl border border-[#DCE5F0] bg-white p-2 shadow-xl">{COMMON_EMOJIS.map((item) => <button key={item} type="button" onClick={(event) => { event.preventDefault(); setCommentInput((current) => ({ ...current, [post.id]: (current[post.id] ?? "") + item })); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="h-8 w-8 rounded text-lg hover:bg-[#F0F5FF]" aria-label="Adicionar emoji">{item}</button>)}</div></details>
                        <button type="button" onClick={() => void addComment(post.id)} className="rounded-lg bg-[#0242D7] px-3 py-2 text-xs font-black text-white">Enviar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[100px] rounded-2xl border border-[#DCE5F0] bg-[#F8FAFC] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Comunidade Ensina-me</p>
            <h2 className="mt-2 text-lg font-black text-[#172334]">Conhecimento antes de popularidade.</h2>
            <p className="mt-2 text-sm leading-6 text-[#687688]">As publicações podem ser conectadas a curso, disciplina e tópico para que uma conversa leve diretamente ao estudo.</p>
            <div className="mt-4 space-y-2 text-xs font-bold text-[#475569]">
              <p>• Dicas e métodos de estudo</p>
              <p>• Dúvidas e explicações</p>
              <p>• Trabalhos e projetos</p>
              <p>• Resumos e descobertas</p>
              <p>• Imagens e prints de estudo</p>
            </div>
          </div>
        </aside>
      </div>
      {profileEditing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4"><div className="w-full max-w-md rounded-2xl border border-[#DCE5F0] bg-white p-6 shadow-2xl"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#0242D7]">Seu perfil</p><h2 className="mt-2 text-2xl font-black text-[#172334]">Personalize como você aparece na comunidade.</h2><label className="mt-5 block text-sm font-bold text-[#334155]">Nome<input value={profileNameDraft} onChange={(e) => setProfileNameDraft(e.target.value)} maxLength={60} className="mt-2 h-11 w-full rounded-lg border border-[#D3DEEA] px-3 outline-none focus:border-[#0242D7]" /></label><label className="mt-4 block text-sm font-bold text-[#334155]">Foto de perfil<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" /></label><p className="mt-2 text-xs text-[#64748B]">JPG, PNG ou WebP · até 5 MB.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setProfileEditing(false)} className="rounded-lg border border-[#D3DEEA] px-4 py-2 text-sm font-bold text-[#56667A]">Cancelar</button><button type="button" onClick={() => void saveProfile()} disabled={profileSaving} className="rounded-lg bg-[#0242D7] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{profileSaving ? "Salvando…" : "Salvar perfil"}</button></div></div></div>}
    </section>
  );
}
