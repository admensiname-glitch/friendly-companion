begin;

create table if not exists public.source_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id) on delete set null,
  provider text not null check (provider in (
    'crossref','pubmed','doaj','scielo','pmc','institutional_repository',
    'university','journal','public_agency','web'
  )),
  query_text text not null,
  requested_by uuid references auth.users(id) on delete set null,
  stage text not null default 'DISCOVERY' check (stage in (
    'DISCOVERY','VALIDATION','EXTRACTION','CLEANING','STRUCTURING',
    'INDEXING','COMPLETED','FAILED','CANCELLED'
  )),
  status text not null default 'QUEUED' check (status in (
    'QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED'
  )),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  selected_count integer not null default 0 check (selected_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_search_candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.source_ingestion_jobs(id) on delete cascade,
  provider text not null check (provider in (
    'crossref','pubmed','doaj','scielo','pmc','institutional_repository',
    'university','journal','public_agency','web'
  )),
  external_id text,
  title text not null,
  canonical_url text not null,
  source_type text not null default 'article',
  authors jsonb not null default '[]'::jsonb,
  publisher text,
  publication_date date,
  doi text,
  language text,
  relevance_score numeric(6,4),
  validation_status text not null default 'DISCOVERED' check (validation_status in (
    'DISCOVERED','VALIDATED','REJECTED','SELECTED'
  )),
  rights_class text check (rights_class is null or rights_class in (
    'OPEN','METADATA_ONLY','USER_AUTHORIZED','RESTRICTED','UNKNOWN'
  )),
  access_model text check (access_model is null or access_model in (
    'OPEN','PAYWALL','UNKNOWN'
  )),
  rights_evidence_url text,
  rights_evidence_note text,
  source_id uuid references public.sources(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, canonical_url)
);

create index if not exists source_ingestion_jobs_topic_idx
  on public.source_ingestion_jobs(topic_id, created_at desc);
create index if not exists source_ingestion_jobs_status_idx
  on public.source_ingestion_jobs(status, stage, created_at desc);
create index if not exists source_search_candidates_job_idx
  on public.source_search_candidates(job_id, validation_status, relevance_score desc);
create index if not exists source_search_candidates_source_idx
  on public.source_search_candidates(source_id);

alter table public.source_ingestion_jobs enable row level security;
alter table public.source_search_candidates enable row level security;

revoke all on public.source_ingestion_jobs from anon, authenticated;
revoke all on public.source_search_candidates from anon, authenticated;

drop policy if exists source_ingestion_jobs_no_direct_access on public.source_ingestion_jobs;
create policy source_ingestion_jobs_no_direct_access
  on public.source_ingestion_jobs for all to anon, authenticated
  using (false) with check (false);

drop policy if exists source_search_candidates_no_direct_access on public.source_search_candidates;
create policy source_search_candidates_no_direct_access
  on public.source_search_candidates for all to anon, authenticated
  using (false) with check (false);

create or replace function public.admin_create_source_ingestion_job(
  _topic_id uuid,
  _query_text text,
  _provider text default 'crossref'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_job_id uuid;
begin
  if v_user_id is null or not (select public.has_role('admin')) then
    raise exception 'Acesso administrativo negado';
  end if;

  if _query_text is null or btrim(_query_text) = '' then
    raise exception 'A consulta de pesquisa é obrigatória';
  end if;

  if _provider not in (
    'crossref','pubmed','doaj','scielo','pmc','institutional_repository',
    'university','journal','public_agency','web'
  ) then
    raise exception 'Provedor de pesquisa inválido';
  end if;

  if _topic_id is not null and not exists (
    select 1
    from public.topics t
    join public.disciplines d on d.id = t.discipline_id and d.published
    join public.courses c on c.id = d.course_id and c.published
    where t.id = _topic_id and t.published
  ) then
    raise exception 'Tópico não encontrado ou não publicado';
  end if;

  insert into public.source_ingestion_jobs(
    topic_id, provider, query_text, requested_by, stage, status
  )
  values(
    _topic_id, _provider, btrim(_query_text), v_user_id, 'DISCOVERY', 'QUEUED'
  )
  returning id into v_job_id;

  return v_job_id;
end;
$function$;

revoke all on function public.admin_create_source_ingestion_job(uuid,text,text) from public, anon;
grant execute on function public.admin_create_source_ingestion_job(uuid,text,text) to authenticated;

create or replace function public.admin_get_source_ingestion_jobs(
  _limit integer default 20
)
returns table(
  id uuid, topic_id uuid, provider text, query_text text, stage text, status text,
  candidate_count integer, selected_count integer, error_message text,
  started_at timestamptz, completed_at timestamptz, created_at timestamptz, updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null or not (select public.has_role('admin')) then
    raise exception 'Acesso administrativo negado';
  end if;

  return query
  select j.id,j.topic_id,j.provider,j.query_text,j.stage,j.status,
         j.candidate_count,j.selected_count,j.error_message,
         j.started_at,j.completed_at,j.created_at,j.updated_at
  from public.source_ingestion_jobs j
  order by j.created_at desc
  limit greatest(1, least(coalesce(_limit,20),100));
end;
$function$;

revoke all on function public.admin_get_source_ingestion_jobs(integer) from public, anon;
grant execute on function public.admin_get_source_ingestion_jobs(integer) to authenticated;

create or replace function public.admin_get_source_search_candidates(
  _job_id uuid,
  _limit integer default 50
)
returns table(
  id uuid, provider text, external_id text, title text, canonical_url text,
  source_type text, authors jsonb, publisher text, publication_date date, doi text,
  language text, relevance_score numeric, validation_status text,
  rights_class text, access_model text, rights_evidence_url text,
  rights_evidence_note text, source_id uuid, metadata jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null or not (select public.has_role('admin')) then
    raise exception 'Acesso administrativo negado';
  end if;

  return query
  select c.id,c.provider,c.external_id,c.title,c.canonical_url,c.source_type,
         c.authors,c.publisher,c.publication_date,c.doi,c.language,c.relevance_score,
         c.validation_status,c.rights_class,c.access_model,c.rights_evidence_url,
         c.rights_evidence_note,c.source_id,c.metadata
  from public.source_search_candidates c
  where c.job_id = _job_id
  order by c.validation_status asc, c.relevance_score desc nulls last, c.created_at asc
  limit greatest(1, least(coalesce(_limit,50),200));
end;
$function$;

revoke all on function public.admin_get_source_search_candidates(uuid,integer) from public, anon;
grant execute on function public.admin_get_source_search_candidates(uuid,integer) to authenticated;

commit;
