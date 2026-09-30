import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface ContentRow {
  entity_type: string;
  entity_id: string;
  name: string;
  parent_name: string | null;
  published: boolean;
  updated_at: string;
}

const labels: Record<string, string> = {
  course: "Curso",
  discipline: "Disciplina",
  topic: "Tópico",
  material: "Material",
  exercise: "Exercício",
};

export const Route = createFileRoute("/admin/conteudo")({
  component: AdminContent,
});

function AdminContent() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_admin_content_overview");
    if (!error) setItems((data ?? []) as ContentRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.entity_type === filter)),
    [filter, items],
  );

  async function toggle(item: ContentRow) {
    setBusyId(item.entity_id);
    const { error } = await supabase.rpc("admin_set_publication", {
      _entity_type: item.entity_type,
      _entity_id: item.entity_id,
      _published: !item.published,
    });
    if (!error) {
      setItems((current) =>
        current.map((entry) =>
          entry.entity_id === item.entity_id
            ? { ...entry, published: !entry.published, updated_at: new Date().toISOString() }
            : entry,
        ),
      );
    }
    setBusyId(null);
  }

  return (
    <section aria-labelledby="admin-content-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Curadoria
      </p>
      <h1 id="admin-content-title" className="mt-3 text-3xl font-bold text-[#0F172A]">
        Conteúdo
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">
        Controle editorial do catálogo. Publique ou retire itens de circulação sem editar o banco diretamente.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" aria-label="Filtros de conteúdo">
        {["all", "course", "discipline", "topic", "material", "exercise"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? "rounded-full bg-[#0242D7] px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#475569]"
            }
          >
            {value === "all" ? "Todos" : labels[value]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {filtered.map((item) => (
            <div
              key={item.entity_type + item.entity_id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  {labels[item.entity_type]}
                </p>
                <p className="mt-1 font-medium text-[#0F172A]">{item.name}</p>
                {item.parent_name && (
                  <p className="mt-1 text-xs text-[#64748B]">{item.parent_name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggle(item)}
                disabled={busyId === item.entity_id}
                className={
                  item.published
                    ? "rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-semibold text-[#166534]"
                    : "rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#64748B]"
                }
              >
                {busyId === item.entity_id ? "Salvando..." : item.published ? "Publicado" : "Rascunho"}
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-sm text-[#64748B]">
              Nenhum item encontrado.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
