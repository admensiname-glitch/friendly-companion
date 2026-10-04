create table if not exists public.agent_owners (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);
alter table public.agent_owners enable row level security;
alter table public.agent_approvals add column if not exists scope_hash text;
create index if not exists idx_agent_approvals_scope on public.agent_approvals(run_id,task_id,approver_role,decision,scope_hash);