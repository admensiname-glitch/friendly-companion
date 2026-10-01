import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Provider = "crossref" | "pubmed";

type Body = {
  topic_id?: string | null;
  query?: string | null;
  provider?: Provider;
  limit?: number;
};

type Candidate = {
  provider: Provider;
  external_id: string | null;
  title: string;
  canonical_url: string;
  source_type: string;
  authors: Array<{ name: string }>;
  publisher: string | null;
  publication_date: string | null;
  doi: string | null;
  language: string | null;
  relevance_score: number;
  metadata: Record<string, unknown>;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relevance(query: string, title: string, providerScore?: unknown): number {
  const q = new Set(normalize(query).split(" ").filter((item) => item.length > 2));
  const t = new Set(normalize(title).split(" ").filter((item) => item.length > 2));
  if (q.size === 0) return 0;

  let overlap = 0;
  for (const token of q) {
    if (t.has(token)) overlap += 1;
  }

  const lexical = overlap / q.size;
  const score = typeof providerScore === "number" && Number.isFinite(providerScore)
    ? Math.max(0, Math.min(1, providerScore / 100))
    : 0;

  return Number(Math.min(1, lexical * 0.8 + score * 0.2).toFixed(4));
}

function crossrefDate(item: Record<string, unknown>): string | null {
  for (const key of ["published-print", "published-online", "published", "issued", "created"]) {
    const value = item[key];
    if (!value || typeof value !== "object") continue;
    const parts = (value as { "date-parts"?: unknown })["date-parts"];
    if (!Array.isArray(parts) || !Array.isArray(parts[0])) continue;
    const numbers = parts[0].map((part) => Number(part));
    const year = numbers[0];
    if (!Number.isFinite(year) || year < 1000) continue;
    const month = Number.isFinite(numbers[1]) ? numbers[1] : 1;
    const day = Number.isFinite(numbers[2]) ? numbers[2] : 1;
    return year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }
  return null;
}

function crossrefAuthors(item: Record<string, unknown>) {
  if (!Array.isArray(item.author)) return [];
  return item.author
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const author = raw as Record<string, unknown>;
      const given = typeof author.given === "string" ? author.given.trim() : "";
      const family = typeof author.family === "string" ? author.family.trim() : "";
      const name = [given, family].filter(Boolean).join(" ");
      return name ? { name } : null;
    })
    .filter((value): value is { name: string } => Boolean(value))
    .slice(0, 12);
}

async function searchCrossref(query: string, limit: number): Promise<Candidate[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", query);
  url.searchParams.set("rows", String(limit));
  url.searchParams.set(
    "select",
    "DOI,title,author,publisher,published,published-print,published-online,URL,type,language,container-title,score,link,license",
  );

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Ensina-me/1.0 (academic content discovery)",
    },
  });

  if (!response.ok) {
    throw new Error("Crossref respondeu HTTP " + response.status);
  }

  const payload = await response.json() as {
    message?: { items?: unknown[] };
  };
  const items = Array.isArray(payload.message?.items) ? payload.message.items : [];

  return items
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const item = raw as Record<string, unknown>;
      const titles = Array.isArray(item.title)
        ? item.title.filter((value): value is string => typeof value === "string")
        : [];
      const title = titles[0]?.trim() ?? "";
      const doi = typeof item.DOI === "string" ? item.DOI.trim() : "";
      const url = doi
        ? "https://doi.org/" + doi
        : typeof item.URL === "string"
          ? item.URL.trim()
          : "";
      if (!title || !url) return null;

      const containerTitle = Array.isArray(item["container-title"])
        ? item["container-title"].filter((value): value is string => typeof value === "string")[0] ?? null
        : null;

      return {
        provider: "crossref" as const,
        external_id: doi ? "doi:" + doi : "url:" + url,
        title,
        canonical_url: url,
        source_type: typeof item.type === "string" ? item.type : "journal-article",
        authors: crossrefAuthors(item),
        publisher: typeof item.publisher === "string" ? item.publisher : containerTitle,
        publication_date: crossrefDate(item),
        doi: doi || null,
        language: typeof item.language === "string" ? item.language : null,
        relevance_score: relevance(query, title, item.score),
        metadata: {
          container_title: containerTitle,
          crossref_score: typeof item.score === "number" ? item.score : null,
          links: Array.isArray(item.link) ? item.link.slice(0, 3) : [],
          licenses: Array.isArray(item.license) ? item.license.slice(0, 5) : [],
        },
      } satisfies Candidate;
    })
    .filter((value): value is Candidate => Boolean(value));
}

