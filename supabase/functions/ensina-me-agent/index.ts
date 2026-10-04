import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Principal = "HUMAN_OWNER" | "ORCHESTRATOR";
type Risk = "low" | "medium" | "high" | "critical";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function classify(text: string): Risk {
  const m = text.toLowerCase();
  if (/(drop|delete|truncate|production|secret|service[._ -]?role|permission|irreversible|destructive)/.test(m)) return "critical";
  if (/(migration|update|rewrite|edit|fix|commit|push|bulk|mass|deploy)/.test(m)) return "high";
  if (/(research|audit|analy[sz]|test|inspect|verify|report|read|check)/.test(m)) return "low";
  return "medium";
}
function principal(v: unknown): v is Principal { return v === "HUMAN_OWNER" || v === "ORCHESTRATOR"; }
function approvals(risk: Risk) { return risk === "critical" ? 2 : risk === "high" ? 1 : 0; }

async function createRun(mission: string, requestedBy: Principal, scope: Record<string, unknown>) {
  const risk = classify(mission);
  const { data: run, error } = await supabase.from("agent_runs").insert({ requested_by: requestedBy, mission, scope, status: "planned", risk_level: risk }).select("id,mission,requested_by,status,risk_level,created_at").single();
  if (error) throw error;
  const gated = approvals(risk) > 0;
  const { error: taskError } = await supabase.from("agent_tasks").insert([
    { run_id: run.id, task_key: "inspect", title: "Inspect current state", description: "Read relevant state before mutation.", status: "pending", risk_level: "low" },
    { run_id: run.id, task_key: "plan", title: "Build execution plan", description: "Break the mission into bounded, reversible steps.", status: "pending", risk_level: "low" },
    { run_id: run.id, task_key: "execute", title: "Execute authorized work", description: "Execute only inside approved scope.", status: gated ? "blocked" : "pending", risk_level: risk, requires_human_approval: risk === "critical", requires_orchestrator_approval: gated },
    { run_id: run.id, task_key: "validate", title: "Validate", description: "Run relevant tests and consistency checks.", status: "pending", risk_level: "low" },
    { run_id: run.id, task_key: "report", title: "Report evidence", description: "Record exact results and remaining work.", status: "pending", risk_level: "low" }
  ]);
  if (taskError) throw taskError;
  await supabase.from("agent_actions").insert({ run_id: run.id, actor: "AGENT", action_type: "RUN_CREATED", target: "agent", input_summary: mission, output_summary: gated ? "Execution gated by approval." : "Controlled execution run created.", status: "succeeded", risk_level: risk });
  return run;
}

async function requestTool(runId: string, taskId: string | null, toolName: string, purpose: string, args: unknown, risk: Risk) {
  const gated = approvals(risk) > 0;
  const { data, error } = await supabase.from("agent_tool_requests").insert({ run_id: runId, task_id: taskId, tool_name: toolName, purpose, arguments: args ?? {}, risk_level: risk, requested_by: "AGENT", status: gated ? "blocked" : "pending" }).select("id,tool_name,purpose,risk_level,status,created_at").single();
  if (error) throw error;
  return data;
}

async function approve(runId: string, taskId: string | null, role: Principal, decision: "approved" | "rejected", note?: string) {
  const { data, error } = await supabase.from("agent_approvals").insert({ run_id: runId, task_id: taskId, approver_role: role, decision, note: note ?? null }).select("id,run_id,task_id,approver_role,decision,created_at").single();
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  if (!req.headers.get("authorization")?.startsWith("Bearer ")) return json({ error: "Authorization required" }, 401);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  try {
    if (body.action === "create_run") {
      if (!body.mission || !principal(body.requested_by)) return json({ error: "mission and valid requested_by are required" }, 400);
      if (body.requested_by === "ORCHESTRATOR") {
        const expected = Deno.env.get("ENSINA_AGENT_ORCHESTRATOR_KEY");
        if (!expected || req.headers.get("x-ensina-orchestrator-key") !== expected) return json({ error: "orchestrator authorization required" }, 403);
      }
      return json({ run: await createRun(body.mission, body.requested_by, body.scope ?? {}), authority: { human_owner: "trusted", orchestrator: "trusted", agent: "subordinate" } }, 201);
    }
    if (body.action === "request_tool") {
      if (!body.run_id || !body.tool_name || !body.purpose || !body.risk_level) return json({ error: "run_id, tool_name, purpose and risk_level are required" }, 400);
      return json({ request: await requestTool(body.run_id, body.task_id ?? null, body.tool_name, body.purpose, body.arguments ?? {}, body.risk_level) }, 201);
    }
    if (body.action === "approve") {
      if (!body.run_id || !principal(body.approver_role) || !["approved","rejected"].includes(body.decision)) return json({ error: "run_id, approver_role and decision are required" }, 400);
      return json({ approval: await approve(body.run_id, body.task_id ?? null, body.approver_role, body.decision, body.note) }, 201);
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});