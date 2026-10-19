import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LearningEngine, type StudyRecommendation } from "@/lib/learning-engine";
import { retryDelayMs } from "@/lib/tutor-retry-policy";
import { normalizeTutorOptionText } from "@/lib/tutor-comprehension-check";

export const Route = createFileRoute("/app/tutor")({ component: TutorPage });
// Tutor integrado ao percurso do aluno — próximo passo personalizado vem do backend.

type VisualAid = {
  enabled: boolean;
  type: "flow" | "concept_map" | "comparison";
  title: string;
  items: string[];
  caption: string;
  image?: {
    enabled: boolean;
    url: string;
    title: string;
    sourceUrl: string;
    license: string;
    attribution: string;
  } | null;
};

type MicroAssessment = {
  id: string;
  question: string;
  options: string[];
  difficulty: "introductory" | "intermediate" | "advanced";
  concept_tags: string[];
  revealed: boolean;
  answered: boolean;
  selectedOptionIndex?: number;
  isCorrect?: boolean;
  correctOptionIndex?: number;
  explanation?: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  shareable?: boolean;
  visualAid?: VisualAid | null;
  videoRecommendation?: {
    enabled: boolean;
    reason: string;
    video?: TopicVideo | null;
  } | null;
  microAssessment?: MicroAssessment | null;
  microAssessmentLoading?: boolean;
  microAssessmentError?: string | null;
  learningNextStep?: unknown;
};

type TopicVideo = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  embed_url: string;
  channel_name: string | null;
  duration_label: string | null;
};

function TutorMessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const renderInline = (value: string) =>
    value.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
        : <span key={partIndex}>{part}</span>
    );

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;
        const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
        const bullet = trimmed.match(/^[-•]\s+(.+)$/);
        const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);

        if (heading) {
          return <p key={index} className="pt-1 font-black text-[#172334]">{renderInline(heading[1])}</p>;
        }
        if (bullet) {
          return <div key={index} className="flex gap-2 pl-1"><span aria-hidden="true">•</span><span>{renderInline(bullet[1])}</span></div>;
        }
        if (numbered) {
          return <div key={index} className="flex gap-2 pl-1"><span className="font-bold">{numbered[1]}.</span><span>{renderInline(numbered[2])}</span></div>;
        }
        return <p key={index}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}


function getClientVisualFallback(request: string, response: string): VisualAid | null {
  const text = `${request} ${response}`.toLowerCase();
  const asksForVisual = /(imagem|visual|diagrama|figura|esquema)/.test(text);
  const isPhotosynthesis = /(fotossíntese|fotossintese|photosynthesis)/.test(text);
  if (!asksForVisual || !isPhotosynthesis) return null;

  return {
    enabled: true,
    type: "flow",
    title: "Processo da fotossíntese",
    items: [
      "A planta capta água pelas raízes e dióxido de carbono do ar.",
      "A luz solar fornece energia para as reações fotossintéticas.",
      "Nas folhas, a clorofila participa da conversão dessa energia.",
      "A planta produz glicose e libera oxigênio como resultado do processo.",
    ],
    caption: "Imagem pública em CC0, usada como apoio didático.",
    image: {
      enabled: true,
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Photosynthesis%20pt.svg?width=1280",
      title: "Diagrama com o processo geral da fotossíntese",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Photosynthesis_pt.svg",
      license: "CC BY-SA 4.0",
      attribution: "Wikimedia Commons",
    },
  };
}

