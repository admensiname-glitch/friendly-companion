import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Topic {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

interface Discipline {
  id: string;
  name: string;
  description: string | null;
}

export const Route = createFileRoute("/app/catalogo/$disciplineId")({
  component: CatalogDisciplinePage,
});

function CatalogDisciplinePage() {
  const { disciplineId } = Route.useParams();
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: disciplineData } = await supabase
        .from("disciplines")
        .select("id, name, description")
        .eq("id", disciplineId)
        .eq("published", true)
        .maybeSingle();

      if (!disciplineData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setDiscipline(disciplineData as Discipline);

      const { data: topicsData } = await supabase
        .from("topics")
        .select("id, name, description, position")
        .eq("discipline_id", disciplineId)
        .eq("published", true)
        .order("position", { ascending: true });

      setTopics((topicsData ?? []) as Topic[]);
      setLoading(false);
    })();
  }, [disciplineId]);

  if (!loading && notFound) {
    return (
      <section className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8">
        <h1 className="text-xl font-semibold text-[#0F172A]">Disciplina não encontrada</h1>
        <Link to="/app/catalogo" className="mt-4 inline-block text-sm font-semibold text-[#0242D7]">
          Voltar ao catálogo
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="catalog-discipline-title">
      <Link to="/app/catalogo" className="text-sm font-medium text-[#64748B] hover:text-[#0242D7]">
        ← Catálogo
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
          Disciplina
        </p>
        <h1 id="catalog-discipline-title" className="mt-2 text-3xl font-bold text-[#0F172A]">
          {discipline?.name ?? "Carregando..."}
        </h1>
        {discipline?.description && (
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#64748B]">{discipline.description}</p>
        )}
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8">
          <p className="font-semibold text-[#0F172A]">Esta disciplina ainda não possui tópicos publicados.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              to="/app/disciplinas/$disciplineId/$topicId"
              params={{ disciplineId: disciplineId, topicId: topic.id }}
              className="block rounded-xl border border-[#E2E8F0] bg-white p-5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              <p className="font-semibold text-[#0F172A]">{topic.name}</p>
              {topic.description && (
                <p className="mt-1 text-sm leading-6 text-[#64748B]">{topic.description}</p>
              )}
              <span className="mt-3 inline-block text-sm font-semibold text-[#0242D7]">Estudar tópico →</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
