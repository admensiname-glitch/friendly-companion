import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface Discipline {
  id: string;
  name: string;
  description: string | null;
  course_id: string;
  course_name?: string;
}

export const Route = createFileRoute("/app/catalogo")({
  component: CatalogPage,
});

function CatalogPage() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("disciplines")
        .select("id, name, description, course_id, courses(name)")
        .eq("published", true)
        .order("name", { ascending: true });

      const rows = (data ?? []) as Array<Discipline & { courses?: { name: string } | null }>;
      setDisciplines(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          course_id: row.course_id,
          course_name: row.courses?.name ?? "Curso",
        })),
      );
      setLoading(false);
    })();
  }, []);

  return (
    <section aria-labelledby="catalog-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Conhecimento global
      </p>
      <h1 id="catalog-title" className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl">
        Catálogo de disciplinas
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        Explore conteúdos publicados pelo Ensina-me, mesmo que eles ainda não façam parte das suas disciplinas atuais.
      </p>

      {loading ? (
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]" />
          ))}
        </div>
      ) : disciplines.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
          <p className="font-semibold text-[#0F172A]">Nenhuma disciplina publicada ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {disciplines.map((discipline) => (
            <Link
              key={discipline.id}
              to="/app/catalogo/$disciplineId"
              params={{ disciplineId: discipline.id }}
              className="rounded-xl border border-[#E2E8F0] bg-white p-6 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{discipline.course_name}</p>
              <h2 className="mt-2 text-lg font-semibold text-[#0F172A]">{discipline.name}</h2>
              {discipline.description && (
                <p className="mt-2 text-sm leading-6 text-[#64748B]">{discipline.description}</p>
              )}
              <span className="mt-4 inline-block text-sm font-semibold text-[#0242D7]">Explorar →</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
