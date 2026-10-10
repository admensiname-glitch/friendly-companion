import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const groqApiKey = Deno.env.get("GROQ_API_KEY")!;
const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const VERSION = "professor-readonly-v1";
const MODEL = "openai/gpt-oss-120b";
const out = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" }
});
const isObj = (x: unknown): x is Record<string, any> => !!x && typeof x === "object" && !Array.isArray(x);

async function getUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await db.auth.getUser(auth.slice(7));
  return error ? null : data.user;
}
async function askGroq(system: string, payload: unknown) {
  if (!groqApiKey) throw new Error("GROQ_API_KEY is not configured");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + groqApiKey },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(payload) }
      ],
      temperature: 0.1,
      max_completion_tokens: 1800,
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) throw new Error("Groq HTTP " + response.status + ": " + (await response.text()).slice(0, 600));
  const body = await response.json();
  const raw = body?.choices?.[0]?.message?.content;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : null;
  if (!isObj(parsed) || !Array.isArray(parsed.findings) || !Number.isFinite(parsed.score)) {
    throw new Error("Groq returned an invalid audit structure");
  }
  parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));
  if (!["needs_review", "confirmed_issue", "no_issue_detected", "human_review"].includes(parsed.status)) parsed.status = "human_review";
  parsed.findings = parsed.findings.slice(0, 12).map((f: any) => ({
    severity: ["critical", "high", "medium", "low", "info"].includes(f?.severity) ? f.severity : "medium",
    dimension: String(f?.dimension ?? "general").slice(0, 80),
    issue: String(f?.issue ?? "Achado sem descrição").slice(0, 1200),
    evidence: String(f?.evidence ?? "").slice(0, 1200),
    recommendation: String(f?.recommendation ?? "").slice(0, 1200),
    confidence: ["high", "medium", "low"].includes(f?.confidence) ? f.confidence : "low"
  }));
  parsed.recommendation = String(parsed.recommendation ?? "").slice(0, 2000);
  return parsed;
}
const rubric = `Você é o Professor auditor acadêmico do Ensina-me. Faça auditoria, NÃO reescrita. Nunca altere nem sugira que alterou conteúdo publicado.
Avalie precisão conceitual apenas com evidências fornecidas; alinhamento entre questão e material; clareza; ambiguidade; existência de mais de uma resposta defensável; plausibilidade e distinção dos distratores; feedback; nível cognitivo; adequação pedagógica; qualidade e pertinência das fontes.
Não invente fatos nem fontes. Se a evidência for insuficiente, declare incerteza e recomende revisão humana. Separe problema confirmado de suspeita. Não considere comprimento, isoladamente, prova de baixa qualidade. Não assuma que a primeira alternativa é correta.
Retorne JSON com score (0-100), status (needs_review|confirmed_issue|no_issue_detected|human_review), recommendation e findings: [{severity,dimension,issue,evidence,recommendation,confidence}]. Evidência deve citar literalmente trechos do payload ou declarar que está ausente. confidence é high|medium|low.`;

async function auditQuestion(id: string) {
  const { data: q, error } = await db.from("exercise_questions")
    .select("id,exercise_id,question_text,question_type,feedback_hint,created_at")
    .eq("id", id).maybeSingle();
  if (error || !q) throw new Error("Question not found: " + id);
  const { data: exercise, error: eErr } = await db.from("exercises")
    .select("id,title,topic_id,exercise_type,difficulty,published")
    .eq("id", q.exercise_id).maybeSingle();
  if (eErr || !exercise) throw new Error("Exercise not found for question: " + id);
  const { data: options, error: oErr } = await db.from("exercise_options")
    .select("id,content,is_correct,feedback_correct,feedback_incorrect,position")
    .eq("question_id", id).order("position");
  if (oErr) throw oErr;
  const { data: topic } = await db.from("topics").select("id,name,description,discipline_id").eq("id", exercise.topic_id).maybeSingle();
  const { data: sections } = await db.from("materials").select("id,title,introduction,material_sections(title,content,position)").eq("topic_id", exercise.topic_id).eq("status", "published").limit(1);
  const material = sections?.[0] ?? null;
  const { data: links } = await db.from("topic_sources").select("role,status,sources(title,source_type,publisher,doi,canonical_url)").eq("topic_id", exercise.topic_id).eq("status", "APPROVED").limit(10);
  const payload = {
    target: { question_id: q.id, question_text: q.question_text, question_type: q.question_type, feedback_hint: q.feedback_hint },
    exercise: { title: exercise.title, type: exercise.exercise_type, difficulty: exercise.difficulty, published: exercise.published },
    options: (options ?? []).map((o: any) => ({ position: o.position, content: o.content, is_correct: o.is_correct, feedback_correct: o.feedback_correct, feedback_incorrect: o.feedback_incorrect })),
    topic: topic ? { name: topic.name, description: topic.description } : null,
    material: material ? { title: material.title, introduction: material.introduction, sections: (material.material_sections ?? []).map((s: any) => ({ title: s.title, content: String(s.content ?? "").slice(0, 3500), position: s.position })) } : null,
    sources: (links ?? []).map((x: any) => ({ role: x.role, status: x.status, source: x.sources }))
  };
  const result = await askGroq(rubric, payload);
  const { error: saveError } = await db.from("professor_audit_findings").upsert({
    audit_kind: "question", target_id: q.id, topic_id: exercise.topic_id, auditor_version: VERSION,
    score: result.score, status: result.status, findings: result.findings, evidence: [{ question_text: q.question_text, option_count: options?.length ?? 0, material_available: !!material, source_count: links?.length ?? 0 }],
    recommendation: result.recommendation, model_name: MODEL, updated_at: new Date().toISOString()
  }, { onConflict: "audit_kind,target_id,auditor_version" });
  if (saveError) throw saveError;
  return { id: q.id, topic_id: exercise.topic_id, score: result.score, status: result.status, findings: result.findings.length };
}

