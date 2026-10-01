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
  micro_mastery_level:
    | "emerging"
    | "consolidating"
    | "proficient"
    | "mastered";
  micro_current_difficulty:
    | "introductory"
    | "intermediate"
    | "advanced";
}

export const Route = createFileRoute("/app/revisao")({
  component: ReviewPage,
});

const label = (tag: string) =>
  tag.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function Icon({
  name,
  className = "",
}: {
  name: "review" | "arrow";
  className?: string;
}) {
  const paths = {
    review: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h11" />
        <path d="M4 18h8" />
        <path d="m17 15 2 2 3-4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
  } as const;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

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

      const [{ data: reviewData }, { data: progressData }] =
        await Promise.all([
          supabase.rpc("get_student_review_items"),
          supabase
            .from("student_topic_progress")
            .select(
              "topic_id,next_micro_review_at,micro_mastery_level,micro_current_difficulty",
            )
            .eq("user_id", sessionData.session.user.id)
            .not("next_micro_review_at", "is", null)
            .order("next_micro_review_at", { ascending: true }),
        ]);

      setItems((reviewData ?? []) as ReviewItem[]);

      const rows = (progressData ?? []).filter(
        (row) => typeof row.next_micro_review_at === "string",
      );

      if (rows.length) {
        const topicIds = rows.map((row) => row.topic_id);
        const { data: topics } = await supabase
          .from("topics")
          .select("id,name,discipline_id")
          .in("id", topicIds)
          .eq("published", true);

        const disciplineIds = [
          ...new Set((topics ?? []).map((topic) => topic.discipline_id)),
        ];

        const { data: disciplines } = disciplineIds.length
          ? await supabase
              .from("disciplines")
              .select("id,name")
              .in("id", disciplineIds)
              .eq("published", true)
          : { data: [] };

        const topicMap = new Map((topics ?? []).map((topic) => [topic.id, topic]));
        const disciplineMap = new Map(
          (disciplines ?? []).map((discipline) => [
            discipline.id,
            discipline,
          ]),
        );

        setMicroReviews(
          rows
            .map((row) => {
              const topic = topicMap.get(row.topic_id);
              const discipline = topic
                ? disciplineMap.get(topic.discipline_id)
                : null;

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
            .filter(
              (value): value is ScheduledMicroReview => value !== null,
            ),
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

  const dueMicro = microReviews.filter(
    (review) =>
      new Date(review.next_micro_review_at).getTime() <= Date.now(),
  ).length;

  return (
    <section aria-labelledby="review-title" className="max-w-4xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
          Revisão
        </p>
        <h1
          id="review-title"
          className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[38px]"
        >
          Alguns pontos merecem mais uma volta.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
          Aqui ficam os conceitos em que você encontrou mais dificuldade. Volte
          neles, pratique de novo e siga em frente quando estiver mais firme.
        </p>
      </header>

      {!loading && microReviews.length > 0 && (
        <section
          aria-labelledby="micro-review-heading"
          className="mt-8 border-b border-[#DCE5F0] pb-8 dark:border-[#2B3A4F]"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
                Revisão programada
              </p>
              <h2
                id="micro-review-heading"
                className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
              >
                O Tutor trouxe estes tópicos de volta.
              </h2>
            </div>
            <p className="text-sm text-[#718093] dark:text-[#9AA9BA]">
              {dueMicro} disponível{dueMicro === 1 ? "" : "is"} agora
            </p>
          </div>

          <div className="mt-5 divide-y divide-[#E7ECF3] dark:divide-[#2B3A4F]">
            {microReviews.map((review) => {
              const date = new Date(review.next_micro_review_at);
              const due = date.getTime() <= Date.now();
              const diff =
                review.micro_current_difficulty === "advanced"
                  ? "avançada"
                  : review.micro_current_difficulty === "intermediate"
                    ? "intermediária"
                    : "inicial";

              return (
                <article
                  key={review.topic_id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#8B96A5] dark:text-[#8797AA]">
                      {review.discipline_name}
                    </p>
                    <h3 className="mt-1 text-[15px] font-bold text-[#273547] dark:text-[#E2EAF3]">
                      {review.topic_name}
                    </h3>
                    <p className="mt-1 text-xs text-[#7A8796] dark:text-[#8797AA]">
                      Dificuldade {diff}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <span
                      className={
                        due
                          ? "text-xs font-bold text-[#187A59] dark:text-[#7ED4AE]"
                          : "text-xs font-semibold text-[#7A8796] dark:text-[#AAB7C7]"
                      }
                    >
                      {due ? "Agora" : date.toLocaleDateString("pt-BR")}
                    </span>
                    <Link
                      to="/app/disciplinas/$disciplineId/$topicId"
                      params={{
                        disciplineId: review.discipline_id,
                        topicId: review.topic_id,
                      }}
                      className="inline-flex items-center gap-2 text-xs font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]"
                    >
                      Abrir tópico
                      <Icon name="arrow" className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="mt-8 space-y-5" aria-label="Carregando revisões">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse border-b border-[#E7ECF3] dark:border-[#2B3A4F]"
            />
          ))}
        </div>
      ) : grouped.length === 0 && microReviews.length === 0 ? (
        <div className="mt-10 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]">
            <Icon name="review" className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-[#253447] dark:text-[#E2EAF3]">
            Nenhuma revisão pendente.
          </h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[#7A8796] dark:text-[#9AA9BA]">
            Continue estudando. Quando algum conceito precisar de mais atenção,
            ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <section className="mt-10" aria-labelledby="points-heading">
          <div className="mb-4">
            <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
              Pontos identificados
            </p>
            <h2
              id="points-heading"
              className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
            >
              Onde vale voltar
            </h2>
          </div>

          <div className="divide-y divide-[#E7ECF3] border-y border-[#E7ECF3] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
            {grouped.map((topicItems) => {
              const first = topicItems[0];

              return (
                <article key={first.topic_id} className="py-6 first:pt-5 last:pb-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#8B96A5] dark:text-[#8797AA]">
                        {first.discipline_name}
                      </p>
                      <h3 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#273547] dark:text-[#E2EAF3]">
                        {first.topic_name}
                      </h3>
                    </div>

                    <Link
                      to="/app/disciplinas/$disciplineId/$topicId"
                      params={{
                        disciplineId: first.discipline_id,
                        topicId: first.topic_id,
                      }}
                      className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]"
                    >
                      Revisar
                      <Icon name="arrow" className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="mt-5 divide-y divide-[#EEF2F6] rounded-lg border border-[#E7ECF3] dark:divide-[#26354A] dark:border-[#2B3A4F]">
                    {topicItems.map((item) => (
                      <div
                        key={item.difficulty_tag}
                        className="grid gap-1 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#334155] dark:text-[#D9E2EC]">
                            {label(item.difficulty_tag)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#7A8796] dark:text-[#8797AA]">
                            {item.review_status === "reviewed"
                              ? item.correct_count +
                                " acerto" +
                                (item.correct_count === 1 ? "" : "s") +
                                " após a dificuldade · continue praticando."
                              : "Você encontrou dificuldade aqui. Vale revisar antes de avançar."}
                          </p>
                        </div>

                        <p className="text-xs font-bold text-[#667487] dark:text-[#AAB7C7] sm:text-right">
                          {item.count}x
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
