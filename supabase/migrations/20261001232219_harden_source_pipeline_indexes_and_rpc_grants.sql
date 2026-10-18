begin;

revoke all on function public.get_student_topic_application_progress(uuid) from public, anon;
grant execute on function public.get_student_topic_application_progress(uuid) to authenticated;

create index if not exists source_ingestion_jobs_requested_by_idx
  on public.source_ingestion_jobs(requested_by);

commit;
