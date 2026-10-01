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

interface TopicOption {
  id: string;
  name: string;
  disciplineName: string;
}

interface IngestionJob {
  id: string;
  topic_id: string | null;
  provider: string;
  query_text: string;
  stage: string;
  status: string;
  candidate_count: number;
  selected_count: number;
  error_message: string | null;
  created_at: string;
}

interface Candidate {
  id: string;
  provider: string;
  external_id: string | null;
  title: string;
  canonical_url: string;
  source_type: string;
  authors: Array<{ name?: string }>;
  publisher: string | null;
  publication_date: string | null;
  doi: string | null;
  relevance_score: number | null;
  validation_status: string;
  rights_class: string | null;
  access_model: string | null;
  rights_evidence_note: string | null;
  metadata: Record<string, unknown>;
}

const rightsLabels: Record<string, string> = {
  OPEN: "Uso compatível",
  METADATA_ONLY: "Somente referência",
  USER_AUTHORIZED: "Autorização do usuário",
  RESTRICTED: "Restrita",
  UNKNOWN: "Não verificada",
};

const providerLabels: Record<string, string> = {
  crossref: "Crossref",
  pubmed: "PubMed",
};

const stageLabels: Record<string, string> = {
  DISCOVERY: "Descoberta",
  VALIDATION: "Validação",
  EXTRACTION: "Extração",
  CLEANING: "Limpeza",
  STRUCTURING: "Estruturação",
  INDEXING: "Indexação",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
};

export const Route = createFileRoute("/admin/fontes")({
  component: AdminSources,
});

