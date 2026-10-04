import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Discipline = { id: string; name: string };
type Topic = { id: string; name: string; discipline_id: string };
type Option = { id: string; content: string };
type ExamQuestion = {
  id: string;
  attempt_question_id: string;
  position: number;
  question_text: string;
  options: Option[];
};

type ExamTopicResult = {
  topic_id: string;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  score: number;
};

type ExamResult = {
  score: number;
  correct_answers: number;
  total_questions: number;
  answered_questions: number;
  topic_breakdown?: ExamTopicResult[];
};

export const Route = createFileRoute("/app/prova")({ component: ExamPage });

function ExamPage() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [disciplineId, setDisciplineId] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const [{ data: ds }, { data: ts }] = await Promise.all([
        supabase.from("disciplines").select("id,name").eq("published", true).order("name"),
        supabase.from("topics").select("id,name,discipline_id").eq("published", true).order("name"),
      ]);
      setDisciplines((ds ?? []) as Discipline[]);
      setTopics((ts ?? []) as Topic[]);
      setLoading(false);
    })();
  }, []);

  const visibleTopics = useMemo(
    () => topics.filter((t) => !disciplineId || t.discipline_id === disciplineId),
    [topics, disciplineId],
  );

  const question = questions[current] as ExamQuestion | undefined;
  const answeredCount = Object.keys(answers).length;

  async function startExam() {
    setError("");
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc("start_exam", {
      _discipline_id: (disciplineId || null) as unknown as string,
      _topic_ids: selectedTopics,
      _question_count: count,
      _duration_seconds: duration * 60,
    });
    const payload = data as { attempt_id?: string; questions?: ExamQuestion[] } | null;
    if (rpcError || !payload?.attempt_id || !Array.isArray(payload.questions)) {
      setError(rpcError?.message?.includes("NOT_ENOUGH_QUESTIONS")
        ? "Não há questões suficientes para esta configuração. Reduza a quantidade ou amplie os tópicos."
        : "Não foi possível preparar a prova. Tente novamente.");
      setLoading(false);
      return;
    }
    setAttemptId(String(payload.attempt_id));
    setQuestions(payload.questions);
    setAnswers({});
    setFlagged([]);
    setCurrent(0);
    setRemaining(duration * 60);
    setResult(null);
    setLoading(false);
  }

  async function selectAnswer(optionId: string) {
    if (!question || !attemptId || saving) return;
    setSaving(true);
    setError("");
    const { error: answerError } = await supabase.rpc("save_exam_answer", {
      _attempt_question_id: question.attempt_question_id,
      _selected_option_id: optionId,
    });
    if (answerError) setError(answerError.message.includes("EXAM_EXPIRED") ? "O tempo da prova terminou. Entregue a prova para ver o resultado." : "Não foi possível registrar esta resposta.");
    else setAnswers((old) => ({ ...old, [question.id]: optionId }));
    setSaving(false);
  }

  async function finishExam() {
    if (!attemptId) return;
    if (answeredCount < questions.length) {
      const ok = window.confirm("Ainda há questões sem resposta. Deseja entregar a prova mesmo assim?");
      if (!ok) return;
    }
    setSaving(true);
    const { data, error: finishError } = await supabase.rpc("finish_exam", { _attempt_id: attemptId });
    if (finishError) {
      console.error("[Ensina-me] Erro ao finalizar prova:", finishError);
      const message = finishError.message ?? "";
      setError(
        message.includes("EXAM_EXPIRED")
          ? "O tempo da prova terminou. Atualize a página para abrir o resultado."
          : message.includes("ATTEMPT_NOT_FOUND")
            ? "Esta prova não está mais disponível. Inicie uma nova prova."
            : "Não foi possível finalizar a prova. Tente novamente.",
      );
    } else {
      setResult(data as ExamResult);
      setAttemptId(null);
      setQuestions([]);
    }
    setSaving(false);
  }

  useEffect(() => {
    if (!attemptId || remaining <= 0) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void finishExam();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attemptId, remaining > 0]);

  const formatTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (loading && !questions.length && !result) {
    return <section className="app-native-screen max-w-4xl"><div className="h-24 animate-pulse rounded-xl bg-[#F1F5F9]" /></section>;
  }

  if (result) {
    return (
      <section className="app-native-screen max-w-3xl" aria-labelledby="exam-result">
        <p className="text-sm font-semibold text-[#0242D7]">Modo Prova</p>
        <h1 id="exam-result" className="mt-2 text-3xl font-bold text-[#172334] sm:text-4xl">Prova concluída</h1>
        <div className="mt-7 rounded-2xl border border-[#DCE5F0] bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold text-[#687688]">Seu resultado</p>
          <p className="mt-2 text-5xl font-bold text-[#0242D7]">{Math.round(result.score)}%</p>
          <p className="mt-2 text-sm text-[#687688]">{result.correct_answers} de {result.total_questions} corretas · {result.answered_questions} respondidas</p>
          {!!result.topic_breakdown?.length && (
            <div className="mt-7">
              <p className="text-sm font-bold text-[#344154]">Diagnóstico por tópico</p>
              <div className="mt-3 space-y-2">
                {result.topic_breakdown.map((item) => {
                  const topic = topics.find((t) => t.id === item.topic_id);
                  return (
                    <div key={item.topic_id} className="rounded-xl border border-[#E2E8F0] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#344154]">{topic?.name ?? "Tópico"}</p>
                        <span className="text-sm font-bold text-[#0242D7]">{Math.round(item.score)}%</span>
                      </div>
                      <p className="mt-1 text-xs text-[#7A8796]">{item.correct_answers} de {item.total_questions} corretas</p>
                      {item.score < 70 && topic && (
                        <Link to="/app/disciplinas/$disciplineId/$topicId" params={{ disciplineId: topic.discipline_id, topicId: topic.id }} className="mt-3 inline-block text-xs font-bold text-[#0242D7]">
                          Revisar este tópico →
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link to="/app/revisao" className="min-h-11 rounded-xl bg-[#0242D7] px-4 py-3 text-center text-sm font-bold text-white">Ir para revisão</Link>
            <button onClick={() => setResult(null)} className="min-h-11 rounded-xl border border-[#DCE5F0] px-4 py-3 text-sm font-bold text-[#344154]">Nova prova</button>
          </div>
        </div>
      </section>
    );
  }

  if (questions.length) {
    return (
      <section className="app-native-screen app-exam-mode max-w-3xl" aria-labelledby="exam-title">
        <header className="sticky top-0 z-20 -mx-4 border-b border-[#DCE5F0] bg-white/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:px-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0242D7]">Modo Prova</p>
              <h1 id="exam-title" className="mt-1 text-xl font-bold text-[#172334]">Demonstre o que você sabe</h1>
            </div>
            {duration > 0 && <span className="rounded-full bg-[#F1F5F9] px-3 py-1.5 text-sm font-bold tabular-nums">{formatTime(remaining)}</span>}
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E8EDF3]"><div className="h-full bg-[#0242D7]" style={{width:`${((current+1)/questions.length)*100}%`}} /></div>
          <p className="mt-2 text-xs text-[#7A8796]">Questão {current+1} de {questions.length} · {answeredCount} respondidas</p>
        </header>

        <article className="mt-7 rounded-2xl border border-[#DCE5F0] bg-white p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7A8796]">Questão {current+1}</p>
            <button type="button" onClick={() => setFlagged((old) => old.includes(question.id) ? old.filter(id=>id!==question.id) : [...old,question.id])} className="min-h-10 rounded-lg border border-[#DCE5F0] px-3 py-2 text-xs font-bold text-[#536174]">
              {flagged.includes(question.id) ? "✓ Marcada para revisar" : "Marcar para revisar"}
            </button>
          </div>
          <h2 className="mt-4 text-lg font-semibold leading-7 text-[#172334] sm:text-xl">{question.question_text}</h2>
          <div className="mt-6 space-y-3">
            {question.options.map((option, index) => (
              <button key={option.id} type="button" onClick={() => void selectAnswer(option.id)}
                className={answers[question.id] === option.id
                  ? "w-full rounded-xl border-2 border-[#0242D7] bg-[#EFF5FF] px-4 py-4 text-left text-sm font-medium text-[#0242D7]"
                  : "w-full rounded-xl border border-[#DCE5F0] px-4 py-4 text-left text-sm font-medium text-[#344154] hover:border-[#9FB8DC]"}>
                <span className="mr-3 font-bold">{String.fromCharCode(65+index)}.</span>{option.content}
              </button>
            ))}
          </div>
        </article>

        <div className="sticky bottom-[4.5rem] z-20 mt-4 flex gap-2 rounded-2xl border border-[#DCE5F0] bg-white/95 p-2 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-[#2B3A4F] dark:bg-[#111B2A]/95 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
          <button disabled={current===0} onClick={()=>setCurrent((v)=>Math.max(0,v-1))} className="min-h-11 rounded-xl border border-[#DCE5F0] px-4 py-2 text-sm font-bold disabled:opacity-40">Anterior</button>
          <button
            disabled={saving}
            onClick={()=>current<questions.length-1 ? setCurrent((v)=>v+1) : void finishExam()}
            className="min-h-11 flex-1 rounded-xl bg-[#0242D7] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Entregando..." : current<questions.length-1 ? "Próxima questão" : "Entregar prova"}
          </button>
        </div>

        <div className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Navegação das questões">
          {questions.map((q,i)=><button key={q.id} onClick={()=>setCurrent(i)} aria-label={`Ir para questão ${i+1}`} className={`h-9 w-9 rounded-full text-xs font-bold ${i===current?"bg-[#0242D7] text-white":answers[q.id]?"bg-[#E8F7EE] text-[#166534]":"bg-[#F1F5F9] text-[#687688]"}`}>{i+1}</button>)}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={()=>void finishExam()}
          className="mt-6 min-h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm font-bold text-[#475569] disabled:opacity-50 sm:mt-4"
        >
          {saving ? "Entregando prova..." : "Entregar prova agora"}
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-4xl" aria-labelledby="exam-config">
      <header className="border-b border-[#DCE5F0] pb-7">
        <p className="text-sm font-semibold text-[#0242D7]">Prática formal</p>
        <h1 id="exam-config" className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] sm:text-[40px]">Modo Prova</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688]">Uma experiência separada do estudo: você responde sem feedback imediato e recebe o diagnóstico somente ao entregar.</p>
      </header>

      {error && <div role="alert" className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">{error}</div>}

      <div className="mt-7 rounded-2xl border border-[#DCE5F0] bg-white p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#344154]">Disciplina
            <select value={disciplineId} onChange={(e)=>{setDisciplineId(e.target.value);setSelectedTopics([])}} className="mt-2 min-h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm font-normal">
              <option value="">Todas as disciplinas</option>
              {disciplines.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#344154]">Quantidade
            <select value={count} onChange={(e)=>setCount(Number(e.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm font-normal">
              {[5,10,15,20].map(n=><option key={n} value={n}>{n} questões</option>)}
            </select>
          </label>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-[#344154]">Tópicos <span className="font-normal text-[#8792A0]">(opcional)</span></p>
          <div className="mt-3 grid max-h-64 gap-2 overflow-auto rounded-xl border border-[#E2E8F0] p-3 sm:grid-cols-2">
            {visibleTopics.map(t=><label key={t.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm text-[#475569] hover:bg-[#F8FAFC]"><input type="checkbox" checked={selectedTopics.includes(t.id)} onChange={(e)=>setSelectedTopics(old=>e.target.checked?[...old,t.id]:old.filter(id=>id!==t.id))}/>{t.name}</label>)}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-[#344154]">Tempo <span className="font-normal text-[#8792A0]">(opcional)</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[0,15,30,60].map(n=><button key={n} onClick={()=>setDuration(n)} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold ${duration===n?"border-[#0242D7] bg-[#EFF5FF] text-[#0242D7]":"border-[#DCE5F0] text-[#536174]"}`}>{n===0?"Sem limite":`${n} min`}</button>)}
          </div>
        </div>

        <button type="button" disabled={loading} onClick={()=>void startExam()} className="mt-7 min-h-12 w-full rounded-xl bg-[#0242D7] px-5 py-3 text-sm font-bold text-white hover:bg-[#0038B8] disabled:opacity-50">Começar prova</button>
      </div>
    </section>
  );
}