function pubmedIds(articleids: unknown) {
  const result = { doi: null as string | null, pmcid: null as string | null };
  if (!Array.isArray(articleids)) return result;

  for (const raw of articleids) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const idtype = typeof item.idtype === "string" ? item.idtype : "";
    const value = typeof item.value === "string" ? item.value.trim() : "";
    if (idtype === "doi" && value && !result.doi) result.doi = value;
    if (idtype === "pmc" && value && !result.pmcid) result.pmcid = value;
  }
  return result;
}

function parsePubmedDate(pubdate: string): string | null {
  const match = pubdate.match(/(\d{4})(?:\s+([A-Za-z]{3}))?/);
  if (!match?.[1]) return null;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthIndex = monthNames.indexOf(match[2] ?? "");
  const month = monthIndex >= 0 ? monthIndex + 1 : 1;
  return match[1] + "-" + String(month).padStart(2, "0") + "-01";
}

async function searchPubmed(query: string, limit: number): Promise<Candidate[]> {
  const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchUrl.searchParams.set("db", "pubmed");
  searchUrl.searchParams.set("term", query);
  searchUrl.searchParams.set("retmode", "json");
  searchUrl.searchParams.set("retmax", String(limit));
  searchUrl.searchParams.set("sort", "relevance");

  const searchResponse = await fetch(searchUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Ensina-me/1.0 (academic content discovery)",
    },
  });
  if (!searchResponse.ok) {
    throw new Error("PubMed ESearch respondeu HTTP " + searchResponse.status);
  }

  const searchPayload = await searchResponse.json() as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = Array.isArray(searchPayload.esearchresult?.idlist)
    ? searchPayload.esearchresult.idlist
    : [];
  if (ids.length === 0) return [];

  const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
  summaryUrl.searchParams.set("db", "pubmed");
  summaryUrl.searchParams.set("id", ids.join(","));
  summaryUrl.searchParams.set("retmode", "json");

  const summaryResponse = await fetch(summaryUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Ensina-me/1.0 (academic content discovery)",
    },
  });
  if (!summaryResponse.ok) {
    throw new Error("PubMed ESummary respondeu HTTP " + summaryResponse.status);
  }

  const payload = await summaryResponse.json() as { result?: Record<string, unknown> };
  const result = payload.result ?? {};

  return ids
    .map((pmid) => {
      const raw = result[pmid];
      if (!raw || typeof raw !== "object") return null;
      const item = raw as Record<string, unknown>;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) return null;

      const identifiers = pubmedIds(item.articleids);
      const canonicalUrl = "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/";

      const authors = Array.isArray(item.authors)
        ? item.authors
            .map((rawAuthor) => {
              if (!rawAuthor || typeof rawAuthor !== "object") return null;
              const name = typeof (rawAuthor as Record<string, unknown>).name === "string"
                ? String((rawAuthor as Record<string, unknown>).name).trim()
                : "";
              return name ? { name } : null;
            })
            .filter((value): value is { name: string } => Boolean(value))
            .slice(0, 12)
        : [];

      const pubdate = typeof item.pubdate === "string" ? item.pubdate.trim() : "";

      return {
        provider: "pubmed" as const,
        external_id: "pmid:" + pmid,
        title,
        canonical_url: canonicalUrl,
        source_type: "pubmed-article",
        authors,
        publisher: typeof item.fulljournalname === "string" ? item.fulljournalname : null,
        publication_date: parsePubmedDate(pubdate),
        doi: identifiers.doi,
        language: null,
        relevance_score: relevance(query, title),
        metadata: {
          pmid,
          pmcid: identifiers.pmcid,
          journal: typeof item.fulljournalname === "string" ? item.fulljournalname : null,
          pubdate,
        },
      } satisfies Candidate;
    })
    .filter((value): value is Candidate => Boolean(value));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Configuração do Supabase ausente." }, 500);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Não autenticado." }, 401);

  const token = authorization.slice("Bearer ".length).trim();
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userResult, error: userError } = await admin.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user) return json({ error: "Sessão inválida." }, 401);

  const { data: role, error: roleError } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !role) return json({ error: "Acesso administrativo negado." }, 403);

  let body: Body;
  try {
    body = await req.json() as Body;
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const provider = body.provider === "pubmed" ? "pubmed" : "crossref";
  const limit = Math.max(1, Math.min(Math.trunc(Number(body.limit ?? 8)) || 8, 20));
  const topicId = typeof body.topic_id === "string" && body.topic_id.trim()
    ? body.topic_id.trim()
    : null;
  let query = typeof body.query === "string" ? body.query.trim() : "";

  if (topicId) {
    const { data: topic, error: topicError } = await admin
      .from("topics")
      .select("id,name,description,discipline_id")
      .eq("id", topicId)
      .eq("published", true)
      .maybeSingle();

    if (topicError || !topic) {
      return json({ error: "Tópico não encontrado ou não publicado." }, 404);
    }

    const { data: discipline } = await admin
      .from("disciplines")
      .select("name")
      .eq("id", topic.discipline_id)
      .maybeSingle();

    if (!query) query = String(discipline?.name ?? "") + " " + topic.name;
  }

  if (!query) return json({ error: "Informe uma consulta ou um tópico." }, 400);
  if (query.length > 300) return json({ error: "A consulta é muito longa." }, 400);

  const { data: job, error: jobError } = await admin
    .from("source_ingestion_jobs")
    .insert({
      topic_id: topicId,
      provider,
      query_text: query,
      requested_by: user.id,
      stage: "DISCOVERY",
      status: "RUNNING",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) return json({ error: "Não foi possível criar o trabalho de pesquisa." }, 500);

  try {
    const candidates = provider === "pubmed"
      ? await searchPubmed(query, limit)
      : await searchCrossref(query, limit);

    const uniqueCandidates = Array.from(
      new Map(candidates.map((candidate) => [candidate.canonical_url, candidate])).values(),
    );

    if (uniqueCandidates.length > 0) {
      const rows = uniqueCandidates.map((candidate) => ({
        job_id: job.id,
        provider: candidate.provider,
        external_id: candidate.external_id,
        title: candidate.title,
        canonical_url: candidate.canonical_url,
        source_type: candidate.source_type,
        authors: candidate.authors,
        publisher: candidate.publisher,
        publication_date: candidate.publication_date,
        doi: candidate.doi,
        language: candidate.language,
        relevance_score: candidate.relevance_score,
        validation_status: "DISCOVERED",
        rights_class: "UNKNOWN",
        access_model: "UNKNOWN",
        rights_evidence_note: "Licença e permissões não foram inferidas na descoberta; validar a fonte antes de usar o conteúdo.",
        metadata: candidate.metadata,
      }));

      const { error: insertError } = await admin
        .from("source_search_candidates")
        .insert(rows);
      if (insertError) throw new Error("Falha ao registrar candidatos: " + insertError.message);
    }

    await admin
      .from("source_ingestion_jobs")
      .update({
        stage: "VALIDATION",
        status: "SUCCEEDED",
        candidate_count: uniqueCandidates.length,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          provider,
          query,
          limit,
          discovery_policy: "metadata_first_no_rights_inference",
        },
      })
      .eq("id", job.id);

    return json({
      job_id: job.id,
      provider,
      query,
      candidate_count: uniqueCandidates.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";

    await admin
      .from("source_ingestion_jobs")
      .update({
        stage: "FAILED",
        status: "FAILED",
        error_message: message.slice(0, 1000),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return json({ error: "A pesquisa não pôde ser concluída.", job_id: job.id }, 502);
  }
});
