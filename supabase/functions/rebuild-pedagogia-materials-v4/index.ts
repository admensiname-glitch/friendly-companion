import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rebuild-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SourceRow = {
  id: string;
  title: string;
  source_type: string;
  publisher: string | null;
  doi: string | null;
  canonical_url: string;
};

type TopicRow = {
  id: string;
  name: string;
  description: string | null;
};

type GeneratedSection = {
  title: string;
  content: string;
  source_ids: string[];
};

type GeneratedMaterial = {
  introduction: string;
  sections: GeneratedSection[];
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const groqApiKey = Deno.env.get("GROQ_API_KEY")!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STOPWORDS = new Set([
  "para","como","entre","sobre","essa","esse","esta","este","isso","isto",
  "uma","umas","uns","dos","das","que","com","sem","por","pela","pelo",
  "nas","nos","num","numa","aos","seu","sua","seus","suas","mais","menos",
  "muito","muita","muitos","muitas","também","quando","onde","cada","ser",
  "são","tem","ter","não","nem","foi","sua","se","ou","e","de","da","do",
  "em","na","no","as","os","a","o"
]);

function cleanHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function invertAbstract(index: Record<string, number[]> | null): string {
  if (!index) return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.filter(Boolean).join(" ");
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "\n[trecho excedente omitido]";
}

function sanitizeGeneratedText(text: string): string {
  return text
    .replace(/\s*\([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\)/gi, "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function keywordsFor(topic: TopicRow, disciplineName: string): string[] {
  return [...new Set(
    (topic.name + " " + disciplineName + " " + (topic.description ?? ""))
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  )];
}

function selectRelevantEvidence(raw: string, topic: TopicRow, disciplineName: string, maxChars = 3600): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const keywords = keywordsFor(topic, disciplineName);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length >= 80);
  if (sentences.length === 0) return truncate(text, maxChars);

  const scored = sentences.map((sentence, index) => {
    const normalized = sentence.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let score = index < 10 ? 0.5 : 0;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) score += 1;
    }
    if (/define|conceit|educa|aprend|formac|alfabet|letr|avali|curric|histori|metod|pesqui|resultado|conclus/i.test(normalized)) score += 0.35;
    return { sentence, index, score };
  });

  const selected = scored
    .filter((x) => x.score > 0.5)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 28)
    .sort((a, b) => a.index - b.index)
    .map((x) => x.sentence);

  const opening = text.slice(0, Math.min(900, maxChars));
  const bodyParts: string[] = [];
  let total = opening.length;
  for (const sentence of selected) {
    if (bodyParts.includes(sentence)) continue;
    if (total + sentence.length + 1 > maxChars) break;
    bodyParts.push(sentence);
    total += sentence.length + 1;
  }
  return truncate([opening, ...bodyParts].filter(Boolean).join(" "), maxChars);
}

async function fetchOpenAlexAbstract(source: SourceRow): Promise<string> {
  if (!source.doi) return "";
  try {
    const id = encodeURIComponent("https://doi.org/" + source.doi);
    const res = await fetch("https://api.openalex.org/works/" + id, {
      headers: { "User-Agent": "Ensina-me Academic Research/1.0" },
    });
    if (!res.ok) return "";
    const data = await res.json();
    return invertAbstract(data?.abstract_inverted_index ?? null);
  } catch {
    return "";
  }
}

async function fetchSource(source: SourceRow): Promise<string> {
  try {
    const res = await fetch(source.canonical_url, {
      headers: {
        "User-Agent": "Ensina-me Academic Research/1.0",
        "Accept": "text/html,application/xhtml+xml,text/plain,application/pdf;q=0.9,*/*;q=0.7",
      },
      redirect: "follow",
    });
    if (res.ok) {
      const type = res.headers.get("content-type") ?? "";
      if (type.includes("text/html") || type.includes("application/xhtml")) {
        const text = cleanHtml(await res.text());
        if (text.length > 400) return text;
      }
      if (type.includes("text/plain")) {
        const text = await res.text();
        if (text.length > 400) return text;
      }
    }
  } catch {
    // fallback below
  }
  return await fetchOpenAlexAbstract(source);
}

