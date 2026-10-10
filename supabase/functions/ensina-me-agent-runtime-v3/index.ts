import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const out = (x: unknown, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const hash = async (v: unknown) => {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(v)));
  return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, "0")).join("");
};
const user = async (req: Request) => {
  const a = req.headers.get("authorization");
  if (!a?.startsWith("Bearer ")) return null;
  const { data, error } = await db.auth.getUser(a.slice(7));
  return error ? null : data.user;
};
const owner = async (id: string) => Deno.env.get("ENSINA_AGENT_OWNER_USER_ID") === id;
const ALLOWED_TOOLS = ["native:agent_health", "native:content_audit_summary", "native:exercise_audit_summary"];

const native = async (tool: string) => {
  if (tool === "agent_health") {
    const tables = ["agent_runs", "agent_tasks", "agent_actions", "agent_approvals", "agent_findings", "agent_memory", "agent_tool_requests"];
    const checks = await Promise.all(tables.map(async t => {
      const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
      return { table: t, ok: !error, count: count ?? 0, error: error?.message ?? null };
    }));
    return { tool, checks, timestamp: new Date().toISOString() };
  }
  if (tool === "content_audit_summary") {
    const tables = ["materials", "material_sections", "sources", "source_documents", "source_chunks", "material_chunk_citations"];
    const counts = await Promise.all(tables.map(async t => {
      const { count, error } = await db.from(t).select("id", { count: "exact", head: true });
      return { table: t, count: count ?? 0, error: error?.message ?? null };
    }));
    return { tool, counts };
  }
  if (tool === "exercise_audit_summary") {
    const { data, count, error } = await db.from("exercise_questions").select("question_text,feedback_hint", { count: "exact" });
    if (error) throw error;
    const rows = data ?? [];
    return { tool, total_questions: count ?? rows.length, short_stems_lt_140: rows.filter((x: any) => (x.question_text?.length ?? 0) < 140).length, very_short_stems_lt_100: rows.filter((x: any) => (x.question_text?.length ?? 0) < 100).length, weak_feedback_lt_90: rows.filter((x: any) => (x.feedback_hint?.length ?? 0) < 90).length };
  }
  throw new Error("Native tool not allowlisted: " + tool);
};

