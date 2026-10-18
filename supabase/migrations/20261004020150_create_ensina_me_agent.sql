create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by text not null check (requested_by in ('HUMAN_OWNER','ORCHESTRATOR')),
  mission text not null,
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'planned' check (status in ('planned','running','blocked','completed','failed','cancelled')),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  started_at timestamptz,
  finished_at timestamptz,
  result_summary text,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_key text not null,
  title text not null,
  description text not null,
  status text not null default 'pending' check (status in ('pending','running','blocked','completed','failed','skipped')),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  requires_human_approval boolean not null default false,
  requires_orchestrator_approval boolean not null default false,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  actor text not null check (actor in ('AGENT','HUMAN_OWNER','ORCHESTRATOR')),
  action_type text not null,
  target text,
  input_summary text,
  output_summary text,
  status text not null check (status in ('started','succeeded','failed','blocked','rejected')),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  approval_ref uuid,
  created_at timestamptz not null default now()
);
create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete cascade,
  approver_role text not null check (approver_role in ('HUMAN_OWNER','ORCHESTRATOR')),
  decision text not null check (decision in ('approved','rejected')),
  scope_hash text,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.agent_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  severity text not null check (severity in ('info','low','medium','high','critical')),
  category text not null,
  title text not null,
  details text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','accepted','fixed','wont_fix')),
  created_at timestamptz not null default now()
);
create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  memory_key text not null unique,
  memory_value jsonb not null,
  source text not null default 'system',
  confidence numeric(4,3) not null default 1.000,
  updated_at timestamptz not null default now()
);
create index if not exists idx_agent_runs_status on public.agent_runs(status);
create index if not exists idx_agent_tasks_run_status on public.agent_tasks(run_id,status);
create index if not exists idx_agent_actions_run on public.agent_actions(run_id,created_at desc);
create index if not exists idx_agent_findings_run on public.agent_findings(run_id,severity);
alter table public.agent_runs enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_actions enable row level security;
alter table public.agent_approvals enable row level security;
alter table public.agent_findings enable row level security;
alter table public.agent_memory enable row level security;
