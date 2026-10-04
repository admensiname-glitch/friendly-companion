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
  name: "review" | "arrow" | "spark";
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
    spark: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        <path d="m19 4 .7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
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

  const totalSignals = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section aria-labelledby="review-title" className="app-native-screen max-w-4xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
          Prática e memória
        </p>
        <h1
          id="review-title"
          className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]"
        >
          Revisão
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
          O que você pratica de novo hoje tende a ficar mais firme amanhã.
        </p>
      </header>

      {!loading && (
        <section
          aria-labelledby="today-review-heading"
          className="mt-7 overflow-hidden rounded-[18px] border border-[#D5E1F2] bg-[#EFF5FF] dark:border-[#2E4563] dark:bg-[#142238]"
        >
          <div className="grid lg:grid-cols-[minmax(0,1fr)_230px]">
            <div className="p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#0242D7] dark:text-[#7DB0FF]">
                Hoje
              </p>
              <h2
                id="today-review-heading"
                className="mt-2 text-[22px] font-bold tracking-[-0.035em] text-[#172334] dark:text-[#F0F5FA] sm:text-[26px]"
              >
                {dueMicro > 0
                  ? `${dueMicro} tópico${dueMicro === 1 ? "" : "s"} esperando por você.`
                  : grouped.length > 0
                    ? "Alguns conceitos pedem mais uma volta."
                    : "Nada urgente por aqui."}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#5F7187] dark:text-[#B1BECC]">
                {dueMicro > 0
                  ? "Essas revisões foram agendadas a partir do seu histórico."
                  : grouped.length > 0
                    ? "Revisar faz parte do percurso. Volte a esses pontos antes de avançar."
                    : "Continue estudando. O próximo momento de revisão aparece quando fizer sentido para o seu aprendizado."}
              </p>

              {dueMicro === 0 && grouped.length > 0 && (
                <Link
                  to="/app/estude-agora"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#D5E1F2] bg-white px-4 py-2.5 text-sm font-bold text-[#556273] hover:text-[#0242D7] dark:border-[#3B506D] dark:bg-[#17253A] dark:text-[#C5D0DE]"
                >
                  Estudar agora
                  <Icon name="spark" className="h-4 w-4" />
                </Link>
              )}

              {dueMicro > 0 && microReviews[0] && (
                <Link
                  to="/app/disciplinas/$disciplineId/$topicId"
                  params={{
                    disciplineId: microReviews[0].discipline_id,
                    topicId: microReviews[0].topic_id,
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0038B8]"
                >
                  Começar revisão
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="border-t border-[#D5E1F2] bg-white/55 p-5 dark:border-[#2E4563] dark:bg-[#111C2E]/45 lg:border-l lg:border-t-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7D8B9B] dark:text-[#8797AA]">
                Seu ritmo
              </p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#172334] dark:text-[#F0F5FA]">
                {totalSignals}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#7A8796] dark:text-[#96A6B8]">
                ocorrências de dificuldade registradas
              </p>
              {dueMicro > 0 && (
                <div className="mt-5 border-t border-[#DCE5F0] pt-4 dark:border-[#2B3A4F]">
                  <p className="text-xs text-[#7A8796] dark:text-[#96A6B8]">
                    Revisões de hoje
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#187A59] dark:text-[#7ED4AE]">
                    {dueMicro} disponível{dueMicro === 1 ? "" : "is"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {!loading && microReviews.length > 0 && (
        <section className="mt-10" aria-labelledby="scheduled-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
                Fila de revisão
              </p>
              <h2
                id="scheduled-heading"
                className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
              >
                Tópicos que o Tutor trouxe de volta
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#7A8796] dark:text-[#8999AB]">
              {microReviews.length} no total
            </span>
          </div>

          <div className="mt-4 border-y border-[#E4EAF1] dark:border-[#2B3A4F]">
            {microReviews.map((review, index) => {
              const date = new Date(review.next_micro_review_at);
              const due = date.getTime() <= Date.now();

              return (
                <Link
                  key={review.topic_id}
                  to="/app/disciplinas/$disciplineId/$topicId"
                  params={{
                    disciplineId: review.discipline_id,
                    topicId: review.topic_id,
                  }}
                  className="group grid gap-3 border-b border-[#E4EAF1] py-5 last:border-b-0 dark:border-[#2B3A4F] sm:grid-cols-[36px_minmax(0,1fr)_100px_20px] sm:items-center"
                >
                  <span className="text-xs font-bold text-[#9AA5B2] dark:text-[#71859A]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-[#8A96A5] dark:text-[#8797AA]">
                      {review.discipline_name}
                    </p>
                    <h3 className="mt-1 text-[15px] font-bold text-[#273547] dark:text-[#DFE8F1]">
                      {review.topic_name}
                    </h3>
                  </div>
                  <span
                    className={
                      due
                        ? "text-xs font-bold text-[#187A59] dark:text-[#7ED4AE]"
                        : "text-xs font-semibold text-[#7A8796] dark:text-[#9AA9BA]"
                    }
                  >
                    {due ? "Hoje" : date.toLocaleDateString("pt-BR")}
                  </span>
                  <Icon
                    name="arrow"
                    className="h-3.5 w-3.5 text-[#9AA5B2] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0242D7] dark:text-[#71859A] dark:group-hover:text-[#7DB0FF]"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="mt-8 space-y-3" aria-label="Carregando revisões">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse border-b border-[#E7ECF3] dark:border-[#2B3A4F]"
            />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="mt-10 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0F5FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]">
            <Icon name="spark" className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#253447] dark:text-[#E0E8F1]">
            Nenhum ponto frágil identificado.
          </h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[#7A8796] dark:text-[#96A6B8]">
            Siga pelo seu percurso. Quando o histórico mostrar um conceito que merece atenção, ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <section className="mt-10" aria-labelledby="fragile-heading">
          <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
            Pontos para retomar
          </p>
          <h2
            id="fragile-heading"
            className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334] dark:text-[#E7EDF5]"
          >
            Onde a prática pode ajudar
          </h2>

          <div className="mt-4 border-y border-[#E4EAF1] dark:border-[#2B3A4F]">
            {grouped.map((topicItems) => {
              const first = topicItems[0];
              if (!first) return null;


              return (
                <article
                  key={first.topic_id}
                  className="border-b border-[#E4EAF1] py-6 last:border-b-0 dark:border-[#2B3A4F]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-[#8A96A5] dark:text-[#8797AA]">
                        {first.discipline_name}
                      </p>
                      <h3 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#273547] dark:text-[#E0E8F1]">
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

                  <div className="mt-5 overflow-hidden rounded-xl border border-[#E4EAF1] dark:border-[#2B3A4F]">
                    {topicItems.map((item) => (
                      <div
                        key={item.difficulty_tag}
                        className="grid gap-2 border-b border-[#E4EAF1] px-4 py-4 last:border-b-0 dark:border-[#2B3A4F] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#334155] dark:text-[#D9E2EC]">
                            {label(item.difficulty_tag)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#7A8796] dark:text-[#8797AA]">
                            {item.review_status === "reviewed"
                              ? `${item.correct_count} acerto${item.correct_count === 1 ? "" : "s"} após a dificuldade · continue praticando.`
                              : "Você encontrou dificuldade aqui. Vale revisar antes de avançar."}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#667487] dark:text-[#AAB7C7]">
                          {item.count}x
                        </span>
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
