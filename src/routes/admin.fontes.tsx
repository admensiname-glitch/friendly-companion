import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface SourceRow {
  source_id: string;
  title: string;
  publisher: string | null;
  source_type: string;
  rights_class: string;
  access_model: string;
  verified_at: string | null;
  document_count: number;
  topic_count: number;
}

const rightsLabels: Record<string, string> = {
  OPEN: "Uso compatível",
  METADATA_ONLY: "Somente referência",
  USER_AUTHORIZED: "Autorização do usuário",
  RESTRICTED: "Restrita",
  UNKNOWN: "Não verificada",
};

export const Route = createFileRoute("/admin/fontes")({
  component: AdminSources,
});

function AdminSources() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("get_admin_source_overview");
      setSources((data ?? []) as SourceRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <section aria-labelledby="admin-sources-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Curadoria
      </p>
      <h1 id="admin-sources-title" className="mt-3 text-3xl font-bold text-[#0F172A]">
        Fontes acadêmicas
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">
        Controle de proveniência e direitos das fontes usadas pelo Ensina-me.
      </p>

      {loading ? (
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]" />
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {sources.map((source) => (
            <article key={source.source_id} className="rounded-xl border border-[#E2E8F0] bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-semibold text-[#0F172A]">{source.title}</h2>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {source.publisher ?? "Publicador não informado"} · {source.source_type}
                  </p>
                </div>
                <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#475569]">
                  {rightsLabels[source.rights_class] ?? source.rights_class}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#64748B]">Modelo de acesso</p>
                  <p className="mt-1 text-sm font-medium text-[#0F172A]">{source.access_model}</p>
                </div>
                <div className="rounded-lg bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#64748B]">Tópicos vinculados</p>
                  <p className="mt-1 text-sm font-medium text-[#0F172A]">{source.topic_count}</p>
                </div>
                <div className="rounded-lg bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#64748B]">Documentos registrados</p>
                  <p className="mt-1 text-sm font-medium text-[#0F172A]">{source.document_count}</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-[#64748B]">
                {source.verified_at
                  ? "Direitos verificados em " + new Date(source.verified_at).toLocaleDateString("pt-BR")
                  : "Direitos ainda não verificados."}
              </p>
            </article>
          ))}

          {sources.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-sm text-[#64748B]">
              Nenhuma fonte cadastrada.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