async function discoverOpenAlex(topic: TopicRow, disciplineName: string): Promise<SourceRow[]> {
  const topicKeywords = keywordsFor(topic, disciplineName);
  const coreKeywords = keywordsFor(topic, "");
  const queries = [
    topic.name + " " + disciplineName + " educação",
    topic.name + " " + disciplineName + " Brasil",
  ];

  try {
    const out: SourceRow[] = [];
    for (const query of queries) {
      const q = encodeURIComponent(query);
      const url = "https://api.openalex.org/works?search=" + q +
        "&per-page=8&select=id,title,doi,publication_year,primary_location,open_access,abstract_inverted_index";

      const res = await fetch(url, {
        headers: { "User-Agent": "Ensina-me Academic Research/1.0" },
      });
      if (!res.ok) continue;

      const data = await res.json();
      for (const work of data.results ?? []) {
        if (!work.title) continue;

        const abstractText = invertAbstract(work.abstract_inverted_index ?? null);
        const combined = (work.title + " " + abstractText)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        const titleNorm = String(work.title)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        const matchedTitle = topicKeywords.filter((k) => titleNorm.includes(k)).length;
        const matchedAbstract = topicKeywords.filter((k) => combined.includes(k)).length;
        const matchedTitleCore = coreKeywords.filter((k) => titleNorm.includes(k)).length;
        const matchedAbstractCore = coreKeywords.filter((k) => combined.includes(k)).length;

        const enoughRelevance = coreKeywords.length <= 1
          ? (matchedTitleCore >= 1 || matchedAbstractCore >= 3)
          : (
              matchedTitleCore >= 2 ||
              (matchedTitleCore >= 1 && matchedAbstractCore >= 2) ||
              matchedAbstractCore >= 4
            );

        if (!enoughRelevance) continue;

        const landing =
          work.best_oa_location?.landing_page_url ??
          work.best_oa_location?.pdf_url ??
          work.primary_location?.landing_page_url ??
          work.primary_location?.pdf_url ??
          null;

        const doi = typeof work.doi === "string"
          ? work.doi.replace("https://doi.org/","")
          : null;

        if (!landing && !doi) continue;

        let existing: SourceRow | null = null;

        if (doi) {
          const found = await admin.from("sources")
            .select("id,title,source_type,publisher,doi,canonical_url")
            .eq("doi", doi)
            .limit(1)
            .maybeSingle();
          existing = (found.data as SourceRow | null) ?? null;
        }

        if (!existing && landing) {
          const found = await admin.from("sources")
            .select("id,title,source_type,publisher,doi,canonical_url")
            .eq("canonical_url", landing)
            .limit(1)
            .maybeSingle();
          existing = (found.data as SourceRow | null) ?? null;
        }

        if (existing) {
          if (!out.some((s) => s.id === existing!.id)) out.push(existing);
          await admin.from("topic_sources").upsert({
            topic_id: topic.id,
            source_id: existing.id,
            role: "COMPLEMENTAR",
            status: "APPROVED",
          }, { onConflict: "topic_id,source_id" });
        } else {
          const canonical = landing ?? ("https://doi.org/" + doi);
          const inserted = await admin.from("sources").insert({
            title: work.title,
            source_type: "article",
            publisher: null,
            publication_date: work.publication_year
              ? String(work.publication_year) + "-01-01"
              : null,
            doi,
            canonical_url: canonical,
            language: "pt",
            status: "active",
          }).select("id,title,source_type,publisher,doi,canonical_url").single();

          if (inserted.data) {
            const source = inserted.data as SourceRow;
            if (!out.some((s) => s.id === source.id)) out.push(source);

            await admin.from("topic_sources").upsert({
              topic_id: topic.id,
              source_id: source.id,
              role: "COMPLEMENTAR",
              status: "APPROVED",
            }, { onConflict: "topic_id,source_id" });
          }
        }

        if (out.length >= 2) return out;
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function findLocalAcademicSources(topic: TopicRow, disciplineName: string): Promise<SourceRow[]> {
  const keywords = keywordsFor(topic, disciplineName);
  const { data } = await admin
    .from("sources")
    .select("id,title,source_type,publisher,doi,canonical_url")
    .eq("status", "active")
    .in("source_type", ["article","open_educational_resource","PUBLICATION"])
    .limit(1000);

  const ranked = (data ?? []).map((source: SourceRow) => {
    const titleNorm = source.title.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matches = keywords.filter((k) => titleNorm.includes(k)).length;
    return { source, matches };
  })
  .filter((x) => x.matches > 0)
  .sort((a,b) => b.matches - a.matches)
  .slice(0, 4)
  .map((x) => x.source);

  return ranked;
}

async function crossrefSearch(topic: TopicRow, disciplineName: string): Promise<SourceRow[]> {
  try {
    const q = encodeURIComponent(topic.name + " " + disciplineName);
    const url = "https://api.crossref.org/works?query.bibliographic=" + q + "&rows=8&select=DOI,title,published,URL";
    const res = await fetch(url, { headers: { "User-Agent": "Ensina-me Academic Research/1.0" } });
    if (!res.ok) return [];
    const data = await res.json();
    const keywords = keywordsFor(topic, disciplineName);
    const out: SourceRow[] = [];

    for (const item of data?.message?.items ?? []) {
      const title = Array.isArray(item.title) ? item.title[0] : "";
      if (!title) continue;
      const titleNorm = String(title).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matches = keywords.filter((k) => titleNorm.includes(k)).length;
      if (matches < Math.max(1, Math.min(2, keywords.length))) continue;

      const doi = typeof item.DOI === "string" ? item.DOI : null;
      const canonical = typeof item.URL === "string"
        ? item.URL
        : (doi ? "https://doi.org/" + doi : null);
      if (!doi || !canonical) continue;

      const existing = await admin.from("sources")
        .select("id,title,source_type,publisher,doi,canonical_url")
        .eq("doi", doi)
        .limit(1)
        .maybeSingle();

      if (existing.data) {
        out.push(existing.data as SourceRow);
      } else {
        const inserted = await admin.from("sources").insert({
          title,
          source_type: "article",
          publisher: null,
          publication_date: item.published?.["date-parts"]?.[0]?.length
            ? String(item.published["date-parts"][0][0]) + "-01-01"
            : null,
          doi,
          canonical_url: canonical,
          language: "pt",
          status: "active",
        }).select("id,title,source_type,publisher,doi,canonical_url").single();
        if (inserted.data) out.push(inserted.data as SourceRow);
      }

      if (out.length >= 2) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function getMaterialSources(topic: TopicRow, disciplineName: string): Promise<SourceRow[]> {
  const linked = await admin
    .from("topic_sources")
    .select("source_id, sources(id,title,source_type,publisher,doi,canonical_url)")
    .eq("topic_id", topic.id)
    .eq("status", "APPROVED");

  const linkedAcademic: SourceRow[] = [];
  for (const row of linked.data ?? []) {
    const s = row.sources;
    if (s && typeof s === "object" && "id" in s) {
      const source = s as SourceRow;
      if (["article","open_educational_resource","PUBLICATION"].includes(source.source_type)) {
        linkedAcademic.push(source);
      }
    }
  }

  const local = linkedAcademic.length < 2
    ? await findLocalAcademicSources(topic, disciplineName)
    : [];

  const crossref = [...linkedAcademic, ...local].length < 2
    ? await crossrefSearch(topic, disciplineName)
    : [];

  const openalex = [...linkedAcademic, ...local, ...crossref].length < 2
    ? await discoverOpenAlex(topic, disciplineName)
    : [];

  return [...linkedAcademic, ...local, ...crossref, ...openalex]
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
    .slice(0, 2);
}

function sourceEvidence(source: SourceRow, text: string, topic: TopicRow, disciplineName: string): string {
  const metadata = [
    "FONTE: " + source.title,
    source.publisher ? "PUBLICADOR: " + source.publisher : "",
    source.doi ? "DOI: " + source.doi : "",
    "URL: " + source.canonical_url,
  ].filter(Boolean).join("\n");
  return metadata + "\nTRECHOS RELEVANTES RECUPERADOS:\n" +
    selectRelevantEvidence(text, topic, disciplineName, 3600);
}

function validOutput(value: unknown): value is GeneratedMaterial {
  if (!value || typeof value !== "object") return false;
  const x = value as Record<string, unknown>;
  if (typeof x.introduction !== "string" || x.introduction.trim().length < 120) return false;
  if (!Array.isArray(x.sections) || x.sections.length !== 10) return false;
  return x.sections.every((s) => {
    if (!s || typeof s !== "object") return false;
    const o = s as Record<string, unknown>;
    return typeof o.title === "string" &&
      o.title.trim().length > 0 &&
      typeof o.content === "string" &&
      o.content.trim().length >= 180 &&
      Array.isArray(o.source_ids) &&
      o.source_ids.length > 0 &&
      o.source_ids.every((id) => typeof id === "string");
  });
}

async function generate(topic: TopicRow, disciplineName: string, sources: SourceRow[]): Promise<GeneratedMaterial> {
  const evidences: string[] = [];
  for (const source of sources) {
    const raw = await fetchSource(source);
    evidences.push(sourceEvidence(source, raw, topic, disciplineName));
  }

  const evidenceBlock = truncate(
    evidences.join("\n\n====================\n\n"),
    7600,
  );
  const sourceIds = sources.map((s) => s.id);
  const sourceRefs = sources.map((s, index) => ({
    ref: "SOURCE_" + (index + 1),
    id: s.id,
    title: s.title,
  }));

  const prompt = [
    "Você é o redator acadêmico do Ensina-me.",
    "Reconstrua integralmente o material do tópico usando SOMENTE as evidências fornecidas.",
    "Sintetize, reorganize e parafraseie fielmente. Cada parágrafo deve ser uma paráfrase próxima de uma ou mais afirmações presentes nas EVIDÊNCIAS; não acrescente conhecimento externo, exemplos inventados, autores ausentes, dados ausentes, causas, benefícios ou consequências que a fonte não declare. Quando houver dúvida, prefira uma formulação descritiva (\"a fonte discute\", \"o estudo analisa\", \"o artigo caracteriza\") a uma conclusão própria.",
    "Quando as fontes divergirem, preserve e atribua a diferença.",
    "O texto deve ser específico deste tópico, com terminologia técnica e recortes substantivos; não escreva um roteiro didático genérico. Não transforme uma discussão teórica em promessa de impacto, eficácia, melhoria ou resultado. Não invente aplicações profissionais.",
    "Não use frases-padrão, instruções ao estudante, boilerplate ou seções com conteúdo repetido.",
    "A introdução deve delimitar o objeto e os principais eixos documentados em prosa natural, sem enumerações artificiais.",
    "Escreva para um estudante universitário: prefira frases claras e encadeadas. Evite construções típicas de relatório, como listas de ideias dentro de uma frase marcadas por (i), (ii), (iii), (iv), algarismos romanos ou outros rótulos numerados. Quando houver várias ideias, conecte-as em prosa ou distribua-as entre parágrafos/seções.",
    "Não use parênteses para numerar argumentos. Evite sequências como (i), (ii), (iii), (iv), (v), (vi), (vii), (viii), (ix) e (x) no conteúdo destinado ao estudante.",
    "Não deixe erros de digitação ou palavras truncadas no texto gerado. Revise ortografia, concordância e fluidez antes de responder; preserve nomes e títulos de fontes somente quando estiver citando ou nomeando a obra.",
    "Gere exatamente 10 seções, com títulos específicos. Cada seção deve ter 2 a 4 parágrafos e pelo menos 180 caracteres.",
    "source_ids deve conter somente os identificadores SOURCE_1, SOURCE_2 etc. das fontes que sustentam diretamente aquela seção.",
    "NUNCA escreva UUIDs, ids internos, chaves técnicas ou identificadores de banco dentro de introduction, title ou content.",
    "Os UUIDs reais são internos do sistema e não devem aparecer no texto. Use apenas SOURCE_1, SOURCE_2 etc. no campo source_ids.",
    "JSON válido: {introduction:string, sections:[{title:string, content:string, source_ids:string[]}]}",
    "",
    "DISCIPLINA: " + disciplineName,
    "TÓPICO: " + topic.name,
    topic.description ? "DESCRIÇÃO: " + topic.description : "",
    "",
    "FONTES DISPONÍVEIS:",
    sourceRefs.map((s) => s.ref + " :: " + s.title).join("\n"),
    "",
    "EVIDÊNCIAS:",
    evidenceBlock,
  ].filter(Boolean).join("\n");

  let response: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + groqApiKey,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Reescreva o material agora, respeitando integralmente as fontes." },
        ],
        max_completion_tokens: 2200,
        temperature: 0.05,
        reasoning_effort: "low",
        include_reasoning: false,
        response_format: { type: "json_object" },
      }),
    });

    if (response.status !== 429 || attempt === 2) break;

    const body = await response.text();
    if (/tokens per day|daily|TPD/i.test(body)) {
      throw new Error("Groq: cota diária de tokens esgotada.");
    }

    const match = body.match(/try again in ([0-9.]+)s/i);
    const seconds = match ? Math.min(Math.max(Number(match[1]), 1), 30) : 10;
    await new Promise((resolve) => setTimeout(resolve, Math.round(seconds * 1000)));
  }

  if (!response || !response.ok) {
    const errorBody = response ? await response.text() : "sem resposta";
    throw new Error("Groq HTTP " + (response?.status ?? 0) + ": " + errorBody.slice(0, 1200));
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  let parsed: unknown = null;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    throw new Error("Groq retornou JSON inválido para " + topic.name);
  }

  if (!validOutput(parsed)) throw new Error("Saída inválida para " + topic.name);

  const sourceRefToId = new Map(sourceRefs.map((source) => [source.ref, source.id]));
  const allowed = new Set(sourceIds);

  parsed.introduction = sanitizeGeneratedText(parsed.introduction);
  for (const section of parsed.sections) {
    section.title = sanitizeGeneratedText(section.title);
    section.content = sanitizeGeneratedText(section.content);
    section.source_ids = [...new Set(section.source_ids)]
      .map((ref: string) => sourceRefToId.get(ref) ?? (allowed.has(ref) ? ref : null))
      .filter((id): id is string => typeof id === "string" && allowed.has(id));

    if (section.source_ids.length === 0) {
      throw new Error("Seção sem fonte em " + topic.name);
    }
  }

  return parsed;
}

async function rebuildTopic(topic: TopicRow, disciplineName: string): Promise<void> {
  const materialResult = await admin
    .from("materials")
    .select("id,title")
    .eq("topic_id", topic.id)
    .maybeSingle();

  if (!materialResult.data) throw new Error("Material ausente: " + topic.name);
  const materialId = materialResult.data.id;

  const sources = await getMaterialSources(topic, disciplineName);
  if (sources.length === 0) {
    throw new Error("Sem fonte acadêmica para: " + disciplineName + " / " + topic.name);
  }

  const run = await admin.from("material_generation_runs").insert({
    topic_id: topic.id,
    material_id: materialId,
    status: "running",
    model_name: "openai/gpt-oss-120b",
    prompt_version: "academic_rebuild_v10_safe_source_refs",
    source_count: sources.length,
    started_at: new Date().toISOString(),
  }).select("id").single();

  if (run.error) throw run.error;
  const runId = run.data?.id ?? null;

  try {
    const generated = await generate(topic, disciplineName, sources);

    const updatedMaterial = await admin.from("materials").update({
      introduction: generated.introduction.trim(),
      updated_at: new Date().toISOString(),
      status: "published",
    }).eq("id", materialId);

    if (updatedMaterial.error) throw updatedMaterial.error;

    const old = await admin
      .from("material_sections")
      .select("id,position,section_type")
      .eq("material_id", materialId);

    if (old.error) throw old.error;

    for (const row of old.data ?? []) {
      const del = await admin.from("material_citations").delete().eq("section_id", row.id);
      if (del.error) throw del.error;
    }

    for (let index = 0; index < generated.sections.length; index++) {
      const section = generated.sections[index];
      const existing = (old.data ?? []).find((row) => row.position === index + 1);
      let sectionId = existing?.id;

      const payload = {
        material_id: materialId,
        title: section.title.trim(),
        content: section.content.trim(),
        position: index + 1,
        section_type: existing?.section_type ?? "explanation",
        updated_at: new Date().toISOString(),
      };

      if (sectionId) {
        const updated = await admin.from("material_sections").update(payload).eq("id", sectionId);
        if (updated.error) throw updated.error;
      } else {
        const inserted = await admin.from("material_sections").insert(payload).select("id").single();
        if (inserted.error || !inserted.data) {
          throw inserted.error ?? new Error("Falha ao criar seção");
        }
        sectionId = inserted.data.id;
      }

      for (const sourceId of section.source_ids) {
        const source = sources.find((s) => s.id === sourceId);
        if (!source) throw new Error("Fonte inexistente na saída");

        const insertedCitation = await admin.from("material_citations").insert({
          material_id: materialId,
          section_id: sectionId,
          source_id: sourceId,
          citation_label: source.title,
          locator: source.doi ?? source.canonical_url,
        });

        if (insertedCitation.error) throw insertedCitation.error;
      }
    }

    if (runId) {
      await admin.from("material_generation_runs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        error_message: null,
      }).eq("id", runId);
    }
  } catch (error) {
    if (runId) {
      await admin.from("material_generation_runs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : JSON.stringify(error),
      }).eq("id", runId);
    }
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // O token administrativo trafega apenas por header — nunca em query string,
    // para não vazar em logs, histórico de navegador ou caches de proxy.
    // Preferred: "Authorization: Bearer <token>"; x-rebuild-token kept for the internal runner.
    const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const headerToken = req.headers.get("x-rebuild-token") ?? "";

    const authRow = await admin
      .from("internal_content_rebuild_auth")
      .select("token")
      .eq("id", 1)
      .maybeSingle();

    const expected = authRow.data?.token ?? "";
    const safeEqual = (a: string, b: string) => {
      if (!a || !b || a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      return diff === 0;
    };

    if (!expected || !(safeEqual(headerToken, expected) || safeEqual(bearer, expected))) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "GET" ? {} : await req.json();

    const disciplineId =
      typeof body?.discipline_id === "string"
        ? body.discipline_id
        : url.searchParams.get("discipline_id");

    const topicIds = Array.isArray(body?.topic_ids)
      ? body.topic_ids.filter((x: unknown) => typeof x === "string")
      : (url.searchParams.get("topic_ids") ?? "").split(",").filter(Boolean);

    const disciplineIds = Array.isArray(body?.discipline_ids)
      ? body.discipline_ids.filter((x: unknown) => typeof x === "string")
      : (url.searchParams.get("discipline_ids") ?? "").split(",").filter(Boolean);

    const limit = Math.min(
      Math.max(Number(body?.limit ?? url.searchParams.get("limit") ?? 1), 1),
      2,
    );

    const completedRows = await admin
      .from("material_generation_runs")
      .select("topic_id")
      .eq("status", "completed");

    if (completedRows.error) throw completedRows.error;
    const completed = new Set(
      (completedRows.data ?? []).map((row: { topic_id: string }) => row.topic_id),
    );

    const topicResult = await admin
      .from("topics")
      .select("id,name,description,discipline_id,position,disciplines(name,course_id)")
      .eq("published", true)
      .eq("disciplines.course_id", "b1733380-f5bf-435d-b516-ae5a489e0c46")
      .order("discipline_id", { ascending: true })
      .order("position", { ascending: true })
      .limit(1000);

    if (topicResult.error) throw topicResult.error;

    const selected = (topicResult.data ?? [])
      .filter((topic) => !disciplineId || topic.discipline_id === disciplineId)
      .filter((topic) => disciplineIds.length === 0 || disciplineIds.includes(topic.discipline_id))
      .filter((topic) => topicIds.length === 0 || topicIds.includes(topic.id))
      .filter((topic) => !completed.has(topic.id))
      .slice(0, limit);

    const processed: string[] = [];
    const failures: Array<{ topic_id: string; topic: string; error: string }> = [];

    for (const raw of selected) {
      const topic = raw as TopicRow & {
        disciplines: { name: string; course_id: string } | null;
      };

      try {
        await rebuildTopic(topic, topic.disciplines?.name ?? "Pedagogia");
        processed.push(topic.id + ":" + topic.name);
      } catch (error) {
        failures.push({
          topic_id: topic.id,
          topic: topic.name,
          error: error instanceof Error ? error.message : JSON.stringify(error),
        });
      }
    }

    return new Response(JSON.stringify({
      processed,
      failures,
      model: "openai/gpt-oss-120b",
      prompt_version: "academic_rebuild_v10_safe_source_refs",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});