import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface ReviewItem {
  topic_id: string;
  topic_name: string;
  discipline_id: string;
  discipline_name: string;
  difficulty_tag: string;
  count: number;
  last_occurrence: string;
  review_status: string;
  correct_count: number;
}

interface ScheduledMicroReview {
  topic_id: string;
  topic_name: string;
  discipline_id: string;
  discipline_name: string;
  next_micro_review_at: string;
  micro_mastery_level: "emerging" | "consolidating" | "proficient" | "mastered";
  micro_current_difficulty: "introductory" | "intermediate" | "advanced";
}

const label = (tag: string) =>
  tag.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const Route = createFileRoute("/app/revisao")({
  component: ReviewPage,
});

function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [microReviews, setMicroReviews] = useState<ScheduledMicroReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const [{ data: reviewData }, { data: progressData }] = await Promise.all([
        supabase.rpc("get_student_review_items"),
        supabase
          .from("student_topic_progress")
          .select("topic_id, next_micro_review_at, micro_mastery_level, micro_current_difficulty")
          .eq("user_id", sessionData.session.user.id)
          .not("next_micro_review_at", "is", null)
          .order("next_micro_review_at", { ascending: true }),
      ]);

      setItems((reviewData ?? []) as ReviewItem[]);

      const progressRows = (progressData ?? []).filter(
        (row) => typeof row.next_micro_review_at === "string",
      );

      if (progressRows.length > 0) {
        const topicIds = progressRows.map((row) => row.topic_id);
        const { data: topics } = await supabase
          .from("topics")
          .select("id, name, discipline_id")
          .in("id", topicIds)
          .eq("published", true);

        const disciplineIds = [...new Set((topics ?? []).map((topic) => topic.discipline_id))];
        const { data: disciplines } =
          disciplineIds.length > 0
            ? await supabase
                .from("disciplines")
                .select("id, name")
                .in("id", disciplineIds)
                .eq("published", true)
            : { data: [] };

        const topicMap = new Map((topics ?? []).map((topic) => [topic.id, topic]));
        const disciplineMap = new Map((disciplines ?? []).map((discipline) => [discipline.id, discipline]));

        setMicroReviews(
          progressRows
            .map((row) => {
              const topic = topicMap.get(row.topic_id);
              const discipline = topic ? disciplineMap.get(topic.discipline_id) : null;
              if (!topic || !discipline) return null;

              return {
                topic_id: topic.id,
                topic_name: topic.name,
                discipline_id: discipline.id,
                discipline_name: discipline.name,
                next_micro_review_at: row.next_micro_review_at,
                micro_mastery_level:
                  row.micro_mastery_level === "mastered" ||
                  row.micro_mastery_level === "proficient" ||
                  row.micro_mastery_level === "consolidating"
                    ? row.micro_mastery_level
                    : "emerging",
                micro_current_difficulty:
                  row.micro_current_difficulty === "advanced" ||
                  row.micro_current_difficulty === "intermediate"
                    ? row.micro_current_difficulty
                    : "introductory",
              } as ScheduledMicroReview;
            })
            .filter((item): item is ScheduledMicroReview => item !== null),
        );
      }

      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ReviewItem[]>();
    for (const item of items) {
      const current = map.get(item.topic_id) ?? [];
      current.push(item);
      map.set(item.topic_id, current);
    }
    return Array.from(map.values());
  }, [items]);

  return (
    <section aria-labelledby="review-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D97706]">
        Revisão
      </p>
      <h1
        id="review-title"
        className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
      >
        Pontos para revisar
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        Aqui ficam reunidas as dificuldades identificadas durante suas atividades e avaliações.
      </p>

      {!loading && microReviews.length > 0 && (
        <section
          aria-labelledby="micro-review-heading"
          className="mt-8 rounded-xl border border-[#BFDBFE] bg-[#F8FBFF] p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0242D7]">
                Revisão programada pelo Tutor
              </p>
              <h2 id="micro-review-heading" className="mt-1 text-lg font-semibold text-[#0F172A]">
                Reforce o que você já estudou
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#64748B]">
                O Ensina-me programa novas microquestões conforme seu histórico de acertos e erros para fortalecer a retenção.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {microReviews.map((review) => {
              const reviewDate = new Date(review.next_micro_review_at);
              const isDue = reviewDate.getTime() <= Date.now();
              const difficultyLabel =
                review.micro_current_difficulty === "advanced"
                  ? "avançada"
                  : review.micro_current_difficulty === "intermediate"
                    ? "intermediária"
                    : "inicial";

              return (
                <article
                  key={review.topic_id}
                  className="rounded-lg border border-[#E2E8F0] bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#64748B]">{review.discipline_name}</p>
                      <h3 className="mt-1 font-semibold text-[#0F172A]">{review.topic_name}</h3>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {isDue
                          ? "Revisão disponível agora"
                          : "Próxima revisão em " + reviewDate.toLocaleDateString("pt-BR")}
                        {" · dificuldade " + difficultyLabel}
                      </p>
                    </div>
                    <Link
                      to="/app/disciplinas/$disciplineId/$topicId"
                      params={{
                        disciplineId: review.discipline_id,
                        topicId: review.topic_id,
                      }}
                      className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#0242D7]"
                    >
                      Abrir tópico
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]"
            />
          ))}
        </div>
      ) : grouped.length === 0 && microReviews.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
          <p className="font-semibold text-[#0F172A]">Nenhuma revisão pendente.</p>
          <p className="mt-2 text-sm text-[#64748B]">
            Continue estudando e o Ensina-me atualizará esta área quando houver novos sinais.
          </p>
          <Link
            to="/app/catalogo"
            className="mt-5 inline-flex rounded-md bg-[#0242D7] px-4 py-2 text-sm font-semibold text-white"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {grouped.map((topicItems) => {
            const first = topicItems[0];
            return (
              <article
                key={first.topic_id}
                className="rounded-xl border border-[#E2E8F0] bg-white p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                      {first.discipline_name}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#0F172A]">
                      {first.topic_name}
                    </h2>
                  </div>
                  <Link
                    to="/app/disciplinas/$disciplineId/$topicId"
                    params={{
                      disciplineId: first.discipline_id,
                      topicId: first.topic_id,
                    }}
                    className="rounded-md bg-[#0242D7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0038B8]"
                  >
                    Revisar tópico
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {topicItems.map((item) => (
                    <div
                      key={item.difficulty_tag}
                      className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#0F172A]">
                          {label(item.difficulty_tag)}
                        </p>
                        <span className="text-xs font-semibold text-[#92400E]">
                          {item.count}{" "}
                          {item.count === 1 ? "ocorrência" : "ocorrências"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#64748B]">
                        {item.review_status === "reviewed"
                          ? item.correct_count + " acerto" + (item.correct_count === 1 ? "" : "s") + " após a dificuldade · continue praticando."
                          : "Pendência identificada · revise antes de avançar."}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
