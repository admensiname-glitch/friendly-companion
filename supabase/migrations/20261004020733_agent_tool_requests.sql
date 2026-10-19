create table if not exists public.agent_tool_requests (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete cascade,
  tool_name text not null,
  purpose text not null,
  arguments jsonb not null default '{}'::jsonb,
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  status text not null default 'pending' check (status in ('pending','approved','running','succeeded','failed','blocked','rejected','cancelled')),
  requested_by text not null check (requested_by in ('AGENT','ORCHESTRATOR','HUMAN_OWNER')),
  result jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_agent_tool_requests_run_status on public.agent_tool_requests(run_id,status,created_at);
alter table public.agent_tool_requests enable row level security;