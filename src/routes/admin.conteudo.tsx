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

interface MaterialEditor {
  id: string;
  title: string;
  introduction: string | null;
  status: string;
}

interface MaterialSectionEditor {
  id: string;
  material_id: string;
  title: string;
  content: string;
  position: number;
  section_type: string;
}

const labels: Record<string, string> = {
  course: "Curso",
  discipline: "Disciplina",
  topic: "Tópico",
  material: "Material",
  exercise: "Exercício",
};

const sectionTypeLabels: Record<string, string> = {
  concept: "Ideia central",
  explanation: "Entenda",
  deepening: "Aprofunde",
  examples: "Na prática",
  common_mistakes: "Atenção",
  review: "Revisão rápida",
};

const sectionTypeOptions = [
  ["concept", "Ideia central"],
  ["explanation", "Entenda"],
  ["deepening", "Aprofunde"],
  ["examples", "Na prática"],
  ["common_mistakes", "Atenção"],
  ["review", "Revisão rápida"],
] as const;

export const Route = createFileRoute("/admin/conteudo")({
  component: AdminContent,
});

function AdminContent() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editor, setEditor] = useState<MaterialEditor | null>(null);
  const [sections, setSections] = useState<MaterialSectionEditor[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setErrorMessage(null);

    const { error } = await supabase.rpc("admin_set_publication", {
      _entity_type: item.entity_type,
      _entity_id: item.entity_id,
      _published: !item.published,
    });

    if (error) {
      setErrorMessage("Não foi possível alterar a publicação.");
    } else {
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

  async function openMaterial(materialId: string) {
    setEditorLoading(true);
    setSaveState("idle");
    setErrorMessage(null);

    const [{ data: material, error: materialError }, { data: sectionData, error: sectionError }] =
      await Promise.all([
        supabase
          .from("materials")
          .select("id, title, introduction, status")
          .eq("id", materialId)
          .single(),
        supabase
          .from("material_sections")
          .select("id, material_id, title, content, position, section_type")
          .eq("material_id", materialId)
          .order("position", { ascending: true }),
      ]);

    setEditorLoading(false);

    if (materialError || !material) {
      setErrorMessage("Não foi possível abrir o material para edição.");
      return;
    }

    if (sectionError) {
      setErrorMessage("O material abriu, mas suas seções não puderam ser carregadas.");
    }

    setEditor(material as MaterialEditor);
    setSections((sectionData ?? []) as MaterialSectionEditor[]);
  }

  function updateSection(sectionId: string, field: keyof MaterialSectionEditor, value: string | number) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section,
      ),
    );
    setSaveState("idle");
  }

  async function saveMaterial() {
    if (!editor) return;

    setSaveState("saving");
    setErrorMessage(null);

    const { error: materialError } = await supabase
      .from("materials")
      .update({
        title: editor.title.trim(),
        introduction: editor.introduction?.trim() || null,
      })
      .eq("id", editor.id);

    if (materialError) {
      setSaveState("error");
      setErrorMessage("Não foi possível salvar o material.");
      return;
    }

    for (const section of sections) {
      const { error } = await supabase
        .from("material_sections")
        .update({
          title: section.title.trim(),
          content: section.content.trim(),
          position: section.position,
          section_type: section.section_type,
        })
        .eq("id", section.id)
        .eq("material_id", editor.id);

      if (error) {
        setSaveState("error");
        setErrorMessage("O material foi salvo, mas uma seção não pôde ser atualizada.");
        return;
      }
    }

    setItems((current) =>
      current.map((item) =>
        item.entity_id === editor.id
          ? { ...item, name: editor.title.trim(), updated_at: new Date().toISOString() }
          : item,
      ),
    );
    setSaveState("saved");
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
        Controle editorial do catálogo. Publique, retire ou revise materiais sem editar o banco diretamente.
      </p>

      {errorMessage && (
        <div className="mt-5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]" role="alert">
          {errorMessage}
        </div>
      )}

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

              <div className="flex flex-wrap items-center gap-2">
                {item.entity_type === "material" && (
                  <button
                    type="button"
                    onClick={() => void openMaterial(item.entity_id)}
                    className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs font-semibold text-[#0242D7]"
                  >
                    Editar material
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void toggle(item)}
                  disabled={busyId === item.entity_id}
                  className={
                    item.published
                      ? "rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-semibold text-[#166534]"
                      : "rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#64748B]"
                  }
                >
                  {busyId === item.entity_id
                    ? "Salvando..."
                    : item.published
                      ? "Publicado"
                      : "Rascunho"}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-sm text-[#64748B]">
              Nenhum item encontrado.
            </div>
          )}
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/30 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="material-editor-title">
          <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
                  Editor editorial
                </p>
                <h2 id="material-editor-title" className="mt-2 text-2xl font-semibold text-[#0F172A]">
                  Revisar material
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-md px-3 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Fechar
              </button>
            </div>

            {editorLoading ? (
              <div className="p-8">
                <div className="h-10 animate-pulse rounded-md bg-[#F1F5F9]" />
                <div className="mt-4 h-32 animate-pulse rounded-md bg-[#F1F5F9]" />
              </div>
            ) : (
              <>
                <div className="space-y-5 p-6">
                  <label className="block">
                    <span className="text-sm font-semibold text-[#334155]">Título</span>
                    <input
                      value={editor.title}
                      onChange={(event) => {
                        setEditor({ ...editor, title: event.target.value });
                        setSaveState("idle");
                      }}
                      className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-sm outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/20"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-[#334155]">Introdução</span>
                    <textarea
                      rows={5}
                      value={editor.introduction ?? ""}
                      onChange={(event) => {
                        setEditor({ ...editor, introduction: event.target.value });
                        setSaveState("idle");
                      }}
                      className="mt-2 w-full resize-y rounded-lg border border-[#E2E8F0] px-4 py-3 text-sm leading-6 outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/20"
                    />
                  </label>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-[#0F172A]">Seções</h3>
                        <p className="mt-1 text-sm text-[#64748B]">
                          Ajuste explicações, exemplos e revisão mantendo a progressão pedagógica.
                        </p>
                      </div>
                      <span className="text-xs font-medium text-[#64748B]">
                        {sections.length} partes
                      </span>
                    </div>

                    <div className="mt-4 space-y-4">
                      {sections.map((section, index) => (
                        <article key={section.id} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                          <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
                            <label>
                              <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                                Título
                              </span>
                              <input
                                value={section.title}
                                onChange={(event) => updateSection(section.id, "title", event.target.value)}
                                className="mt-1 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm outline-none focus:border-[#0242D7]"
                              />
                            </label>

                            <label>
                              <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                                Tipo
                              </span>
                              <select
                                value={section.section_type}
                                onChange={(event) => updateSection(section.id, "section_type", event.target.value)}
                                className="mt-1 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm outline-none focus:border-[#0242D7]"
                              >
                                {sectionTypeOptions.map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <label className="mt-3 block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                              Conteúdo · {sectionTypeLabels[section.section_type] ?? section.section_type}
                            </span>
                            <textarea
                              rows={7}
                              value={section.content}
                              onChange={(event) => updateSection(section.id, "content", event.target.value)}
                              className="mt-1 w-full resize-y rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#0242D7]"
                            />
                          </label>

                          <p className="mt-2 text-xs text-[#94A3B8]">Parte {index + 1}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] p-6">
                  <p className="text-sm text-[#64748B]" role="status">
                    {saveState === "saved"
                      ? "Alterações salvas."
                      : saveState === "saving"
                        ? "Salvando..."
                        : "As alterações só entram no conteúdo após salvar."}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditor(null)}
                      className="rounded-md border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveMaterial()}
                      disabled={saveState === "saving"}
                      className="rounded-md bg-[#0242D7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0038B8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saveState === "saving" ? "Salvando..." : "Salvar material"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
