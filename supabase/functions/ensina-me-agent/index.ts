import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Principal = "HUMAN_OWNER" | "ORCHESTRATOR";
type Risk = "low" | "medium" | "high" | "critical";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function classify(mission: string): Risk {
  const m = mission.toLowerCase();
  if (/(drop|delete|truncate|production|secret|service.role|permission|deploy|irreversible|destructive)/.test(m)) return "critical";
  if (/(migration|update|rewrite|edit|fix|commit|push|deploy|bulk|mass)/.test(m)) return "high";
  if (/(research|audit|analy|test|inspect|verify|report)/.test(m)) return "low";
  return "medium";
}

function needsDualApproval(risk: Risk) {
  return risk === "critical";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Authorization required" }, 401);

  let body: { mission?: string; requested_by?: Principal; scope?: Record<string, unknown> };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const mission = body.mission?.trim();
  const requestedBy = body.requested_by;
  if (!mission || !requestedBy || !["HUMAN_OWNER", "ORCHESTRATOR"].includes(requestedBy)) {
    return json({ error: "mission and a valid trusted principal are required" }, 400);
  }

  const risk = classify(mission);
  const dual = needsDualApproval(risk);

  const { data: run, error } = await supabase
    .from("agent_runs")
    .insert({
      requested_by: requestedBy,
      mission,
      scope: body.scope ?? {},
      status: "planned",
      risk_level: risk,
    })
    .select("id,mission,requested_by,status,risk_level,created_at")
    .single();

  if (error) return json({ error: error.message }, 500);

  const tasks = [
    {
      run_id: run.id,
      task_key: "inspect",
      title: "Inspect current state",
      description: "Inspect only the systems relevant to the mission before mutation.",
      status: "pending",
      risk_level: "low",
      requires_human_approval: false,
      requires_orchestrator_approval: false,
    },
    {
      run_id: run.id,
      task_key: "plan",
      title: "Build execution plan",
      description: "Break the mission into small, reversible, evidence-driven steps.",
      status: "pending",
      risk_level: "low",
      requires_human_approval: false,
      requires_orchestrator_approval: false,
    },
    {
      run_id: run.id,
      task_key: "execute",
      title: "Execute authorized work",
      description: "Execute only actions within the approved mission scope.",
      status: "pending",
      risk_level: risk,
      requires_human_approval: dual,
      requires_orchestrator_approval: dual,
    },
    {
      run_id: run.id,
      task_key: "validate",
      title: "Validate",
      description: "Run relevant tests, queries and consistency checks.",
      status: "pending",
      risk_level: "low",
      requires_human_approval: false,
      requires_orchestrator_approval: false,
    },
    {
      run_id: run.id,
      task_key: "report",
      title: "Report evidence",
      description: "Record exact changes, evidence, failures and remaining work.",
      status: "pending",
      risk_level: "low",
      requires_human_approval: false,
      requires_orchestrator_approval: false,
    },
  ];

  const { error: taskError } = await supabase.from("agent_tasks").insert(tasks);
  if (taskError) return json({ error: taskError.message, run }, 500);

  await supabase.from("agent_actions").insert({
    run_id: run.id,
    actor: "AGENT",
    action_type: "PLAN_CREATED",
    target: "agent",
    input_summary: mission,
    output_summary: dual
      ? "Critical mission classified. Dual approval required before execution."
      : "Mission accepted into the controlled execution loop.",
    status: dual ? "blocked" : "succeeded",
    risk_level: risk,
  });

  return json({
    run,
    policy: {
      subordinate_to: ["HUMAN_OWNER", "ORCHESTRATOR"],
      risk,
      dual_approval_required: dual,
      conflict_policy: "STOP_AND_ESCALATE",
    },
    next: dual
      ? "Await explicit approval from both trusted principals."
      : "Proceed with inspection and planning; mutation remains scope-bound.",
  }, 201);
});
