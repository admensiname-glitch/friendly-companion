create or replace function private.guard_material_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  citation_total bigint;
  invalid_total bigint;
  section_total bigint;
  invalid_section_total bigint;
  uncovered_section_total bigint;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    select count(*),
      count(*) filter (
        where mc.verification_status <> 'approved'
          or s.verification_status <> 'verified'
          or nullif(btrim(mc.locator), '') is null
          or nullif(btrim(mc.supported_claim), '') is null
          or nullif(btrim(mc.evidence_excerpt), '') is null
          or nullif(btrim(mc.relevance_note), '') is null
      )
    into citation_total, invalid_total
    from public.material_citations mc
    join public.sources s on s.id = mc.source_id
    where mc.material_id = new.id;

    select count(*),
      count(*) filter (
        where nullif(btrim(ms.title), '') is null
          or length(btrim(coalesce(ms.content,''))) < 180
          or ms.content ~* '\{\{TOPICO\}\}|prática em preparação|avaliação formal em preparação|as questões serão revisadas'
      ),
      count(*) filter (
        where not exists (
          select 1 from public.material_citations mc
          join public.sources s on s.id = mc.source_id
          where mc.material_id = new.id
            and mc.section_id = ms.id
            and mc.verification_status = 'approved'
            and s.verification_status = 'verified'
        )
      )
    into section_total, invalid_section_total, uncovered_section_total
    from public.material_sections ms
    where ms.material_id = new.id;

    if citation_total = 0 or invalid_total > 0 then
      raise exception 'Publicação bloqueada: todas as citações precisam estar aprovadas, com fontes verificadas, evidência literal e localizador.'
        using errcode = '23514';
    end if;
    if section_total <> 10 or invalid_section_total > 0 or uncovered_section_total > 0 then
      raise exception 'Publicação bloqueada: são necessárias exatamente 10 seções válidas, sem marcadores de rascunho, cada uma sustentada por ao menos uma citação aprovada.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
