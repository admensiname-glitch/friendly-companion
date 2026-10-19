
create table if not exists private.content_rebuild_queue (
  topic_id uuid primary key references public.topics(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  attempts integer not null default 0,
  last_request_id bigint,
  last_error text,
  updated_at timestamptz not null default now()
);

insert into private.content_rebuild_queue(topic_id)
select t.id
from public.topics t
where t.id in (
'cd6bc744-b170-4d0b-9b4c-348d24f1aac9','10dd1bd0-bc29-4255-94ef-8ef40feb000f','e3b40f71-6cef-4554-88b5-f8406b025fb2',
'2d31b2b4-4cbf-4015-9058-0043df89d0a7','4fb09f46-cefc-441e-af6e-b293f85c1f39',
'6778e4ce-0d4f-415c-8340-c990be5e66bb','b097dc25-689e-43fb-9f62-04b3c87c2154','23726c00-3e46-46b5-8dc2-7afc4b63bf73',
'c5961b18-cfde-4ded-871b-30c173c1ae0d','928ce57b-6b58-45ca-9c72-596acd35f2d1',
'95695778-6f85-498f-90c3-e0e25351d381','75c42617-02bc-4f81-94cc-2593f8b1fb81',
'fc3a9221-c91f-40cf-9ec4-902f1639eea9','ba9588cc-a30a-4ab0-849a-4019abd47004','4ead6efb-5b08-4217-808d-15473a48df81',
'a6c676b9-bbbb-44e7-8e76-294cc06f2489','7a83ba40-009a-4a28-8dfe-6d39fa620d8d','8859f6ba-7793-49a9-8884-9760008cadb4',
'5c1d2e0e-36d3-416b-8ea5-35d93c4487aa','d3cec61b-4f64-4329-8f3e-d2ac2f64a5aa'
)
on conflict (topic_id) do nothing;

create or replace function private.process_content_rebuild_queue()
returns void
language plpgsql
security definer
set search_path = public, private, pg_catalog, extensions
as $$
declare
  v_topic uuid;
  v_request bigint;
begin
  update private.content_rebuild_queue q
  set status='completed', updated_at=now(), last_error=null
  where q.status in ('pending','running')
    and exists (
      select 1 from public.material_generation_runs r
      where r.topic_id=q.topic_id
        and r.status='completed'
        and r.prompt_version='academic_rebuild_v10_safe_source_refs'
        and r.started_at > q.updated_at - interval '1 minute'
    );

  update private.content_rebuild_queue
  set status='pending', updated_at=now()
  where status='running' and updated_at < now() - interval '10 minutes';

  select topic_id into v_topic
  from private.content_rebuild_queue
  where status='pending'
  order by updated_at, topic_id
  for update skip locked
  limit 1;

  if v_topic is null then return; end if;

  update private.content_rebuild_queue
  set status='running', attempts=attempts+1, updated_at=now()
  where topic_id=v_topic;

  begin
    v_request := private.enqueue_material_rebuild(array[v_topic]);
    update private.content_rebuild_queue
    set last_request_id=v_request, updated_at=now()
    where topic_id=v_topic;
  exception when others then
    update private.content_rebuild_queue
    set status='failed', last_error=sqlerrm, updated_at=now()
    where topic_id=v_topic;
  end;
end;
$$;

revoke all on private.content_rebuild_queue from public;
revoke all on function private.process_content_rebuild_queue() from public;

select cron.schedule(
  'ensina-me-content-rebuild-serial',
  '*/3 * * * *',
  $$select private.process_content_rebuild_queue();$$
)
where not exists (select 1 from cron.job where jobname='ensina-me-content-rebuild-serial');
