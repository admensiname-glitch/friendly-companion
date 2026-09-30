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
}

const label = (tag: string) =>
  tag.replace(/_/g, " ").replace(/w/g, (letter) => letter.toUpperCase());

export const Route = createFileRoute("/app/revisao")({
  component: ReviewPage,
});

function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;

      const { data: difficulties } = await supabase
        .from("student_topic_difficulties")
        .select("topic_id, difficulty_tag, count, last_occurrence")
        .eq("user_id", userId)
        .eq("review_status", "pending")
        .order("last_occurrence", { ascending: false });

      const rows = (difficulties ?? []) as Array<{
        topic_id: string;
        difficulty_tag: string;
        count: number;
        last_occurrence: string;
      }>;

      const topicIds = [...new Set(rows.map((row) => row.topic_id))];
      if (topicIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: topics } = await supabase
        .from("topics")
        .select("id, name, discipline_id")
        .in("id", topicIds)
        .eq("published", true);

      const disciplineIds = [...new Set((topics ?? []).map((topic) => topic.discipline_id))];

      const { data: disciplines } = await supabase
        .from("disciplines")
        .select("id, name")
        .in("id", disciplineIds)
        .eq("published", true);

      const topicMap = new Map(
        (topics ?? []).map((topic) => [topic.id, topic]),
      );
      const disciplineMap = new Map(
        (disciplines ?? []).map((discipline) => [discipline.id, discipline]),
      );

      const personalDisciplines = new Map<string, string>();
      for (const row of rows) {
        const topic = topicMap.get(row.topic_id);
        if (!topic) continue;

        const { data: aliases } = await supabase
          .from("discipline_aliases")
          .select("discipline_id, normalized_alias")
          .eq("discipline_id", topic.discipline_id);

        if (!aliases?.length) continue;

        const { data: studentRows } = await supabase
          .from("student_disciplines")
          .select("id, discipline_name")
          .eq("user_id", userId);

        for (const student of studentRows ?? []) {
          const normalized = student.discipline_name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          if (aliases.some((alias) => alias.normalized_alias === normalized)) {
            personalDisciplines.set(topic.discipline_id, student.id);
          }
        }
      }

      setItems(
        rows
          .map((row) => {
            const topic = topicMap.get(row.topic_id);
            const discipline = topic ? disciplineMap.get(topic.discipline_id) : undefined;
            const disciplineId = topic ? personalDisciplines.get(topic.discipline_id) : undefined;
            if (!topic || !discipline || !disciplineId) return null;

            return {
              topic_id: topic.id,
              topic_name: topic.name,
              discipline_id: disciplineId,
              discipline_name: discipline.name,
              difficulty_tag: row.difficulty_tag,
              count: row.count,
              last_occurrence: row.last_occurrence,
            };
          })
          .filter(Boolean) as ReviewItem[],
      );
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ReviewItem[]>();
    for (const item of items) {
      const key = item.topic_id;
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
    }
    return [...map.values()];
  }, [items]);

  return (
    <section aria-labelledby="review-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#D97706]">
        Revisão
      </p>
      <h1 id="review-title" className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl">
        Pontos para revisar
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        Aqui ficam reunidas as dificuldades identificadas durante suas atividades e avaliações.
      </p>

      {loading ? (
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
          <p className="font-semibold text-[#0F172A]">Nenhuma revisão pendente.</p>
          <p className="mt-2 text-sm text-[#64748B]">Continue estudando e o Ensina-me atualizará esta área quando houver novos sinais.</p>
          <Link to="/app/catalogo" className="mt-5 inline-flex rounded-md bg-[#0242D7] px-4 py-2 text-sm font-semibold text-white">
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {grouped.map((topicItems) => {
            const first = topicItems[0];
            return (
              <article key={first.topic_id} className="rounded-xl border border-[#E2E8F0] bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                      {first.discipline_name}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#0F172A]">{first.topic_name}</h2>
                  </div>
                  <Link
                    to="/app/disciplinas/$disciplineId/$topicId"
                    params={{ disciplineId: first.discipline_id, topicId: first.topic_id }}
                    className="rounded-md bg-[#0242D7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0038B8]"
                  >
                    Revisar tópico
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {topicItems.map((item) => (
                    <div key={item.difficulty_tag} className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#0F172A]">{label(item.difficulty_tag)}</p>
                        <span className="text-xs font-semibold text-[#92400E]">
                          {item.count} {item.count === 1 ? "ocorrência" : "ocorrências"}
                        </span>
                      </div>
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