function AdminSources() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [topicId, setTopicId] = useState("");
  const [provider, setProvider] = useState<"crossref" | "pubmed">("crossref");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSources() {
    const { data } = await supabase.rpc("get_admin_source_overview");
    setSources((data ?? []) as SourceRow[]);
  }

  async function loadTopics() {
    const { data } = await supabase
      .from("topics")
      .select("id, name, disciplines(name)")
      .eq("published", true)
      .order("name", { ascending: true });

    setTopics(
      (data ?? []).map((topic) => {
        const discipline = Array.isArray(topic.disciplines)
          ? topic.disciplines[0]
          : topic.disciplines;

        return {
          id: topic.id,
          name: topic.name,
          disciplineName:
            discipline && typeof discipline === "object" && "name" in discipline
              ? String(discipline.name)
              : "Disciplina",
        };
      }),
    );
  }

  async function loadJobs() {
    const { data } = await supabase.rpc("admin_get_source_ingestion_jobs", {
      _limit: 12,
    });
    setJobs((data ?? []) as IngestionJob[]);
  }

  async function loadCandidates(jobId: string) {
    setSelectedJobId(jobId);
    setLoadingCandidates(true);

    const { data } = await supabase.rpc("admin_get_source_search_candidates", {
      _job_id: jobId,
      _limit: 50,
    });

    setCandidates((data ?? []) as Candidate[]);
    setLoadingCandidates(false);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([loadSources(), loadTopics(), loadJobs()]);
      setLoading(false);
    })();
  }, []);

  async function discover() {
    const cleanQuery = query.trim();
    if (!cleanQuery && !topicId) {
      setMessage("Informe uma busca ou selecione um tópico.");
      return;
    }

    setSearching(true);
    setMessage(null);
    setCandidates([]);
    setSelectedJobId(null);

    const { data, error } = await supabase.functions.invoke("source-discovery", {
      body: {
        topic_id: topicId || null,
        query: cleanQuery || null,
        provider,
        limit: 8,
      },
    });

    if (error || !data?.job_id) {
      let detail = data?.error;
      if (!detail && error) {
        detail = error.message;
      }
      setMessage(detail ?? "Não foi possível realizar a pesquisa.");
      setSearching(false);
      return;
    }

    setQuery("");
    await loadJobs();
    await loadCandidates(String(data.job_id));
    setMessage(
      String(data.candidate_count ?? 0) +
        " candidato(s) encontrados em " +
        (providerLabels[provider] ?? provider) +
        ".",
    );
    setSearching(false);
  }

  return (
    <section aria-labelledby="admin-sources-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Curadoria
      </p>
      <h1 id="admin-sources-title" className="mt-3 text-3xl font-bold text-[#0F172A]">
        Fontes acadêmicas
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#64748B]">
        Descubra candidatos acadêmicos, revise proveniência e valide direitos antes de transformar
        uma fonte em base de conteúdo do Ensina-me.
      </p>

      <div className="mt-8 rounded-2xl border border-[#DCE5EE] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0242D7]">
              Pesquisa
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#172334]">
              Descobrir fontes acadêmicas
            </h2>
          </div>
          <p className="text-xs text-[#7A8796]">
            A descoberta não presume licença ou direito de reutilização.
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px_160px]">
          <div>
            <label htmlFor="source-query" className="text-xs font-semibold text-[#475569]">
              Busca
            </label>
            <input
              id="source-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void discover();
              }}
              maxLength={300}
              placeholder="Ex.: alfabetização e letramento"
              className="mt-2 w-full rounded-xl border border-[#DCE5EE] bg-[#FBFCFE] px-4 py-3 text-sm text-[#334155] outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#0242D7]/15"
            />
          </div>

          <div>
            <label htmlFor="source-topic" className="text-xs font-semibold text-[#475569]">
              Tópico do Ensina-me
            </label>
            <select
              id="source-topic"
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#DCE5EE] bg-[#FBFCFE] px-4 py-3 text-sm text-[#334155] outline-none focus:border-[#0242D7]"
            >
              <option value="">Sem vínculo imediato</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.disciplineName} · {topic.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="source-provider" className="text-xs font-semibold text-[#475569]">
              Provedor
            </label>
            <select
              id="source-provider"
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value === "pubmed" ? "pubmed" : "crossref")
              }
              className="mt-2 w-full rounded-xl border border-[#DCE5EE] bg-[#FBFCFE] px-4 py-3 text-sm font-medium text-[#334155] outline-none focus:border-[#0242D7]"
            >
              <option value="crossref">Crossref</option>
              <option value="pubmed">PubMed</option>
            </select>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] px-4 py-3 text-sm text-[#31547E]"
          >
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={() => void discover()}
          disabled={searching}
          className="mt-5 rounded-xl bg-[#0242D7] px-5 py-3 text-sm font-bold text-white hover:bg-[#0038B8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {searching ? "Pesquisando..." : "Pesquisar fontes"}
        </button>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.9fr_1.4fr]">
        <section aria-labelledby="ingestion-jobs-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A8796]">
                Pipeline
              </p>
              <h2 id="ingestion-jobs-title" className="mt-1 text-lg font-bold text-[#172334]">
                Pesquisas recentes
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void loadJobs()}
              className="text-xs font-bold text-[#0242D7] hover:underline"
            >
              Atualizar
            </button>
          </div>

          <div className="mt-4 divide-y divide-[#E2E8F0] rounded-2xl border border-[#E2E8F0] bg-white">
            {jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => void loadCandidates(job.id)}
                className={
                  selectedJobId === job.id
                    ? "block w-full bg-[#F4F8FF] px-4 py-4 text-left"
                    : "block w-full px-4 py-4 text-left hover:bg-[#F8FAFC]"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#172334]">
                      {providerLabels[job.provider] ?? job.provider}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">
                      {job.query_text}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-[#0242D7]">
                    {job.candidate_count}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#7A8796]">
                  <span>{stageLabels[job.stage] ?? job.stage}</span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(job.created_at).toLocaleString("pt-BR")}</span>
                </div>
              </button>
            ))}

            {jobs.length === 0 && (
              <div className="p-6 text-sm text-[#64748B]">
                Nenhuma pesquisa executada ainda.
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="candidates-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A8796]">
                Candidatos
              </p>
              <h2 id="candidates-title" className="mt-1 text-lg font-bold text-[#172334]">
                Resultados para validação
              </h2>
            </div>
            {selectedJobId && (
              <span className="text-xs text-[#7A8796]">
                {loadingCandidates ? "Carregando..." : candidates.length + " registros"}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {candidates.map((candidate) => (
              <article key={candidate.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-6 text-[#172334]">{candidate.title}</h3>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {candidate.publisher ?? "Publicador não informado"}
                      {candidate.doi ? " · DOI " + candidate.doi : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-bold text-[#475569]">
                    {rightsLabels[candidate.rights_class ?? "UNKNOWN"] ?? "Não verificada"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#64748B]">Provedor</p>
                    <p className="mt-1 text-sm font-medium text-[#172334]">
                      {providerLabels[candidate.provider] ?? candidate.provider}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#64748B]">Relevância</p>
                    <p className="mt-1 text-sm font-medium text-[#172334]">
                      {candidate.relevance_score == null
                        ? "—"
                        : Math.round(candidate.relevance_score * 100) + "%"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#64748B]">Validação</p>
                    <p className="mt-1 text-sm font-medium text-[#172334]">
                      {candidate.validation_status}
                    </p>
                  </div>
                </div>

                {candidate.authors.length > 0 && (
                  <p className="mt-4 text-xs leading-5 text-[#64748B]">
                    {candidate.authors
                      .map((author) => author.name)
                      .filter(Boolean)
                      .join("; ")}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <a
                    href={candidate.canonical_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-[#0242D7] hover:underline"
                  >
                    Abrir fonte original ↗
                  </a>
                  {candidate.rights_evidence_note && (
                    <span className="text-xs text-[#7A8796]">
                      {candidate.rights_evidence_note}
                    </span>
                  )}
                </div>
              </article>
            ))}

            {selectedJobId && !loadingCandidates && candidates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-sm text-[#64748B]">
                Nenhum candidato foi registrado nesta pesquisa.
              </div>
            )}

            {!selectedJobId && (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-sm leading-6 text-[#64748B]">
                Execute uma pesquisa ou selecione uma pesquisa recente para revisar os candidatos.
              </div>
            )}
          </div>
        </section>
      </div>

      <section aria-labelledby="source-catalog-title" className="mt-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A8796]">
            Catálogo validado
          </p>
          <h2 id="source-catalog-title" className="mt-1 text-lg font-bold text-[#172334]">
            Fontes já usadas pelo Ensina-me
          </h2>
        </div>

        {loading ? (
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]" />
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {sources.map((source) => (
              <article key={source.source_id} className="rounded-xl border border-[#E2E8F0] bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#0F172A]">{source.title}</h3>
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
                    ? "Direitos verificados em " +
                      new Date(source.verified_at).toLocaleDateString("pt-BR")
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
    </section>
  );
}