function TutorPage() {
  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseNames, setCourseNames] = useState<string[]>([]);
  const [answeringAssessmentId, setAnsweringAssessmentId] = useState<string | null>(null);

  async function downloadVisualImage(image: NonNullable<VisualAid["image"]>) {
    try {
      const response = await fetch(image.url, { mode: "cors" });
      if (!response.ok) throw new Error("download_failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = image.title.replace(/[^a-z0-9áàâãéêíóôõúçñ_-]+/gi, "-").replace(/-+/g, "-").toLowerCase() || "apoio-visual";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(image.url, "_blank", "noopener,noreferrer");
    }
  }

  function VideoRecommendation({ recommendation }: { recommendation: NonNullable<Message["videoRecommendation"]> }) {
    const video = recommendation.video;
    if (!recommendation.enabled || !video) return null;

    return (
      <div className="mt-5 rounded-2xl border border-[#DCE5F0] bg-white p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Vídeo recomendado</p>
        <h3 className="mt-1 text-sm font-black text-[#172334]">Quer aprofundar exatamente o que você perguntou?</h3>
        {recommendation.reason && (
          <p className="mt-2 text-xs leading-5 text-[#687688]">{recommendation.reason}</p>
        )}
        <article className="mt-4 overflow-hidden rounded-xl border border-[#E3EAF3] bg-[#F8FAFC]">
          <div className="aspect-video bg-black">
            <iframe
              src={video.embed_url}
              title={video.title}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="p-4">
            <p className="text-sm font-black text-[#172334]">{video.title}</p>
            {(video.channel_name || video.duration_label) && (
              <p className="mt-1 text-xs text-[#687688]">
                {[video.channel_name, video.duration_label].filter(Boolean).join(" · ")}
              </p>
            )}
            {video.description && (
              <p className="mt-2 text-xs leading-5 text-[#687688]">{video.description}</p>
            )}
            <a
              href={video.video_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-xs font-black text-[#0242D7] hover:underline"
            >
              Abrir vídeo na fonte original ↗
            </a>
          </div>
        </article>
      </div>
    );
  }

  function VisualAidCard({ visualAid }: { visualAid: VisualAid }) {
    if (!visualAid.enabled) return null;

    return (
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#CFE0FF] bg-white">
        <div className="border-b border-[#E3ECFA] bg-[#F4F8FF] px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Apoio visual</p>
          <h3 className="mt-1 text-sm font-black text-[#172334]">{visualAid.title}</h3>
        </div>

        <div className="p-4 sm:p-5">
          {visualAid.image?.enabled && visualAid.image.url && (
            <figure className="overflow-hidden rounded-xl border border-[#DCE5F0] bg-white">
              <div className="flex min-h-[280px] items-center justify-center bg-[#F8FAFC] p-2 sm:min-h-[440px]">
                <img
                  src={visualAid.image.url}
                  alt={visualAid.image.title || visualAid.title}
                  className="block max-h-[680px] w-full object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              <figcaption className="border-t border-[#E5EAF0] px-3 py-2 text-[11px] leading-5 text-[#687688]">
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{visualAid.image.attribution} · {visualAid.image.license}</span>
                </span>
                <span className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void downloadVisualImage(visualAid.image!)}
                    className="font-black text-[#0242D7] hover:underline"
                  >
                    Baixar imagem
                  </button>
                  <a
                  href={visualAid.image.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#0242D7] hover:underline"
                >
                    Fonte da imagem
                  </a>
                </span>
              </figcaption>
            </figure>
          )}

          {visualAid.items.length > 0 && (
            <div className={visualAid.image?.enabled ? "mt-5" : ""}>
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#687688]">
                Etapas principais
              </p>
              {visualAid.type === "comparison" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {visualAid.items.map((item, index) => (
                    <div
                      key={item + index}
                      className="rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] p-3 text-sm font-semibold leading-6 text-[#334155]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <ol className="space-y-2">
                  {visualAid.items.map((item, index) => (
                    <li
                      key={item + index}
                      className="flex gap-3 rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] px-3 py-3 text-sm leading-6 text-[#334155]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F0FF] text-xs font-black text-[#0242D7]">
                        {index + 1}
                      </span>
                      <span className="font-semibold">{item}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {visualAid.caption && (
            <p className="mt-4 text-xs leading-5 text-[#687688]">{visualAid.caption}</p>
          )}
        </div>
      </div>
    );
  }

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setLoading(false);
        return;
      }

      // Render the Tutor shell immediately; personalize its context as data arrives.
      setLoading(false);

      // Recommendation and course membership do not depend on each other.
      const [recommendationData, membershipResult] = await Promise.all([
        LearningEngine.getRecommendation().catch(() => null),
        supabase.from("student_courses").select("course_id").order("created_at", { ascending: true }),
      ]);
      setRecommendation(recommendationData);

      const courseIds = (membershipResult.data ?? []).map((item) => item.course_id).filter(Boolean);
      if (courseIds.length > 0) {
        const [courseResult, firstDisciplineResult] = await Promise.all([
          supabase.from("courses").select("id, name").in("id", courseIds).eq("published", true).order("name", { ascending: true }),
          !recommendationData?.topic_id
            ? supabase.from("disciplines").select("id").in("course_id", courseIds).eq("published", true).order("curriculum_order", { ascending: true, nullsFirst: false }).limit(1)
            : Promise.resolve({ data: [] as Array<{ id: string }>, error: null }),
        ]);
        setCourseNames((courseResult.data ?? []).map((course) => course.name));

        if (recommendationData?.topic_id) {
          setTopicId(recommendationData.topic_id);
        } else {
          const disciplineId = firstDisciplineResult.data?.[0]?.id;
          // Let the Tutor shell become interactive before resolving optional fallback context.
          setLoading(false);
          if (disciplineId) {
            const { data: topics } = await supabase
              .from("topics")
              .select("id")
              .eq("discipline_id", disciplineId)
              .eq("published", true)
              .order("position", { ascending: true })
              .limit(1);
            setTopicId(topics?.[0]?.id ?? null);
          } else {
            setTopicId(null);
          }
        }
      } else {
        setCourseNames([]);
        setTopicId(recommendationData?.topic_id ?? null);
      }

      setLoading(false);
    })();
  }, []);

  const contextLabel = useMemo(
    () => recommendation?.topic_name
      ? `Estudando: ${recommendation.topic_name}${recommendation.discipline_name ? ` · ${recommendation.discipline_name}` : ""}`
      : courseNames.length
        ? `Seu percurso: ${courseNames.join(" · ")}. Escolha uma disciplina para aprofundar.`
        : "Adicione um curso ao seu perfil para começar a personalizar o Tutor.",
    [courseNames, recommendation],
  );

  async function answerMicroAssessment(
    messageIndex: number,
    assessment: MicroAssessment,
    selectedOptionIndex: number,
  ) {
    if (answeringAssessmentId || assessment.answered) return;

    setAnsweringAssessmentId(assessment.id);
    setError(null);

    let response: Awaited<ReturnType<typeof supabase.functions.invoke>>;
    try {
      response = await supabase.functions.invoke("ai-tutor", {
        body: {
          action: "answer_microassessment",
          micro_assessment_id: assessment.id,
          selected_option_index: selectedOptionIndex,
        },
      });
    } catch {
      setError("A correção demorou demais para responder. Tente novamente; sua resposta não foi confirmada.");
      setAnsweringAssessmentId(null);
      return;
    }
    const { data, error: invokeError } = response;

    if (invokeError || data?.error) {
      setError(data?.error ?? "Não foi possível registrar sua resposta. Tente novamente.");
      setAnsweringAssessmentId(null);
      return;
    }

    setMessages((current) => {
      const next = [...current];
      const currentMessage = next[messageIndex];
      if (!currentMessage?.microAssessment) return current;

      next[messageIndex] = {
        ...currentMessage,
        microAssessment: {
          ...currentMessage.microAssessment,
          revealed: true,
          answered: true,
          selectedOptionIndex,
          isCorrect: data.is_correct === true,
          correctOptionIndex: Number(data.correct_option_index),
          explanation: data.explanation ?? "",
        },
      };
      return next;
    });

    if (data.next_message) {
      setMessages((current) => [...current, { role: "assistant", content: data.next_message }]);
    }
    setAnsweringAssessmentId(null);

    // Keep the answer correction independent from generating the next question.
    if (data.mastery_level !== "mastered") {
      void (async () => {
        try {
          const { data: followUp, error: followUpError } = await supabase.functions.invoke("ai-tutor", {
            body: {
              action: "generate_next_microassessment",
              micro_assessment_id: assessment.id,
            },
          });
          if (followUpError || followUp?.error) {
            console.warn("[Ensina-me] Não foi possível preparar a próxima questão.", followUpError ?? followUp.error);
            return;
          }
          if (!followUp?.next_micro_assessment?.id) return;

          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              content: followUp.next_message ?? "Vamos continuar com uma nova questão.",
              microAssessment: {
                id: followUp.next_micro_assessment.id,
                question: followUp.next_micro_assessment.question,
                options: followUp.next_micro_assessment.options,
                difficulty: followUp.next_micro_assessment.difficulty,
                concept_tags: followUp.next_micro_assessment.concept_tags ?? [],
                revealed: false,
                answered: false,
              },
            },
          ]);
        } catch (followUpError) {
          console.warn("[Ensina-me] Falha ao preparar a próxima questão.", followUpError);
        }
      })();
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;
    if (!topicId) {
      setError("Abra um tópico de estudo primeiro para que o Tutor tenha contexto acadêmico.");
      return;
    }

    setSending(true);
    setError(null);
    setInput("");
    const userMessageId = crypto.randomUUID();
    setMessages((current) => [...current, { id: userMessageId, role: "user", content: message }]);

    let chatResponse: Awaited<ReturnType<typeof supabase.functions.invoke>>;
    try {
      chatResponse = await supabase.functions.invoke("ai-tutor", {
        body: {
          action: "chat",
          topic_id: topicId,
          message,
          conversation_id: conversationId,
        },
      });
    } catch {
      setError("A comunicação com o Tutor falhou. Sua mensagem não foi confirmada; tente enviá-la novamente.");
      setSending(false);
      return;
    }
    const { data, error: invokeError } = chatResponse;

    if (invokeError || data?.error) {
      setError(data?.error ?? "O Tutor não conseguiu responder agora. Tente novamente.");
    } else if (data?.message) {
      if (typeof data.conversation_id === "string" && data.conversation_id.trim()) {
        setConversationId(data.conversation_id);
      }

      const clientVisualFallback = getClientVisualFallback(message, data.message);
      const backendVisualAid = data.visual_aid as VisualAid | null | undefined;
      const visualAid = backendVisualAid
        ? {
            ...backendVisualAid,
            image: backendVisualAid.image ?? clientVisualFallback?.image ?? null,
          }
        : clientVisualFallback;

      const assistantMessageId = crypto.randomUUID();
      const needsQuestionFallback =
        data.should_generate_comprehension_check === true && !data.micro_assessment;

      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: "assistant",
          content: data.message,
          shareable: data.shareable === true,
          visualAid,
          videoRecommendation: data.video_recommendation ?? null,
          microAssessment: data.micro_assessment
            ? {
                ...data.micro_assessment,
                revealed: false,
                answered: false,
              }
            : null,
          microAssessmentLoading: needsQuestionFallback,
          microAssessmentError: null,
          learningNextStep: data.learning_next_step ?? null,
        },
      ]);

      // Keep the explanation visible while a missing comprehension check is generated separately.
      if (needsQuestionFallback) {
        void (async () => {
          const requestBody = {
            action: "generate_initial_microassessment",
            topic_id: topicId,
            conversation_id: data.conversation_id ?? conversationId,
            idempotency_key: userMessageId,
            message,
            answer_context: data.message,
          };
          let assessmentData: { micro_assessment?: Pick<MicroAssessment, "id" | "question" | "options" | "difficulty" | "concept_tags"> } | null = null;
          let errorMessage: string | null = null;

          for (let attempt = 0; attempt < 2; attempt += 1) {
            let result: Awaited<ReturnType<typeof supabase.functions.invoke>>;
            try {
              result = await supabase.functions.invoke("ai-tutor", { body: requestBody });
            } catch {
              errorMessage = "A comunicação com o Tutor falhou ao preparar a pergunta. Peça uma nova verificação para tentar novamente.";
              break;
            }
            if (!result.error && !result.data?.error && result.data?.micro_assessment?.id) {
              assessmentData = result.data;
              break;
            }

            let responseStatus: number | null = null;
            let retryAfterSeconds = 30;
            let providerErrorMessage: string | null = null;
            if (result.error && typeof result.error === "object" && "context" in result.error) {
              const errorContext = result.error.context;
              if (errorContext instanceof Response) {
                responseStatus = errorContext.status;
                const retryAfterHeader = Number(errorContext.headers.get("retry-after"));
                if (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0) {
                  retryAfterSeconds = Math.ceil(retryAfterHeader);
                }
                try {
                  const errorBody = await errorContext.clone().json() as {
                    error?: unknown;
                    retry_after_seconds?: unknown;
                  };
                  if (typeof errorBody.error === "string") providerErrorMessage = errorBody.error;
                  if (typeof errorBody.retry_after_seconds === "number" && errorBody.retry_after_seconds > 0) {
                    retryAfterSeconds = Math.ceil(errorBody.retry_after_seconds);
                  }
                } catch {
                  // Some gateway failures do not include a JSON response body.
                }
              }
            }

            if (responseStatus === 429 && attempt === 0) {
              errorMessage = `O serviço de IA atingiu o limite temporário. Vou tentar novamente em cerca de ${retryAfterSeconds} segundos.`;
              await new Promise((resolve) => setTimeout(resolve, retryDelayMs(retryAfterSeconds)));
              continue;
            }

            errorMessage = providerErrorMessage ?? result.data?.error ??
              (responseStatus === 429
                ? "O limite temporário de geração da IA continua ativo. Aguarde um minuto e tente novamente."
                : result.error ? "A comunicação com o Tutor falhou. Tente novamente em instantes." : "Não foi possível preparar a pergunta.");
            break;
          }

          setMessages((current) =>
            current.map((item) =>
              item.id !== assistantMessageId
                ? item
                : assessmentData?.micro_assessment
                  ? {
                      ...item,
                      microAssessmentLoading: false,
                      microAssessmentError: null,
                      microAssessment: {
                        ...assessmentData.micro_assessment,
                        revealed: false,
                        answered: false,
                      },
                    }
                  : {
                      ...item,
                      microAssessmentLoading: false,
                      microAssessmentError: errorMessage ??
                        "Não foi possível preparar uma pergunta inédita agora. Peça outra pergunta para tentar novamente.",
                    },
            ),
          );
        })();
      }
    }

    setSending(false);
  }

  return (
    <section className="mx-auto w-full max-w-5xl" aria-labelledby="tutor-title">
      <header className="border-b border-[#DCE5F0] pb-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0242D7]">Tutor</p>
        <h1 id="tutor-title" className="mt-2 text-[32px] font-black tracking-[-0.04em] text-[#172334] sm:text-[42px]">Aprenda com contexto.</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688]">
          O Tutor usa os cursos do seu perfil, seu percurso e seu desempenho para explicar, comparar, corrigir raciocínios e orientar a próxima prática.
        </p>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-[#DCE5F0] bg-white shadow-[0_8px_28px_rgba(15,23,42,.05)]">
          <div className="min-h-[360px] space-y-4 p-5 sm:p-7">
            {loading ? (
              <div className="h-24 animate-pulse rounded-xl bg-[#F3F6FA]" />
            ) : messages.length === 0 ? (
              <div className="max-w-xl">
                <p className="text-sm font-extrabold text-[#0242D7]">Comece pelo que você não entendeu.</p>
                <h2 className="mt-2 text-xl font-black text-[#172334]">Pergunte “por que eu errei?”, peça um exemplo ou compare dois conceitos.</h2>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div key={message.id ?? `${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-[#0242D7] px-4 py-3 text-sm leading-6 text-white" : message.visualAid?.enabled ? "w-full rounded-2xl border border-[#E1E8F0] bg-[#F8FAFC] px-4 py-4 text-sm leading-6 text-[#273547]" : "max-w-[90%] rounded-2xl border border-[#E1E8F0] bg-[#F8FAFC] px-4 py-3 text-sm leading-6 text-[#273547]"}>
                {message.role === "assistant" ? <TutorMessageContent content={message.content} /> : message.content}
                {message.role === "assistant" && message.visualAid?.enabled && (
                  <VisualAidCard visualAid={message.visualAid} />
                )}
                {message.role === "assistant" && message.videoRecommendation?.enabled && (
                  <VideoRecommendation recommendation={message.videoRecommendation} />
                )}
                {message.role === "assistant" && message.microAssessmentLoading && (
                  <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-[#CFE0FF] bg-white p-4 sm:p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Verificação de compreensão</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#334155]">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#CFE0FF] border-t-[#0242D7]" aria-hidden="true" />
                      Preparando uma pergunta inédita sobre esta explicação…
                    </p>
                  </div>
                )}
                {message.role === "assistant" && message.microAssessmentError && (
                  <div role="alert" className="mt-5 rounded-2xl border border-[#FECACA] bg-white p-4 text-sm text-[#B42318]">
                    {message.microAssessmentError}
                  </div>
                )}
                {message.role === "assistant" && message.microAssessment && (
                  <div className="mt-5 rounded-2xl border border-[#CFE0FF] bg-white p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">
                          Verificação de compreensão
                        </p>
                        <p className="mt-1 text-sm font-black text-[#172334]">
                          {message.microAssessment.answered
                            ? "Veja a correção e a explicação."
                            : message.microAssessment.revealed
                              ? "Escolha uma alternativa para conferir sua compreensão."
                              : "Uma pergunta rápida para verificar o que você aprendeu."}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#F4F8FF] px-2.5 py-1 text-[10px] font-black uppercase text-[#0242D7]">
                        {message.microAssessment.difficulty === "introductory"
                          ? "Inicial"
                          : message.microAssessment.difficulty === "advanced"
                            ? "Avançada"
                            : "Intermediária"}
                      </span>
                    </div>

                    {!message.microAssessment.revealed ? (
                      <button
                        type="button"
                        onClick={() =>
                          setMessages((current) =>
                            current.map((item, itemIndex) =>
                              item === message && itemIndex === index && item.microAssessment
                                ? {
                                    ...item,
                                    microAssessment: {
                                      ...item.microAssessment,
                                      revealed: true,
                                    },
                                  }
                                : item,
                            ),
                          )
                        }
                        className="mt-4 w-full rounded-xl bg-[#0242D7] px-4 py-3 text-sm font-black text-white transition hover:opacity-95"
                      >
                        Quero a pergunta
                      </button>
                    ) : (
                      <div className="mt-4">
                        <p className="text-sm font-black leading-6 text-[#172334]">
                          {message.microAssessment.question}
                        </p>

                        <div className="mt-3 space-y-2">
                          {message.microAssessment.options.map((option, optionIndex) => {
                            const selected = message.microAssessment?.selectedOptionIndex === optionIndex;
                            const correct = message.microAssessment?.correctOptionIndex === optionIndex;
                            const answered = message.microAssessment?.answered === true;

                            return (
                              <button
                                key={optionIndex}
                                type="button"
                                disabled={answered || answeringAssessmentId === message.microAssessment?.id}
                                onClick={() =>
                                  void answerMicroAssessment(index, message.microAssessment!, optionIndex)
                                }
                                className={
                                  "w-full rounded-xl border px-4 py-3 text-left text-sm leading-5 transition " +
                                  (answered && correct
                                    ? "border-[#1B9E77] bg-[#ECFDF5] text-[#166534]"
                                    : answered && selected && !correct
                                      ? "border-[#D92D20] bg-[#FEF3F2] text-[#B42318]"
                                      : "border-[#DCE5F0] bg-[#F8FAFC] text-[#334155] hover:border-[#0242D7] hover:bg-[#F4F8FF]")
                                }
                              >
                                <span className="mr-2 font-black">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>
                                {normalizeTutorOptionText(option)}
                              </button>
                            );
                          })}
                        </div>

                        {!message.microAssessment.answered && answeringAssessmentId === message.microAssessment.id && (
                          <div role="status" aria-live="polite" className="mt-4 flex items-center gap-2 rounded-xl border border-[#CFE0FF] bg-[#F4F8FF] px-4 py-3 text-sm font-semibold text-[#0242D7]">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#CFE0FF] border-t-[#0242D7]" aria-hidden="true" />
                            Corrigindo sua resposta…
                          </div>
                        )}

                        {message.microAssessment.answered && (
                          <div
                            className={
                              "mt-4 rounded-xl px-4 py-3 text-sm leading-6 " +
                              (message.microAssessment.isCorrect
                                ? "bg-[#ECFDF5] text-[#166534]"
                                : "bg-[#FEF3F2] text-[#B42318]")
                            }
                          >
                            <p className="font-black">
                              {message.microAssessment.isCorrect ? "Acertou." : "Ainda não."}
                            </p>
                            {message.microAssessment.explanation && (
                              <p className="mt-1">{message.microAssessment.explanation}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {message.role === "assistant" && message.learningNextStep?.enabled && (
                  <div className="mt-5 rounded-2xl border border-[#CFE0FF] bg-[#F4F8FF] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Próximo passo para você</p>
                    <p className="mt-1 text-sm font-black text-[#172334]">{message.learningNextStep.title}</p>
                    <p className="mt-2 text-xs leading-5 text-[#687688]">{message.learningNextStep.reason}</p>
                    <button type="button" onClick={() => setInput(message.learningNextStep.prompt)} className="mt-4 rounded-xl bg-[#0242D7] px-4 py-2.5 text-xs font-black text-white">
                      Praticar agora
                    </button>
                  </div>
                )}
                {message.role === "assistant" && message.shareable === true && (
                  <a
                    href={`/app/comunidade?share_text=${encodeURIComponent(message.content.slice(0, 1900))}${topicId ? `&topic_id=${encodeURIComponent(topicId)}` : ""}${recommendation?.discipline_id ? `&discipline_id=${encodeURIComponent(recommendation.discipline_id)}` : ""}`}
                    className="mt-3 inline-flex text-xs font-bold text-[#0242D7] hover:underline"
                  >
                    Compartilhar esta explicação
                  </a>
                )}
              </div>
            ))}
            {sending && <div className="max-w-[90%] rounded-2xl border border-[#E1E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#718096]">O Tutor está pensando…</div>}
          </div>

          <form onSubmit={send} className="border-t border-[#E4EAF1] p-4 sm:p-5">
            <label htmlFor="tutor-message" className="sr-only">Pergunta ao Tutor</label>
            <div className="flex gap-2">
              <input id="tutor-message" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ex.: por que eu errei essa questão?" className="min-w-0 flex-1 rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm outline-none focus:border-[#0242D7]" disabled={loading || sending} />
              <button type="submit" disabled={loading || sending || !input.trim()} className="rounded-xl bg-[#0242D7] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">Enviar</button>
            </div>
            {error && <p className="mt-3 text-xs font-bold text-[#B42318]" role="alert">{error}</p>}
          </form>
        </section>

        <aside className="rounded-2xl border border-[#DCE5F0] bg-[#F8FAFC] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Seu percurso</p>
          <h2 className="mt-2 text-lg font-black text-[#172334]">
            {courseNames.length ? courseNames.join(" · ") : "Nenhum curso adicionado"}
          </h2>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Contexto atual</p>
          <p className="mt-2 text-sm font-bold text-[#334155]">{contextLabel}</p>
          <p className="mt-2 text-sm leading-6 text-[#687688]">
            O Tutor não é um chat genérico: ele deve permanecer ligado ao conteúdo acadêmico do tópico.
          </p>
          {!courseNames.length && (
            <Link to="/app/catalogo" className="mt-5 inline-flex rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-black text-white">Adicionar curso</Link>
          )}
          {courseNames.length > 0 && !topicId && (
            <Link to="/app/disciplinas" className="mt-5 inline-flex rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-black text-white">Escolher disciplina</Link>
          )}
          {topicId && recommendation?.discipline_id && (
            <Link to="/app/disciplinas/$disciplineId/$topicId" params={{ disciplineId: recommendation.discipline_id, topicId }} className="mt-5 inline-flex rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-black text-[#334155]">Abrir tópico</Link>
          )}
        </aside>
      </div>
    </section>
  );
}
