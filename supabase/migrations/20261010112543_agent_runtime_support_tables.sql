-- Agent runtime support tables. Additive only; no academic content is modified.
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by text not null check (requested_by in ('HUMAN_OWNER','ORCHESTRATOR')),
  mission text not null check (length(trim(mission)) > 0),
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'planned' check (status in ('planned','running','completed','failed','cancelled')),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_key text not null,
  title text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending','running','completed','failed','blocked','cancelled')),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(run_id, task_key)
);
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  action_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid not null references public.agent_tasks(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  requested_action jsonb not null default '{}'::jsonb,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.agent_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  severity text not null default 'info' check (severity in ('info','low','medium','high','critical')),
  title text not null,
  details text not null,
  evidence jsonb not null default '[]'::jsonb,
  recommendation text,
  status text not null default 'open' check (status in ('open','confirmed','dismissed','resolved')),
  created_at timestamptz not null default now()
);
create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  memory_key text not null unique,
  memory_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.agent_tool_requests (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  tool_name text not null,
  purpose text not null,
  arguments jsonb not null default '{}'::jsonb,
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  requested_by text not null check (requested_by in ('HUMAN_OWNER','ORCHESTRATOR')),
  status text not null default 'pending' check (status in ('pending','running','completed','failed','rejected')),
  result jsonb,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_tasks_run_idx on public.agent_tasks(run_id);
create index if not exists agent_actions_run_idx on public.agent_actions(run_id);
create index if not exists agent_approvals_run_idx on public.agent_approvals(run_id);
create index if not exists agent_findings_run_idx on public.agent_findings(run_id);
create index if not exists agent_tool_requests_run_idx on public.agent_tool_requests(run_id);
create index if not exists agent_tool_requests_status_idx on public.agent_tool_requests(status);
alter table public.agent_runs enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_actions enable row level security;
alter table public.agent_approvals enable row level security;
alter table public.agent_findings enable row level security;
alter table public.agent_memory enable row level security;
alter table public.agent_tool_requests enable row level security;
revoke all on public.agent_runs, public.agent_tasks, public.agent_actions, public.agent_approvals, public.agent_findings, public.agent_memory, public.agent_tool_requests from anon, authenticated;
grant all on public.agent_runs, public.agent_tasks, public.agent_actions, public.agent_approvals, public.agent_findings, public.agent_memory, public.agent_tool_requests to service_role;
