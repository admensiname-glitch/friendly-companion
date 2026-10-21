import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/comunidade")({ component: CommunityPage });

type Course = { id: string; name: string };
type Discipline = { id: string; name: string; course_id: string };
type Topic = { id: string; name: string; discipline_id: string };
type SharedTutorVisualAid = {
  enabled: boolean;
  type: "flow" | "concept_map" | "comparison";
  title: string;
  items: string[];
  caption: string;
};

type SharedTutorMedia = {
  imageUrl: string | null;
  imageAlt: string | null;
  imageSourceUrl: string | null;
  imageLicense: string | null;
  imageAttribution: string | null;
  visualAid: SharedTutorVisualAid | null;
  videoUrl: string | null;
  videoEmbedUrl: string | null;
  videoTitle: string | null;
  videoDescription: string | null;
  videoChannelName: string | null;
  videoDurationLabel: string | null;
  videoReason: string | null;
};

type Post = {
  id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  tutor_image_url: string | null;
  tutor_image_alt: string | null;
  tutor_image_source_url: string | null;
  tutor_image_license: string | null;
  tutor_image_attribution: string | null;
  tutor_visual_aid: SharedTutorVisualAid | null;
  tutor_video_url: string | null;
  tutor_video_embed_url: string | null;
  tutor_video_title: string | null;
  tutor_video_description: string | null;
  tutor_video_channel_name: string | null;
  tutor_video_duration_label: string | null;
  tutor_video_reason: string | null;
  created_at: string;
  course_id: string | null;
  discipline_id: string | null;
  topic_id: string | null;
  is_official: boolean;
  official_until: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_is_verified: boolean;
  courses?: { name: string } | null;
  disciplines?: { name: string } | null;
  topics?: { name: string } | null;
};

