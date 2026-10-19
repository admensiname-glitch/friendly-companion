
create schema if not exists private;

grant usage on schema private to authenticated;

alter function public.admin_create_source_ingestion_job(uuid,text,text) set schema private;
alter function public.admin_get_source_ingestion_jobs(integer) set schema private;
alter function public.admin_get_source_search_candidates(uuid,integer) set schema private;
alter function public.admin_set_publication(text,uuid,boolean) set schema private;
alter function public.get_admin_content_overview() set schema private;
alter function public.get_admin_dashboard_stats() set schema private;
alter function public.get_admin_source_overview() set schema private;
alter function public.register_source_document(uuid,text,text) set schema private;

revoke execute on function private.admin_create_source_ingestion_job(uuid,text,text) from public, anon;
revoke execute on function private.admin_get_source_ingestion_jobs(integer) from public, anon;
revoke execute on function private.admin_get_source_search_candidates(uuid,integer) from public, anon;
revoke execute on function private.admin_set_publication(text,uuid,boolean) from public, anon;
revoke execute on function private.get_admin_content_overview() from public, anon;
revoke execute on function private.get_admin_dashboard_stats() from public, anon;
revoke execute on function private.get_admin_source_overview() from public, anon;
revoke execute on function private.register_source_document(uuid,text,text) from public, anon;

grant execute on function private.admin_create_source_ingestion_job(uuid,text,text) to authenticated;
grant execute on function private.admin_get_source_ingestion_jobs(integer) to authenticated;
grant execute on function private.admin_get_source_search_candidates(uuid,integer) to authenticated;
grant execute on function private.admin_set_publication(text,uuid,boolean) to authenticated;
grant execute on function private.get_admin_content_overview() to authenticated;
grant execute on function private.get_admin_dashboard_stats() to authenticated;
grant execute on function private.get_admin_source_overview() to authenticated;
grant execute on function private.register_source_document(uuid,text,text) to authenticated;

create or replace function public.admin_create_source_ingestion_job(
  _topic_id uuid,
  _query_text text,
  _provider text default 'crossref'
)
returns uuid
language sql
volatile
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select private.admin_create_source_ingestion_job($1,$2,$3);
$$;

create or replace function public.admin_get_source_ingestion_jobs(
  _limit integer default 20
)
returns table(
  id uuid,
  topic_id uuid,
  provider text,
  query_text text,
  stage text,
  status text,
  candidate_count integer,
  selected_count integer,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
volatile
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select * from private.admin_get_source_ingestion_jobs($1);
$$;

create or replace function public.admin_get_source_search_candidates(
  _job_id uuid,
  _limit integer default 50
)
returns table(
  id uuid,
  provider text,
  external_id text,
  title text,
  canonical_url text,
  source_type text,
  authors jsonb,
  publisher text,
  publication_date date,
  doi text,
  language text,
  relevance_score numeric,
  validation_status text,
  rights_class text,
  access_model text,
  rights_evidence_url text,
  rights_evidence_note text,
  source_id uuid,
  metadata jsonb
)
language sql
volatile
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select * from private.admin_get_source_search_candidates($1,$2);
$$;

create or replace function public.admin_set_publication(
  _entity_type text,
  _entity_id uuid,
  _published boolean
)
returns jsonb
language sql
volatile
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select private.admin_set_publication($1,$2,$3);
$$;

create or replace function public.get_admin_content_overview()
returns table(
  entity_type text,
  entity_id uuid,
  name text,
  parent_name text,
  published boolean,
  updated_at timestamptz
)
language sql
volatile
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select * from private.get_admin_content_overview();
$$;

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language sql
volatile
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select private.get_admin_dashboard_stats();
$$;

create or replace function public.get_admin_source_overview()
returns table(
  source_id uuid,
  title text,
  publisher text,
  source_type text,
  rights_class text,
  access_model text,
  verified_at timestamptz,
  document_count integer,
  topic_count integer
)
language sql
volatile
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select * from private.get_admin_source_overview();
$$;

create or replace function public.register_source_document(
  _source_id uuid,
  _retrieval_url text,
  _rights_snapshot text
)
returns uuid
language sql
volatile
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select private.register_source_document($1,$2,$3);
$$;

revoke execute on function public.admin_create_source_ingestion_job(uuid,text,text) from public, anon;
revoke execute on function public.admin_get_source_ingestion_jobs(integer) from public, anon;
revoke execute on function public.admin_get_source_search_candidates(uuid,integer) from public, anon;
revoke execute on function public.admin_set_publication(text,uuid,boolean) from public, anon;
revoke execute on function public.get_admin_content_overview() from public, anon;
revoke execute on function public.get_admin_dashboard_stats() from public, anon;
revoke execute on function public.get_admin_source_overview() from public, anon;
revoke execute on function public.register_source_document(uuid,text,text) from public, anon;

grant execute on function public.admin_create_source_ingestion_job(uuid,text,text) to authenticated;
grant execute on function public.admin_get_source_ingestion_jobs(integer) to authenticated;
grant execute on function public.admin_get_source_search_candidates(uuid,integer) to authenticated;
grant execute on function public.admin_set_publication(text,uuid,boolean) to authenticated;
grant execute on function public.get_admin_content_overview() to authenticated;
grant execute on function public.get_admin_dashboard_stats() to authenticated;
grant execute on function public.get_admin_source_overview() to authenticated;
grant execute on function public.register_source_document(uuid,text,text) to authenticated;
