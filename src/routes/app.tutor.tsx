import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LearningEngine, type StudyRecommendation } from "@/lib/learning-engine";

export const Route = createFileRoute("/app/tutor")({ component: TutorPage });

type Message = { role: "user" | "assistant"; content: string };

function TutorPage() {
  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const recommendationData = await LearningEngine.getRecommendation().catch(() => null);
      setRecommendation(recommendationData);
      setTopicId(recommendationData?.topic_id ?? null);
      setLoading(false);
    })();
  }, []);

  const contextLabel = useMemo(
    () => recommendation?.topic_name
      ? `Estudando: ${recommendation.topic_name}${recommendation.discipline_name ? ` · ${recommendation.discipline_name}` : ""}`
      : "Escolha um tópico para dar contexto ao Tutor.",
    [recommendation],
  );

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
    setMessages((current) => [...current, { role: "user", content: message }]);

    const { data, error: invokeError } = await supabase.functions.invoke("ai-tutor", {
      body: { action: "chat", topic_id: topicId, message },
    });

    if (invokeError || data?.error) {
      setError(data?.error ?? "O Tutor não conseguiu responder agora. Tente novamente.");
    } else if (data?.message) {
      setMessages((current) => [...current, { role: "assistant", content: data.message }]);
    }

    setSending(false);
  }

  return (
    <section className="mx-auto w-full max-w-5xl" aria-labelledby="tutor-title">
      <header className="border-b border-[#DCE5F0] pb-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0242D7]">Tutor</p>
        <h1 id="tutor-title" className="mt-2 text-[32px] font-black tracking-[-0.04em] text-[#172334] sm:text-[42px]">Aprenda com contexto.</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688]">
          O Tutor usa o tópico atual e o seu percurso para explicar, comparar, corrigir raciocínios e orientar a próxima prática.
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
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-[#0242D7] px-4 py-3 text-sm leading-6 text-white" : "max-w-[90%] rounded-2xl border border-[#E1E8F0] bg-[#F8FAFC] px-4 py-3 text-sm leading-6 text-[#273547]"}>
                {message.content}
              </div>
            ))}
            {sending && <div className="max-w-[90%] rounded-2xl border border-[#E1E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#718096]">O Tutor está pensando…</div>}
          </div>

          <form onSubmit={send} className="border-t border-[#E4EAF1] p-4 sm:p-5">
            <label htmlFor="tutor-message" className="sr-only">Pergunta ao Tutor</label>
            <div className="flex gap-2">
              <input id="tutor-message" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ex.: por que eu errei essa questão?" className="min-w-0 flex-1 rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm outline-none focus:border-[#0242D7]" disabled={loading || sending || !topicId} />
              <button type="submit" disabled={loading || sending || !input.trim()} className="rounded-xl bg-[#0242D7] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">Enviar</button>
            </div>
            {error && <p className="mt-3 text-xs font-bold text-[#B42318]" role="alert">{error}</p>}
          </form>
        </section>

        <aside className="rounded-2xl border border-[#DCE5F0] bg-[#F8FAFC] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0242D7]">Contexto</p>
          <h2 className="mt-2 text-lg font-black text-[#172334]">{contextLabel}</h2>
          <p className="mt-2 text-sm leading-6 text-[#687688]">
            O Tutor não é um chat genérico: ele deve permanecer ligado ao conteúdo acadêmico do tópico.
          </p>
          {!topicId && (
            <Link to="/app/disciplinas" className="mt-5 inline-flex rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-black text-white">Escolher curso</Link>
          )}
          {topicId && recommendation?.discipline_id && (
            <Link to="/app/disciplinas/$disciplineId/$topicId" params={{ disciplineId: recommendation.discipline_id, topicId }} className="mt-5 inline-flex rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-black text-[#334155]">Abrir tópico</Link>
          )}
        </aside>
      </div>
    </section>
  );
}
