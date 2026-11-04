-- Audit trail for source/citation verification and batch material publication.
create table if not exists public.academic_evidence_audits (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  material_id uuid not null references public.materials(id) on delete cascade,
  citation_id uuid not null references public.material_citations(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  source_identity_status text not null check (source_identity_status in ('verified','failed','not_checked')),
  excerpt_status text not null check (excerpt_status in ('matched','not_matched','missing')),
  locator_status text not null check (locator_status in ('matched','not_matched','missing')),
  rights_status text not null check (rights_status in ('open','authorized','restricted','unknown','missing')),
  overall_status text not null check (overall_status in ('eligible','blocked')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists academic_evidence_audits_material_idx on public.academic_evidence_audits(material_id, created_at desc);
create index if not exists academic_evidence_audits_run_idx on public.academic_evidence_audits(run_id);
create index if not exists academic_evidence_audits_citation_idx on public.academic_evidence_audits(citation_id, created_at desc);
alter table public.academic_evidence_audits enable row level security;
revoke all on public.academic_evidence_audits from public, anon, authenticated;
grant all on public.academic_evidence_audits to service_role;
drop policy if exists academic_evidence_audits_service_role_only on public.academic_evidence_audits;
create policy academic_evidence_audits_service_role_only on public.academic_evidence_audits
  for all to service_role using (true) with check (true);

create table if not exists public.academic_evidence_material_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  material_id uuid not null references public.materials(id) on delete cascade,
  material_updated_at timestamptz not null,
  actor_id uuid not null references auth.users(id),
  status text not null check (status in ('published','validated_not_published','blocked','error')),
  citation_count integer not null default 0,
  eligible_count integer not null default 0,
  blocked_count integer not null default 0,
  published boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(material_id, material_updated_at)
);
create index if not exists academic_evidence_material_runs_run_idx on public.academic_evidence_material_runs(run_id);
create index if not exists academic_evidence_material_runs_material_idx on public.academic_evidence_material_runs(material_id, created_at desc);
alter table public.academic_evidence_material_runs enable row level security;
revoke all on public.academic_evidence_material_runs from public, anon, authenticated;
grant all on public.academic_evidence_material_runs to service_role;
drop policy if exists academic_evidence_material_runs_service_role_only on public.academic_evidence_material_runs;
create policy academic_evidence_material_runs_service_role_only on public.academic_evidence_material_runs
  for all to service_role using (true) with check (true);