function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function safeYouTubeEmbedUrl(value: string | null | undefined): string | null {
  const safeUrl = safeHttpsUrl(value);
  if (!safeUrl) return null;
  try {
    const parsed = new URL(safeUrl);
    const allowedHost = ["youtube.com", "www.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(parsed.hostname);
    return allowedHost && /^\/embed\/[A-Za-z0-9_-]+$/.test(parsed.pathname) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function parseSharedTutorVisualAid(value: string | null): SharedTutorVisualAid | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SharedTutorVisualAid>;
    if (
      parsed.enabled !== true ||
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.items) ||
      !parsed.items.every((item) => typeof item === "string") ||
      (parsed.type !== "flow" && parsed.type !== "concept_map" && parsed.type !== "comparison")
    ) return null;
    return {
      enabled: true,
      type: parsed.type as SharedTutorVisualAid["type"],
      title: parsed.title.slice(0, 200),
      items: parsed.items.slice(0, 20).map((item) => item.slice(0, 500)),
      caption: typeof parsed.caption === "string" ? parsed.caption.slice(0, 1000) : "",
    };
  } catch {
    return null;
  }
}
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
  const [sharedTutorMedia, setSharedTutorMedia] = useState<SharedTutorMedia | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
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
    if (!userId) {
      setError("Sua sessão expirou. Entre novamente.");
      setLoading(false);
      return;
    }

    const nowIso = new Date().toISOString();
    const [profileResult, postResult, officialResult, likeResult, saveResult, courseResult] = await Promise.all([
      supabase.from("student_profiles").select("course_id,display_name,avatar_url").eq("user_id", userId).maybeSingle(),
      supabase
        .from("community_posts")
        .select("id,author_id,body,image_url,tutor_image_url,tutor_image_alt,tutor_image_source_url,tutor_image_license,tutor_image_attribution,tutor_visual_aid,tutor_video_url,tutor_video_embed_url,tutor_video_title,tutor_video_description,tutor_video_channel_name,tutor_video_duration_label,tutor_video_reason,created_at,course_id,discipline_id,topic_id,is_official,official_until,author_display_name,author_avatar_url,author_is_verified,courses(name),disciplines(name),topics(name)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("community_posts")
        .select("id,author_id,body,image_url,tutor_image_url,tutor_image_alt,tutor_image_source_url,tutor_image_license,tutor_image_attribution,tutor_visual_aid,tutor_video_url,tutor_video_embed_url,tutor_video_title,tutor_video_description,tutor_video_channel_name,tutor_video_duration_label,tutor_video_reason,created_at,course_id,discipline_id,topic_id,is_official,official_until,author_display_name,author_avatar_url,author_is_verified,courses(name),disciplines(name),topics(name)")
        .eq("is_official", true)
        .gt("official_until", nowIso)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("community_likes").select("post_id").eq("user_id", userId),
      supabase.from("community_saves").select("post_id").eq("user_id", userId),
      supabase.from("courses").select("id,name").eq("published", true).order("name"),
    ]);

    if (postResult.error || officialResult.error || likeResult.error || saveResult.error || courseResult.error) {
      setError("Não foi possível carregar a comunidade agora.");
      setLoading(false);
      return;
    }

    const mergedPosts = [...((officialResult.data ?? []) as unknown as Post[]), ...((postResult.data ?? []) as unknown as Post[])];
    const uniquePosts = Array.from(new Map(mergedPosts.map((post) => [post.id, post])).values());
    const nextPosts = uniquePosts.sort((a, b) => {
      const aPriority = a.is_official && !!a.official_until && new Date(a.official_until).getTime() > Date.now();
      const bPriority = b.is_official && !!b.official_until && new Date(b.official_until).getTime() > Date.now();
      if (aPriority !== bPriority) return aPriority ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setPosts(nextPosts);
    setLiked(new Set((likeResult.data ?? []).map((item) => item.post_id)));
    setSaved(new Set((saveResult.data ?? []).map((item) => item.post_id)));
    setCourses((courseResult.data ?? []) as Course[]);
    const urlParams = new URLSearchParams(window.location.search);
    const sharedCourseId = urlParams.get("course_id");
    const profileCourseId = profileResult.data?.course_id ?? "";
    setSelectedCourse(sharedCourseId || profileCourseId);
    const sessionUser = sessionData.session?.user;
    const authName = sessionUser?.user_metadata?.full_name?.trim() || sessionUser?.user_metadata?.name?.trim();
    setProfileName(profileResult.data?.display_name?.trim() || authName || "Seu perfil");
    setAvatarUrl(profileResult.data?.avatar_url ?? null);

    // Show the feed as soon as the posts and personal state are ready.
    setLoading(false);
    if (nextPosts.length) {
      const ids = nextPosts.map((post) => post.id);
      const { data: likes } = await supabase.from("community_likes").select("post_id").in("post_id", ids);
      const counts: Record<string, number> = {};
      for (const like of likes ?? []) counts[like.post_id] = (counts[like.post_id] ?? 0) + 1;
      setLikeCounts(counts);
    }
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
      if (courseId) setSelectedCourse(courseId);
      setSelectedDiscipline(disciplineId ?? "");
      setSelectedTopic(topicId ?? "");
      setError(null);
    }

    if (params.get("share_tutor") === "1") {
      const imageUrl = safeHttpsUrl(params.get("share_image_url"));
      const videoUrl = safeHttpsUrl(params.get("share_video_url"));
      const videoEmbedUrl = safeYouTubeEmbedUrl(params.get("share_video_embed_url"));
      const visualAid = parseSharedTutorVisualAid(params.get("share_visual_aid"));
      const hasTutorMedia = !!(imageUrl || visualAid || videoEmbedUrl || videoUrl);
      if (hasTutorMedia) {
        setSharedTutorMedia({
          imageUrl,
          imageAlt: params.get("share_image_alt")?.slice(0, 300) ?? null,
          imageSourceUrl: safeHttpsUrl(params.get("share_image_source_url")),
          imageLicense: params.get("share_image_license")?.slice(0, 200) ?? null,
          imageAttribution: params.get("share_image_attribution")?.slice(0, 300) ?? null,
          visualAid,
          videoUrl,
          videoEmbedUrl,
          videoTitle: params.get("share_video_title")?.slice(0, 300) ?? null,
          videoDescription: params.get("share_video_description")?.slice(0, 1000) ?? null,
          videoChannelName: params.get("share_video_channel")?.slice(0, 200) ?? null,
          videoDurationLabel: params.get("share_video_duration")?.slice(0, 50) ?? null,
          videoReason: params.get("share_video_reason")?.slice(0, 1000) ?? null,
        });
      }
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
    const name = profileName.trim();
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
      const { error: updateError } = await supabase.from("student_profiles").update({ avatar_url: nextAvatar }).eq("user_id", currentUserId);
      if (updateError) throw updateError;
      setAvatarUrl(nextAvatar);
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
        detail: { displayName: profileName, avatarUrl: nextAvatar },
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
    if (!text && !imageFile && !sharedTutorMedia) return;
    const maxBodyLength = sharedTutorMedia ? 12000 : 2000;
    if (text.length > maxBodyLength) {
      setError(`A publicação pode ter no máximo ${maxBodyLength.toLocaleString("pt-BR")} caracteres.`);
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
        body: text || (sharedTutorMedia ? "Compartilhei uma explicação do Tutor Ensina-me." : "Compartilhei uma imagem de estudo."),
        image_path: imagePath,
        image_url: imageUrl,
        tutor_image_url: sharedTutorMedia?.imageUrl ?? null,
        tutor_image_alt: sharedTutorMedia?.imageAlt ?? null,
        tutor_image_source_url: sharedTutorMedia?.imageSourceUrl ?? null,
        tutor_image_license: sharedTutorMedia?.imageLicense ?? null,
        tutor_image_attribution: sharedTutorMedia?.imageAttribution ?? null,
        tutor_visual_aid: sharedTutorMedia?.visualAid ?? null,
        tutor_video_url: sharedTutorMedia?.videoUrl ?? null,
        tutor_video_embed_url: sharedTutorMedia?.videoEmbedUrl ?? null,
        tutor_video_title: sharedTutorMedia?.videoTitle ?? null,
        tutor_video_description: sharedTutorMedia?.videoDescription ?? null,
        tutor_video_channel_name: sharedTutorMedia?.videoChannelName ?? null,
        tutor_video_duration_label: sharedTutorMedia?.videoDurationLabel ?? null,
        tutor_video_reason: sharedTutorMedia?.videoReason ?? null,
        course_id: selectedCourse || null,
        discipline_id: selectedDiscipline || null,
        topic_id: selectedTopic || null,
      });
      if (insertError) throw insertError;

      setBody("");
      setImageFile(null);
      setSharedTutorMedia(null);
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
          name: profile.display_name?.trim() || "Estudante",
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
                <div className="mb-3 flex items-center gap-2"><button type="button" onClick={() => { setProfileNameDraft(profileName); setProfileEditing(true); }} className="text-sm font-black text-[#172334] hover:text-[#0242D7]">{profileName}</button>{currentUserId === "bcebd090-39ae-4b5f-a641-3b0ac648c1d9" && <span title="Conta oficial do Ensina-me" aria-label="Conta oficial verificada" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] text-[10px] font-black text-white">✓</span>}<button type="button" onClick={() => { setProfileNameDraft(profileName); setProfileEditing(true); }} className="text-xs font-bold text-[#64748B] hover:text-[#0242D7]">Alterar foto</button></div><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} maxLength={sharedTutorMedia ? 12000 : 2000} placeholder="O que você quer compartilhar com a comunidade?" className="w-full resize-none rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#172334] outline-none focus:border-[#0242D7]" /><details className="mt-2 relative"><summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-[#DCE5F0] bg-white px-3 py-2 text-sm font-bold text-[#475569]">😊 Emoji</summary><div className="mt-2 flex max-w-[420px] flex-wrap gap-1 rounded-xl border border-[#DCE5F0] bg-white p-2 shadow-lg">{COMMON_EMOJIS.map((item) => <button key={item} type="button" onClick={(event) => { event.preventDefault(); const next = body + item; setBody(next); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="h-8 w-8 rounded text-lg hover:bg-[#F0F5FF]" aria-label="Adicionar emoji">{item}</button>)}</div></details>
                {sharedTutorMedia && (
                  <div className="mt-3 rounded-xl border border-[#CFE0FF] bg-[#F4F8FF] p-3">
                    <p className="text-xs font-black text-[#0242D7]">Explicação do Tutor anexada</p>
                    <p className="mt-1 text-xs leading-5 text-[#475569]">
                      {sharedTutorMedia.imageUrl ? "Imagem incluída · " : ""}
                      {sharedTutorMedia.visualAid ? "Apoio visual incluído · " : ""}
                      {sharedTutorMedia.videoEmbedUrl ? "Vídeo com player incluído" : "Mídia do Tutor pronta para publicar"}
                    </p>
                    {sharedTutorMedia.imageUrl && <img src={sharedTutorMedia.imageUrl} alt={sharedTutorMedia.imageAlt || "Imagem da explicação do Tutor"} className="mt-3 max-h-48 rounded-lg border border-[#DCE5F0] bg-white object-contain" />}
                    {sharedTutorMedia.videoTitle && <p className="mt-2 text-xs font-bold text-[#334155]">{sharedTutorMedia.videoTitle}</p>}
                    <button type="button" onClick={() => setSharedTutorMedia(null)} className="mt-2 text-xs font-bold text-[#B42318] hover:underline">Remover anexos do Tutor</button>
                  </div>
                )}
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
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#EAF1FF] text-xs font-black text-[#0242D7]">{post.author_id === currentUserId ? (avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (profileName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "EM")) : post.author_avatar_url ? <img src={post.author_avatar_url} alt="" className="h-full w-full object-cover" /> : "E"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[#172334]">{post.author_id === currentUserId ? (profileName.trim() || "Seu perfil") : (post.author_display_name || "Estudante Ensina-me")}</p>{post.author_is_verified && <span title="Conta oficial do Ensina-me" aria-label="Conta oficial verificada" className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-[10px] font-black text-white">✓</span>}{post.is_official && post.official_until && new Date(post.official_until).getTime() > Date.now() && <span className="rounded-full bg-[#EAF1FF] px-2 py-0.5 text-[10px] font-black text-[#0242D7]">Atualização oficial</span>}
                    <span className="text-xs text-[#94A3B8]">· {new Date(post.created_at).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  {(post.courses?.name || post.disciplines?.name || post.topics?.name) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[post.courses?.name, post.disciplines?.name, post.topics?.name].filter(Boolean).map((tag) => <span key={tag} className="rounded-full bg-[#F0F5FF] px-2.5 py-1 text-[11px] font-extrabold text-[#0242D7]">{tag}</span>)}
                    </div>
                  )}
                  <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[#334155]">{post.body}</p>
                  {post.image_url && <img src={post.image_url} alt="Imagem compartilhada por um estudante" className="mt-4 max-h-[560px] w-full rounded-xl border border-[#E2E8F0] object-contain" loading="lazy" />}
                  {post.tutor_visual_aid?.enabled && (
                    <section className="mt-4 overflow-hidden rounded-xl border border-[#CFE0FF] bg-[#F8FAFC]">
                      <div className="border-b border-[#E3ECFA] bg-[#F4F8FF] px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Apoio visual do Tutor</p>
                        <h3 className="mt-1 text-sm font-black text-[#172334]">{post.tutor_visual_aid.title}</h3>
                      </div>
                      {safeHttpsUrl(post.tutor_image_url) && (
                        <figure className="p-3 sm:p-4">
                          <img src={safeHttpsUrl(post.tutor_image_url)!} alt={post.tutor_image_alt || post.tutor_visual_aid.title} className="max-h-[560px] w-full rounded-lg border border-[#E2E8F0] bg-white object-contain" loading="lazy" referrerPolicy="no-referrer" />
                          {(post.tutor_image_attribution || post.tutor_image_license || post.tutor_image_source_url) && (
                            <figcaption className="mt-2 flex flex-wrap items-center gap-2 text-[11px] leading-5 text-[#64748B]">
                              {post.tutor_image_attribution && <span>{post.tutor_image_attribution}</span>}
                              {post.tutor_image_license && <span>· {post.tutor_image_license}</span>}
                              {safeHttpsUrl(post.tutor_image_source_url) && <a href={safeHttpsUrl(post.tutor_image_source_url)!} target="_blank" rel="noreferrer" className="font-bold text-[#0242D7] hover:underline">Fonte da imagem</a>}
                            </figcaption>
                          )}
                        </figure>
                      )}
                      {post.tutor_visual_aid.items.length > 0 && (
                        <div className="px-4 pb-4">
                          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#687688]">Etapas principais</p>
                          {post.tutor_visual_aid.type === "comparison" ? (
                            <div className="grid gap-2 sm:grid-cols-2">{post.tutor_visual_aid.items.map((item, index) => <div key={item + index} className="rounded-lg border border-[#DCE5F0] bg-white p-3 text-sm leading-6 text-[#334155]">{item}</div>)}</div>
                          ) : (
                            <ol className="space-y-2">{post.tutor_visual_aid.items.map((item, index) => <li key={item + index} className="flex gap-3 rounded-lg border border-[#DCE5F0] bg-white px-3 py-3 text-sm leading-6 text-[#334155]"><span className="font-black text-[#0242D7]">{index + 1}.</span><span>{item}</span></li>)}</ol>
                          )}
                        </div>
                      )}
                      {post.tutor_visual_aid.caption && <p className="px-4 pb-4 text-xs leading-5 text-[#687688]">{post.tutor_visual_aid.caption}</p>}
                    </section>
                  )}
                  {(post.tutor_video_embed_url || post.tutor_video_url) && (
                    <section className="mt-4 overflow-hidden rounded-xl border border-[#DCE5F0] bg-[#F8FAFC]">
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Vídeo recomendado pelo Tutor</p>
                        <h3 className="mt-1 text-sm font-black text-[#172334]">{post.tutor_video_title || "Vídeo relacionado à explicação"}</h3>
                        {post.tutor_video_channel_name && <p className="mt-1 text-xs text-[#64748B]">{post.tutor_video_channel_name}{post.tutor_video_duration_label ? " · " + post.tutor_video_duration_label : ""}</p>}
                        {post.tutor_video_reason && <p className="mt-2 text-sm leading-6 text-[#475569]">{post.tutor_video_reason}</p>}
                      </div>
                      {safeYouTubeEmbedUrl(post.tutor_video_embed_url) && (
                        <div className="aspect-video w-full bg-black">
                          <iframe src={safeYouTubeEmbedUrl(post.tutor_video_embed_url)!} title={post.tutor_video_title || "Vídeo recomendado pelo Tutor"} className="h-full w-full" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                        </div>
                      )}
                      {safeHttpsUrl(post.tutor_video_url) && <a href={safeHttpsUrl(post.tutor_video_url)!} target="_blank" rel="noreferrer" className="inline-flex px-4 py-3 text-xs font-black text-[#0242D7] hover:underline">Abrir vídeo no YouTube</a>}
                      {post.tutor_video_description && <p className="px-4 pb-4 text-xs leading-5 text-[#64748B]">{post.tutor_video_description}</p>}
                    </section>
                  )}
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
      {profileEditing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4"><div className="w-full max-w-md rounded-2xl border border-[#DCE5F0] bg-white p-6 shadow-2xl"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#0242D7]">Seu perfil</p><h2 className="mt-2 text-2xl font-black text-[#172334]">Atualize sua foto de perfil.</h2><label className="mt-5 block text-sm font-bold text-[#334155]">Foto de perfil<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" /></label><p className="mt-2 text-xs text-[#64748B]">JPG, PNG ou WebP · até 5 MB.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setProfileEditing(false)} className="rounded-lg border border-[#D3DEEA] px-4 py-2 text-sm font-bold text-[#56667A]">Cancelar</button><button type="button" onClick={() => void saveProfile()} disabled={profileSaving} className="rounded-lg bg-[#0242D7] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{profileSaving ? "Salvando…" : "Salvar perfil"}</button></div></div></div>}
    </section>
  );
}
