
create table if not exists private.assistant_content_audits (
  topic_id uuid primary key references public.topics(id) on delete cascade,
  audited_at timestamptz not null default now(),
  audit_version text not null default 'assistant-content-audit-v1',
  section_count integer not null default 0,
  content_chars integer not null default 0,
  source_count integer not null default 0,
  question_count integer not null default 0,
  severity text not null default 'ok' check (severity in ('ok','attention','critical')),
  findings jsonb not null default '[]'::jsonb,
  correction_status text not null default 'not_needed' check (correction_status in ('not_needed','queued','applied','blocked')),
  correction_note text
);

insert into private.assistant_content_audits(topic_id,section_count,content_chars,source_count,question_count,severity,findings,correction_status)
select
 t.id,
 coalesce((select count(*) from public.material_sections ms join public.materials m on m.id=ms.material_id where m.topic_id=t.id),0),
 coalesce((select sum(length(ms.content)) from public.material_sections ms join public.materials m on m.id=ms.material_id where m.topic_id=t.id),0),
 coalesce((select count(*) from public.topic_sources ts where ts.topic_id=t.id),0),
 coalesce((select count(*) from public.exercise_questions q join public.exercises e on e.id=q.exercise_id and e.published=true where e.topic_id=t.id),0),
 'ok','[]'::jsonb,'not_needed'
from public.topics t
on conflict(topic_id) do update set
 audited_at=now(),
 section_count=excluded.section_count,
 content_chars=excluded.content_chars,
 source_count=excluded.source_count,
 question_count=excluded.question_count,
 audit_version=excluded.audit_version;

update private.assistant_content_audits a
set severity='critical',
    findings = jsonb_build_array('conteúdo incompatível com o tópico/disciplinaridade detectado na auditoria semântica'),
    correction_status='queued',
    correction_note='Reconstrução acadêmica serializada a partir de fontes do tópico; evitar paralelismo por limite Groq.'
where a.topic_id in (
'cd6bc744-b170-4d0b-9b4c-348d24f1aac9','10dd1bd0-bc29-4255-94ef-8ef40feb000f','e3b40f71-6cef-4554-88b5-f8406b025fb2',
'2d31b2b4-4cbf-4015-9058-0043df89d0a7','4fb09f46-cefc-441e-af6e-b293f85c1f39',
'6778e4ce-0d4f-415c-8340-c990be5e66bb','b097dc25-689e-43fb-9f62-04b3c87c2154','23726c00-3e46-46b5-8dc2-7afc4b63bf73',
'c5961b18-cfde-4ded-871b-30c173c1ae0d','928ce57b-6b58-45ca-9c72-596acd35f2d1',
'95695778-6f85-498f-90c3-e0e25351d381','75c42617-02bc-4f81-94cc-2593f8b1fb81',
'fc3a9221-c91f-40cf-9ec4-902f1639eea9','ba9588cc-a30a-4ab0-849a-4019abd47004','4ead6efb-5b08-4217-808d-15473a48df81',
'a6c676b9-bbbb-44e7-8e76-294cc06f2489','7a83ba40-009a-4a28-8dfe-6d39fa620d8d','8859f6ba-7793-49a9-8884-9760008cadb4',
'5c1d2e0e-36d3-416b-8ea5-35d93c4487aa','d3cec61b-4f64-4329-8f3e-d2ac2f64a5aa'
);

update private.assistant_content_audits a
set correction_status='applied',
    correction_note='Reconstrução acadêmica concluída; manter validação semântica pós-geração.'
where exists (
 select 1 from public.material_generation_runs r
 where r.topic_id=a.topic_id and r.status='completed'
 and r.prompt_version='academic_rebuild_v10_safe_source_refs'
 and r.model_name='openai/gpt-oss-20b'
 and r.completed_at is not null
 and r.completed_at > now() - interval '2 hours'
);

revoke all on private.assistant_content_audits from public;
