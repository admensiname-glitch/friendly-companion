create table if not exists public.professor_audit_findings (
  id uuid primary key default gen_random_uuid(),
  audit_kind text not null check (audit_kind in ('question','topic')),
  target_id uuid not null,
  topic_id uuid,
  auditor_version text not null,
  score smallint check (score between 0 and 100),
  status text not null default 'needs_review' check (status in ('needs_review','confirmed_issue','no_issue_detected','human_review')),
  findings jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  recommendation text,
  model_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(audit_kind,target_id,auditor_version)
);
create index if not exists professor_audit_findings_topic_idx on public.professor_audit_findings(topic_id);
create index if not exists professor_audit_findings_status_idx on public.professor_audit_findings(status);
alter table public.professor_audit_findings enable row level security;
revoke all on public.professor_audit_findings from anon, authenticated;
grant all on public.professor_audit_findings to service_role;