async function auditTopic(id: string) {
  const { data: topic, error } = await db.from("topics").select("id,name,description,discipline_id,published").eq("id", id).maybeSingle();
  if (error || !topic) throw new Error("Topic not found: " + id);
  const { data: discipline } = await db.from("disciplines").select("name,course_id").eq("id", topic.discipline_id).maybeSingle();
  const { data: materials, error: mErr } = await db.from("materials").select("id,title,introduction,status,material_sections(title,content,position)").eq("topic_id", id).eq("status", "published").limit(2);
  if (mErr) throw mErr;
  const { data: exercises, error: exErr } = await db.from("exercises").select("id,title,exercise_type,difficulty,published,exercise_questions(id,question_text,question_type,feedback_hint,exercise_options(content,is_correct,position))").eq("topic_id", id).eq("published", true).limit(8);
  if (exErr) throw exErr;
  const { data: links } = await db.from("topic_sources").select("role,status,sources(title,source_type,publisher,doi,canonical_url)").eq("topic_id", id).limit(15);
  const payload = {
    topic: { name: topic.name, description: topic.description, published: topic.published },
    discipline: discipline?.name ?? null,
    materials: (materials ?? []).map((m: any) => ({ title: m.title, introduction: m.introduction, sections: (m.material_sections ?? []).map((s: any) => ({ title: s.title, content: String(s.content ?? "").slice(0, 2200), position: s.position })) })),
    exercises: (exercises ?? []).map((e: any) => ({ title: e.title, type: e.exercise_type, difficulty: e.difficulty, questions: (e.exercise_questions ?? []).map((q: any) => ({ text: q.question_text, type: q.question_type, feedback: q.feedback_hint, options: q.exercise_options })) })),
    sources: (links ?? []).map((x: any) => ({ role: x.role, status: x.status, source: x.sources }))
  };
  const result = await askGroq(rubric, payload);
  const { error: saveError } = await db.from("professor_audit_findings").upsert({
    audit_kind: "topic", target_id: topic.id, topic_id: topic.id, auditor_version: VERSION,
    score: result.score, status: result.status, findings: result.findings, evidence: [{ material_count: materials?.length ?? 0, exercise_count: exercises?.length ?? 0, source_count: links?.length ?? 0 }],
    recommendation: result.recommendation, model_name: MODEL, updated_at: new Date().toISOString()
  }, { onConflict: "audit_kind,target_id,auditor_version" });
  if (saveError) throw saveError;
  return { id: topic.id, score: result.score, status: result.status, findings: result.findings.length };
}

Deno.serve(async req => {
  if (req.method !== "POST") return out({ error: "POST required" }, 405);
  const user = await getUser(req);
  if (!user) return out({ error: "Valid authenticated user required" }, 401);
  const ownerId = Deno.env.get("ENSINA_AGENT_OWNER_USER_ID");
  if (!ownerId || user.id !== ownerId) return out({ error: "Owner authorization required" }, 403);
  let body: any;
  try { body = await req.json(); } catch { return out({ error: "Invalid JSON" }, 400); }
  const kind = body.kind;
  const limit = Math.min(Math.max(Number(body.limit ?? 1), 1), kind === "question" ? 5 : 2);
  if (!["question", "topic"].includes(kind)) return out({ error: "kind must be question or topic" }, 400);
  try {
    const table = kind === "question" ? "exercise_questions" : "topics";
    const idField = "id";
    let ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, limit) : [];
    if (ids.length === 0) {
      const { data: existing, error: existingErr } = await db.from("professor_audit_findings").select("target_id").eq("audit_kind", kind).eq("auditor_version", VERSION);
      if (existingErr) throw existingErr;
      const audited = new Set((existing ?? []).map((x: any) => x.target_id));
      // Walk bounded pages until enough unaudited targets are found; do not stall after the first 100.
      for (let offset = 0; offset < 10000 && ids.length < limit; offset += 100) {
        const { data, error } = await db.from(table).select("id").order("id").range(offset, offset + 99);
        if (error) throw error;
        const page = data ?? [];
        ids.push(...page.map((x: any) => x[idField]).filter((x: string) => !audited.has(x)).slice(0, limit - ids.length));
        if (page.length < 100) break;
      }
    }
    if (ids.length === 0) return out({ ok: true, kind, processed: [], message: "No unaudited targets found for this batch", auditor_version: VERSION });
    const processed = [];
    const failures = [];
    for (const id of ids) {
      try { processed.push(kind === "question" ? await auditQuestion(id) : await auditTopic(id)); }
      catch (e) { failures.push({ id, error: e instanceof Error ? e.message : String(e) }); }
    }
    return out({ ok: failures.length === 0, kind, processed, failures, auditor_version: VERSION, model: MODEL, content_mutations: 0 });
  } catch (e) {
    return out({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