Deno.serve(async req => {
  if (req.method !== "POST") return out({ error: "POST required" }, 405);
  const u = await user(req);
  if (!u) return out({ error: "Valid authenticated user required" }, 401);
  let b: any;
  try { b = await req.json(); } catch { return out({ error: "Invalid JSON" }, 400); }

  try {
    if (b.action === "create_run") {
      if (!b.mission || !["HUMAN_OWNER", "ORCHESTRATOR"].includes(b.requested_by)) return out({ error: "mission and principal required" }, 400);
      if (b.requested_by === "HUMAN_OWNER" && !await owner(u.id)) return out({ error: "owner identity not configured or not authorized" }, 403);
      if (b.requested_by === "ORCHESTRATOR" && req.headers.get("x-ensina-orchestrator-key") !== Deno.env.get("ENSINA_AGENT_ORCHESTRATOR_KEY")) return out({ error: "orchestrator authorization required" }, 403);
      const { data: run, error } = await db.from("agent_runs").insert({ requested_by: b.requested_by, mission: b.mission.trim(), scope: b.scope ?? {}, status: "planned", risk_level: "low" }).select("id,mission,requested_by,status,risk_level,created_at").single();
      if (error) throw error;
      const { error: taskError } = await db.from("agent_tasks").insert([
        { run_id: run.id, task_key: "inspect", title: "Inspect", description: "Read current state", status: "pending", risk_level: "low" },
        { run_id: run.id, task_key: "plan", title: "Plan", description: "Bounded plan", status: "pending", risk_level: "low" },
        { run_id: run.id, task_key: "execute", title: "Execute", description: "Authorized work", status: "pending", risk_level: "low" },
        { run_id: run.id, task_key: "validate", title: "Validate", description: "Verify result", status: "pending", risk_level: "low" },
        { run_id: run.id, task_key: "report", title: "Report", description: "Evidence", status: "pending", risk_level: "low" }
      ]);
      if (taskError) throw taskError;
      return out({ run, policy: { conflict_policy: "STOP_AND_ESCALATE", native_tools: ALLOWED_TOOLS } }, 201);
    }

    if (b.action === "request_tool") {
      if (!b.run_id || !b.tool_name || !b.purpose) return out({ error: "run_id, tool_name and purpose required" }, 400);
      if (!ALLOWED_TOOLS.includes(b.tool_name)) return out({ error: "tool not allowlisted" }, 403);
      const { data: run, error: runError } = await db.from("agent_runs").select("id,requested_by").eq("id", b.run_id).maybeSingle();
      if (runError || !run) return out({ error: "run not found" }, 404);
      const authorized = (run.requested_by === "HUMAN_OWNER" && await owner(u.id)) ||
        (run.requested_by === "ORCHESTRATOR" && req.headers.get("x-ensina-orchestrator-key") === Deno.env.get("ENSINA_AGENT_ORCHESTRATOR_KEY"));
      if (!authorized) return out({ error: "not authorized for this run" }, 403);
      const scope_hash = await hash({ run_id: b.run_id, task_id: b.task_id ?? null, tool_name: b.tool_name, purpose: b.purpose, arguments: b.arguments ?? {}, risk_level: "low" });
      const { data, error } = await db.from("agent_tool_requests").insert({ run_id: b.run_id, task_id: b.task_id ?? null, tool_name: b.tool_name, purpose: b.purpose, arguments: b.arguments ?? {}, risk_level: "low", requested_by: run.requested_by, status: "pending", evidence: [{ scope_hash }] }).select("*").single();
      if (error) throw error;
      return out({ request: data, scope_hash }, 201);
    }

    if (b.action === "execute_tool") {
      if (!b.request_id) return out({ error: "request_id required" }, 400);
      const { data: r, error } = await db.from("agent_tool_requests").select("*").eq("id", b.request_id).maybeSingle();
      if (error || !r) return out({ error: "request not found" }, 404);
      // Fail closed: validate allowlist again at execution time, not only at request creation.
      if (!ALLOWED_TOOLS.includes(r.tool_name)) return out({ error: "tool not allowlisted" }, 403);
      const { data: run, error: runError } = await db.from("agent_runs").select("id,requested_by").eq("id", r.run_id).maybeSingle();
      if (runError || !run) return out({ error: "parent run not found" }, 404);
      const authorized = (run.requested_by === "HUMAN_OWNER" && r.requested_by === "HUMAN_OWNER" && await owner(u.id)) ||
        (run.requested_by === "ORCHESTRATOR" && r.requested_by === "ORCHESTRATOR" && req.headers.get("x-ensina-orchestrator-key") === Deno.env.get("ENSINA_AGENT_ORCHESTRATOR_KEY"));
      if (!authorized) return out({ error: "not authorized for this request" }, 403);
      if (r.status !== "pending") return out({ error: "request is not pending; duplicate execution refused", status: r.status }, 409);
      // Conditional claim reduces accidental duplicate execution; no content tables are written by native tools.
      const { data: claimed, error: claimError } = await db.from("agent_tool_requests").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", r.id).eq("status", "pending").select("id").maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) return out({ error: "request already claimed or no longer pending" }, 409);
      try {
        const result = await native(r.tool_name);
        const result_hash = await hash(result);
        const { error: finishError } = await db.from("agent_tool_requests").update({ status: "completed", result, evidence: [...(r.evidence ?? []), { result_hash, completed_at: new Date().toISOString() }], updated_at: new Date().toISOString() }).eq("id", r.id).eq("status", "running");
        if (finishError) throw finishError;
        return out({ completed: true, tool: r.tool_name, result, scope_hash: r.evidence?.[0]?.scope_hash });
      } catch (e) {
        // Revert claim to pending on execution failure to permit a controlled retry.
        await db.from("agent_tool_requests").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", r.id).eq("status", "running");
        throw e;
      }
    }
    return out({ error: "Unknown action" }, 400);
  } catch (e) {
    return out({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
