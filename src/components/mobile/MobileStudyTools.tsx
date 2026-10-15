import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

type ExamQuestion = {
  id: string;
  attempt_question_id: string;
  question_text: string;
  question_type: "multiple_choice" | "open_text";
  options: { id: string; content: string }[];
  minimum_lines?: number;
};
type ReviewItem = {
  topic_id: string;
  topic_name: string;
  discipline_id: string;
  discipline_name: string;
  next_micro_review_at: string;
};
type StudyTopic = { id: string; name: string };
type Props = {
  topicId?: string | null;
  disciplineId?: string | null;
  availableTopics: StudyTopic[];
  onOpenTopic: (topic: { id: string; name: string; disciplineId: string }) => void;
};

const cardClass = "rounded-2xl border border-[#DCE6F5] bg-white p-4";
const primaryClass = "min-h-11 rounded-xl bg-[#0242D7] px-4 text-sm font-extrabold text-white disabled:opacity-50";
const secondaryClass = "min-h-11 rounded-xl border border-[#DCE5F0] bg-white px-4 text-sm font-bold text-[#344154] disabled:opacity-50";

export function MobileStudyTools({ topicId, disciplineId, availableTopics, onOpenTopic }: Props) {
  const [mode, setMode] = useState<"home" | "exam" | "review" | "tutor">("home");
  const [count, setCount] = useState(10);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ score?: number; correct_answers?: number; total_questions?: number } | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [contextTopic, setContextTopic] = useState(topicId ?? "");
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  async function startExam() {
    setBusy(true);
    setError("");
    const { data, error: callError } = await supabase.functions.invoke("prepare-exam", {
      body: {
        discipline_id: disciplineId ?? null,
        topic_ids: topicId ? [topicId] : availableTopics.map((topic) => topic.id),
        question_count: count,
        duration_seconds: 0,
      },
    });
    const payload = data as { attempt_id?: string; questions?: ExamQuestion[]; error?: string } | null;
    if (callError || !payload?.attempt_id || !Array.isArray(payload.questions)) {
      setError(payload?.error || "Não foi possível preparar a prova. Tente outra quantidade ou amplie os tópicos.");
      setBusy(false);
      return;
    }
    setAttemptId(payload.attempt_id);
    setQuestions(payload.questions);
    setIndex(0);
    setAnswers({});
    setDrafts({});
    setResult(null);
    setBusy(false);
  }

  async function saveAnswer(question: ExamQuestion, answer: string) {
    if (!attemptId || busy || !answer.trim()) return;
    setBusy(true);
    setError("");
    const saveResult = question.question_type === "open_text"
      ? await supabase.rpc("save_exam_text_answer", {
          _attempt_question_id: question.attempt_question_id,
          _response_text: answer,
        })
      : await supabase.rpc("save_exam_answer", {
          _attempt_question_id: question.attempt_question_id,
          _selected_option_id: answer,
        });
    if (saveResult.error) {
      setError("Não foi possível salvar a resposta. Confira a conexão e tente novamente.");
    } else {
      setAnswers((previous) => ({ ...previous, [question.id]: answer }));
    }
    setBusy(false);
  }

  async function finishExam() {
    if (!attemptId || busy) return;
    setBusy(true);
    setError("");
    if (questions.some((question) => question.question_type === "open_text")) {
      const { error: gradeError } = await supabase.functions.invoke("grade-exam", {
        body: { attempt_id: attemptId },
      });
      if (gradeError) {
        setError("A correção discursiva falhou. A prova continua aberta; tente entregar novamente.");
        setBusy(false);
        return;
      }
    }
    const { data, error: finishError } = await supabase.rpc("finish_exam", { _attempt_id: attemptId });
    if (finishError) {
      setError("Não foi possível finalizar a prova. Tente novamente.");
    } else {
      setResult(data as { score?: number; correct_answers?: number; total_questions?: number });
      setAttemptId(null);
      setQuestions([]);
    }
    setBusy(false);
  }

  async function loadReviews() {
    setReviewBusy(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setError("Sua sessão expirou. Entre novamente para consultar as revisões.");
      setReviewBusy(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from("student_topic_progress")
      .select("topic_id,next_micro_review_at")
      .eq("user_id", userId)
      .not("next_micro_review_at", "is", null)
      .order("next_micro_review_at");
    if (loadError) {
      setError("Não foi possível carregar a revisão agendada.");
      setReviews([]);
      setReviewBusy(false);
      return;
    }
    const rows = (data ?? []) as { topic_id: string; next_micro_review_at: string }[];
    if (!rows.length) {
      setReviews([]);
      setReviewBusy(false);
      return;
    }
    const topicIds = [...new Set(rows.map((row) => row.topic_id))];
    const { data: topicRows } = await supabase
      .from("topics")
      .select("id,name,discipline_id")
      .in("id", topicIds)
      .eq("published", true);
    const disciplineIds = [...new Set((topicRows ?? []).map((topic) => topic.discipline_id))];
    const { data: disciplineRows } = disciplineIds.length
      ? await supabase.from("disciplines").select("id,name").in("id", disciplineIds).eq("published", true)
      : { data: [] as { id: string; name: string }[] };
    const topicMap = new Map((topicRows ?? []).map((topic) => [topic.id, topic]));
    const disciplineMap = new Map((disciplineRows ?? []).map((discipline) => [discipline.id, discipline]));
    const nextReviews = rows.map((row) => {
      const topic = topicMap.get(row.topic_id);
      const discipline = topic ? disciplineMap.get(topic.discipline_id) : null;
      if (!topic || !discipline) return null;
      return {
        topic_id: topic.id,
        topic_name: topic.name,
        discipline_id: discipline.id,
        discipline_name: discipline.name,
        next_micro_review_at: row.next_micro_review_at,
      };
    }).filter((item): item is ReviewItem => item !== null);
    setReviews(nextReviews);
    setReviewBusy(false);
  }

  async function askTutor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    if (!contextTopic) {
      setError("Escolha um tópico para dar contexto ao Tutor.");
      return;
    }
    setBusy(true);
    setError("");
    setInput("");
    setMessages((previous) => [...previous, { role: "user", content: message }]);
    const { data, error: callError } = await supabase.functions.invoke("ai-tutor", {
      body: {
        action: "chat",
        topic_id: contextTopic,
        message,
        conversation_id: conversationId,
      },
    });
    if (callError || data?.error || !data?.message) {
      setError(data?.error || "O Tutor não conseguiu responder agora. Tente novamente.");
    } else {
      if (typeof data.conversation_id === "string") setConversationId(data.conversation_id);
      setMessages((previous) => [...previous, { role: "assistant", content: String(data.message) }]);
    }
    setBusy(false);
  }

  const question = questions[index];
  const minimumLines = question?.minimum_lines ?? (
    /compare|diferenc|relacione|distinga|contraste/i.test(question?.question_text ?? "") ? 4
      : /analise|analisar|avalie|discuta|justifique|aplique|proponha|exemplifique/i.test(question?.question_text ?? "") ? 5
        : /explique|descreva|como funciona|por que|por quê/i.test(question?.question_text ?? "") ? 3 : 2
  );

  return (
    <section className="space-y-3">
      {mode !== "home" && (
        <button type="button" className="text-sm font-bold text-[#0242D7]" onClick={() => { setMode("home"); setError(""); }}>
          ← Opções de estudo
        </button>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {mode === "home" && (
        <>
          <button type="button" className={cardClass + " block w-full text-left"} onClick={() => setMode("exam")}>
            <p className="text-sm font-extrabold text-[#0242D7]">Modo prova</p>
            <p className="mt-1 font-bold">Avaliação completa</p>
            <p className="mt-1 text-sm leading-6 text-[#68778C]">5, 10, 15 ou 20 questões, com correção discursiva quando houver.</p>
          </button>
          <button type="button" className={cardClass + " block w-full text-left"} onClick={() => { setMode("review"); void loadReviews(); }}>
            <p className="text-sm font-extrabold text-[#0242D7]">Revisão agendada</p>
            <p className="mt-1 font-bold">Retome tópicos na hora certa</p>
            <p className="mt-1 text-sm leading-6 text-[#68778C]">Consulte sua fila e abra o conteúdo diretamente.</p>
          </button>
          <button type="button" className={cardClass + " block w-full text-left"} onClick={() => { setContextTopic(topicId ?? ""); setMode("tutor"); }}>
            <p className="text-sm font-extrabold text-[#0242D7]">Tutor Heitor</p>
            <p className="mt-1 font-bold">Tire dúvidas com contexto acadêmico</p>
            <p className="mt-1 text-sm leading-6 text-[#68778C]">Converse sobre um tópico publicado dos seus cursos.</p>
          </button>
        </>
      )}

      {mode === "exam" && (
        <div className={cardClass}>
          <h2 className="text-xl font-extrabold">Modo prova</h2>
          {result && (
            <div className="mt-4">
              <p className="text-3xl font-extrabold text-[#0242D7]">{Math.round(Number(result.score ?? 0))}%</p>
              <p className="mt-2 text-sm text-[#68778C]">{result.correct_answers ?? 0} acertos em {result.total_questions ?? 0} questões.</p>
              <button type="button" className={primaryClass + " mt-4"} onClick={() => { setResult(null); setAnswers({}); }}>Nova prova</button>
            </div>
          )}
          {!result && questions.length === 0 && (
            <>
              <p className="mt-2 text-sm leading-6 text-[#68778C]">Escolha a quantidade. A prova pode incluir questões discursivas conforme o material publicado disponível.</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((value) => (
                  <button type="button" key={value} className={secondaryClass + (count === value ? " border-[#0242D7] bg-[#EEF4FF] text-[#0242D7]" : "")} onClick={() => setCount(value)}>
                    {value}
                  </button>
                ))}
              </div>
              <button type="button" className={primaryClass + " mt-4 w-full"} disabled={busy} onClick={() => void startExam()}>
                {busy ? "Preparando..." : "Começar prova"}
              </button>
            </>
          )}
          {!result && questions.length > 0 && question && (
            <div className="mt-4">
              <div className="flex justify-between text-xs font-bold text-[#68778C]">
                <span>Questão {index + 1} de {questions.length}</span>
                <span>{Object.keys(answers).length} respondidas</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[#E7EDF7]">
                <div className="h-1.5 rounded-full bg-[#0242D7]" style={{ width: ((index + 1) / questions.length * 100) + "%" }} />
              </div>
              <h3 className="mt-4 font-bold leading-6">{question.question_text}</h3>
              {question.question_type === "multiple_choice" && (
                <div className="mt-4 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <button type="button" key={option.id} className={"w-full rounded-xl border p-3 text-left text-sm leading-6 " + (answers[question.id] === option.id ? "border-[#0242D7] bg-[#EEF4FF]" : "border-[#E3EAF4]")} disabled={busy} onClick={() => void saveAnswer(question, option.id)}>
                      <b>{String.fromCharCode(65 + optionIndex)}. </b>{option.content}{answers[question.id] === option.id ? " ✓" : ""}
                    </button>
                  ))}
                </div>
              )}
              {question.question_type === "open_text" && (
                <div className="mt-3">
                  <p className="text-sm leading-6 text-[#68778C]">Desenvolva pelo menos {minimumLines} linhas, separando suas ideias.</p>
                  <textarea rows={6} value={drafts[question.id] ?? ""} onChange={(event) => setDrafts((previous) => ({ ...previous, [question.id]: event.target.value }))} className="mt-3 w-full rounded-xl border border-[#DCE5F0] p-3 text-base leading-6" placeholder="Desenvolva seu raciocínio..." />
                  <button type="button" className={secondaryClass + " mt-3"} disabled={busy || (drafts[question.id] ?? "").trim().length < 10 || (drafts[question.id] ?? "").split(/\r?\n/).filter((line) => line.trim()).length < minimumLines} onClick={() => void saveAnswer(question, drafts[question.id] ?? "")}>
                    Salvar resposta
                  </button>
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <button type="button" className={secondaryClass + " flex-1"} disabled={index === 0} onClick={() => setIndex((previous) => previous - 1)}>Anterior</button>
                {index < questions.length - 1
                  ? <button type="button" className={primaryClass + " flex-1"} onClick={() => setIndex((previous) => previous + 1)}>Próxima</button>
                  : <button type="button" className={primaryClass + " flex-1"} disabled={busy} onClick={() => void finishExam()}>{busy ? "Finalizando..." : "Entregar prova"}</button>}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "review" && (
        <div className={cardClass}>
          <h2 className="text-xl font-extrabold">Revisão agendada</h2>
          {reviewBusy && <p className="mt-3 text-sm text-[#68778C]">Carregando...</p>}
          {!reviewBusy && reviews.length === 0 && <p className="mt-3 text-sm leading-6 text-[#68778C]">Nenhuma revisão agendada encontrada. Continue estudando para alimentar sua fila.</p>}
          {!reviewBusy && reviews.length > 0 && (
            <div className="mt-3 divide-y divide-[#E8EDF5]">
              {reviews.map((review) => (
                <button type="button" key={review.topic_id} className="block w-full py-3 text-left" onClick={() => onOpenTopic({ id: review.topic_id, name: review.topic_name, disciplineId: review.discipline_id })}>
                  <p className="text-xs text-[#68778C]">{review.discipline_name} · {new Date(review.next_micro_review_at).toLocaleDateString("pt-BR")}</p>
                  <p className="mt-1 font-bold">{review.topic_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "tutor" && (
        <div className={cardClass}>
          <h2 className="text-xl font-extrabold">Tutor Heitor</h2>
          <p className="mt-1 text-sm leading-6 text-[#68778C]">Escolha um tópico para o Tutor responder com contexto acadêmico.</p>
          <label className="mt-3 block text-sm font-bold" htmlFor="mobile-tutor-topic">Tópico</label>
          <select id="mobile-tutor-topic" value={contextTopic} onChange={(event) => setContextTopic(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DCE5F0] bg-white p-3 text-base">
            <option value="">Selecione um tópico</option>
            {availableTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            {topicId && !availableTopics.some((topic) => topic.id === topicId) && <option value={topicId}>Tópico atual</option>}
          </select>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
            {messages.map((message, messageIndex) => (
              <div key={messageIndex} className={"whitespace-pre-wrap rounded-xl p-3 text-sm leading-6 " + (message.role === "user" ? "ml-5 bg-[#0242D7] text-white" : "mr-5 bg-[#F3F6FA] text-[#334155]")}>{message.content}</div>
            ))}
            {busy && <p className="text-sm text-[#68778C]">Heitor está preparando a resposta...</p>}
          </div>
          <form onSubmit={(event) => void askTutor(event)} className="mt-4">
            <label className="text-sm font-bold" htmlFor="mobile-tutor-message">Sua dúvida</label>
            <textarea id="mobile-tutor-message" rows={3} maxLength={4000} value={input} onChange={(event) => setInput(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DCE5F0] p-3 text-base leading-6" placeholder="Explique o que você não entendeu..." />
            <button className={primaryClass + " mt-3 w-full"} type="submit" disabled={busy || !input.trim()}>{busy ? "Enviando..." : "Perguntar ao Heitor"}</button>
          </form>
        </div>
      )}
    </section>
  );
}