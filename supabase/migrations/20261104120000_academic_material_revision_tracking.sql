-- Revisions of evidence and didactic sections must trigger a fresh audit.
-- Status-only approval updates are intentionally excluded to avoid self-invalidating
-- the batch that performed those approvals.
create or replace function private.bump_material_academic_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  sid uuid;
  did uuid;
  mid uuid;
begin
  if tg_table_name = 'material_citations' then
    if tg_op = 'DELETE' then
      update public.materials set updated_at = now() where id = old.material_id;
    else
      update public.materials set updated_at = now() where id = new.material_id;
      if tg_op = 'UPDATE' and old.material_id is distinct from new.material_id then
        update public.materials set updated_at = now() where id = old.material_id;
      end if;
    end if;
  elsif tg_table_name = 'sources' then
    sid := case when tg_op = 'DELETE' then old.id else new.id end;
    update public.materials m set updated_at = now()
    where exists (select 1 from public.material_citations mc where mc.material_id = m.id and mc.source_id = sid);
  elsif tg_table_name = 'source_documents' then
    sid := case when tg_op = 'DELETE' then old.source_id else new.source_id end;
    update public.materials m set updated_at = now()
    where exists (select 1 from public.material_citations mc where mc.material_id = m.id and mc.source_id = sid);
  elsif tg_table_name = 'source_rights' then
    sid := case when tg_op = 'DELETE' then old.source_id else new.source_id end;
    update public.materials m set updated_at = now()
    where exists (select 1 from public.material_citations mc where mc.material_id = m.id and mc.source_id = sid);
  elsif tg_table_name = 'source_chunks' then
    did := case when tg_op = 'DELETE' then old.source_document_id else new.source_document_id end;
    select sd.source_id into sid from public.source_documents sd where sd.id = did;
    if sid is not null then
      update public.materials m set updated_at = now()
      where exists (select 1 from public.material_citations mc where mc.material_id = m.id and mc.source_id = sid);
    end if;
  elsif tg_table_name = 'material_sections' then
    mid := case when tg_op = 'DELETE' then old.material_id else new.material_id end;
    update public.materials set updated_at = now() where id = mid;
    if tg_op = 'UPDATE' and old.material_id is distinct from new.material_id then
      update public.materials set updated_at = now() where id = old.material_id;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.bump_material_academic_revision() from public, anon, authenticated;

drop trigger if exists trg_bump_material_revision_citations on public.material_citations;
create trigger trg_bump_material_revision_citations after insert or delete or update of material_id, source_id, section_id, citation_label, locator, supported_claim, evidence_excerpt, relevance_note on public.material_citations for each row execute function private.bump_material_academic_revision();
drop trigger if exists trg_bump_material_revision_sources on public.sources;
create trigger trg_bump_material_revision_sources after update of title, source_type, authors, publisher, publication_date, doi, canonical_url, language on public.sources for each row execute function private.bump_material_academic_revision();
drop trigger if exists trg_bump_material_revision_documents on public.source_documents;
create trigger trg_bump_material_revision_documents after insert or delete or update of source_id, canonical_url, retrieval_url, retrieval_status, content_sha256, retrieved_at, rights_snapshot on public.source_documents for each row execute function private.bump_material_academic_revision();
drop trigger if exists trg_bump_material_revision_rights on public.source_rights;
create trigger trg_bump_material_revision_rights after insert or delete or update of source_id, rights_class, access_model, evidence_url, evidence_note, verified_at, superseded_at on public.source_rights for each row execute function private.bump_material_academic_revision();
drop trigger if exists trg_bump_material_revision_chunks on public.source_chunks;
create trigger trg_bump_material_revision_chunks after insert or delete or update of source_document_id, content, locator on public.source_chunks for each row execute function private.bump_material_academic_revision();
drop trigger if exists trg_bump_material_revision_sections on public.material_sections;
create trigger trg_bump_material_revision_sections after insert or delete or update of material_id, title, content, position on public.material_sections for each row execute function private.bump_material_academic_revision();
