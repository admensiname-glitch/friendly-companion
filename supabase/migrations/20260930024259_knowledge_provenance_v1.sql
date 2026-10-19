
create extension if not exists vector with schema extensions;

create schema if not exists private;

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  document_type text not null default 'web',
  canonical_url text,
  retrieval_url text,
  rights_snapshot text not null default 'UNKNOWN',
  retrieval_status text not null default 'pending'
    check (retrieval_status in ('pending','retrieved','rejected','failed')),
  content_sha256 text,
  retrieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.source_documents enable row level security;
drop policy if exists "Admins select source documents" on public.source_documents;
create policy "Admins select source documents" on public.source_documents
for select to authenticated using ((select public.has_role('admin')));
create index if not exists idx_source_documents_source on public.source_documents(source_id);
create index if not exists idx_source_documents_status on public.source_documents(retrieval_status);

create table if not exists public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  locator text,
  token_count integer check (token_count is null or token_count >= 0),
  embedding extensions.vector,
  embedding_model text,
  created_at timestamptz not null default now(),
  unique(source_document_id, chunk_index)
);

alter table public.source_chunks enable row level security;
drop policy if exists "Admins select source chunks" on public.source_chunks;
create policy "Admins select source chunks" on public.source_chunks
for select to authenticated using ((select public.has_role('admin')));
create index if not exists idx_source_chunks_document on public.source_chunks(source_document_id);

create table if not exists public.material_generation_runs (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','running','completed','failed','cancelled')),
  model_name text,
  prompt_version text,
  source_count integer not null default 0 check (source_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.material_generation_runs enable row level security;
drop policy if exists "Admins select material generation runs" on public.material_generation_runs;
create policy "Admins select material generation runs" on public.material_generation_runs
for select to authenticated using ((select public.has_role('admin')));
create index if not exists idx_material_generation_runs_topic on public.material_generation_runs(topic_id, created_at desc);

create table if not exists public.material_chunk_citations (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  section_id uuid references public.material_sections(id) on delete cascade,
  source_chunk_id uuid not null references public.source_chunks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(material_id, section_id, source_chunk_id)
);

alter table public.material_chunk_citations enable row level security;
drop policy if exists "Students select published material chunk citations" on public.material_chunk_citations;
create policy "Students select published material chunk citations" on public.material_chunk_citations
for select to authenticated using (
  exists (
    select 1 from public.materials m
    where m.id=material_chunk_citations.material_id and m.status='published'
  )
);
drop policy if exists "Admins select all material chunk citations" on public.material_chunk_citations;
create policy "Admins select all material chunk citations" on public.material_chunk_citations
for select to authenticated using ((select public.has_role('admin')));
create index if not exists idx_material_chunk_citations_material on public.material_chunk_citations(material_id);
create index if not exists idx_material_chunk_citations_chunk on public.material_chunk_citations(source_chunk_id);

create or replace function public.source_documents_updated_at()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists trigger_source_documents_updated_at on public.source_documents;
create trigger trigger_source_documents_updated_at before update on public.source_documents
for each row execute function public.source_documents_updated_at();
revoke all on function public.source_documents_updated_at() from public,anon,authenticated;

create or replace function public.register_source_document(_source_id uuid,_retrieval_url text,_rights_snapshot text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if auth.uid() is null or not(select public.has_role('admin')) then
  raise exception 'Acesso administrativo negado';
 end if;
 insert into public.source_documents(source_id,retrieval_url,canonical_url,rights_snapshot,retrieval_status)
 select _source_id,_retrieval_url,s.canonical_url,coalesce(_rights_snapshot,'UNKNOWN'),'pending'
 from public.sources s where s.id=_source_id
 returning id into v_id;
 if v_id is null then raise exception 'Fonte não encontrada'; end if;
 return v_id;
end;
$$;
revoke all on function public.register_source_document(uuid,text,text) from public,anon;
grant execute on function public.register_source_document(uuid,text,text) to authenticated;
