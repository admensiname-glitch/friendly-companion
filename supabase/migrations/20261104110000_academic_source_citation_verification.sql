-- Source and citation verification gate. This migration is idempotent for databases
-- where the gate was previously installed directly through the Supabase migration API.
create schema if not exists private;

alter table public.sources
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_method text,
  add column if not exists verification_evidence text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id);

alter table public.material_citations
  add column if not exists verification_status text not null default 'pending',
  add column if not exists supported_claim text,
  add column if not exists evidence_excerpt text,
  add column if not exists relevance_note text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname='sources_verification_status_check' and conrelid='public.sources'::regclass) then
    alter table public.sources add constraint sources_verification_status_check
      check (verification_status in ('pending','verified','rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname='material_citations_verification_status_check' and conrelid='public.material_citations'::regclass) then
    alter table public.material_citations add constraint material_citations_verification_status_check
      check (verification_status in ('pending','approved','rejected'));
  end if;
end $$;

create or replace function private.guard_source_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  status_changed boolean := false;
  source_data_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    status_changed := new.verification_status <> 'pending';
  else
    status_changed := new.verification_status is distinct from old.verification_status;
    source_data_changed :=
      new.title is distinct from old.title
      or new.source_type is distinct from old.source_type
      or new.authors is distinct from old.authors
      or new.publisher is distinct from old.publisher
      or new.publication_date is distinct from old.publication_date
      or new.doi is distinct from old.doi
      or new.canonical_url is distinct from old.canonical_url
      or new.language is distinct from old.language
      or new.verification_method is distinct from old.verification_method
      or new.verification_evidence is distinct from old.verification_evidence;
  end if;

  if tg_op = 'UPDATE' and (source_data_changed or (status_changed and new.verification_status <> 'verified'))
     and exists (
       select 1 from public.material_citations mc
       join public.materials m on m.id = mc.material_id
       where mc.source_id = old.id and m.status = 'published'
     ) then
    raise exception 'Fonte vinculada a material publicado: retire o material de publicação antes de alterar ou invalidar a fonte.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and source_data_changed
     and old.verification_status in ('verified','rejected')
     and not status_changed then
    new.verification_status := 'pending';
    new.verified_at := null;
    new.verified_by := null;
    return new;
  end if;

  if status_changed then
    if actor is null or not exists (
      select 1 from public.user_roles ur where ur.user_id = actor and ur.role = 'admin'
    ) then
      raise exception 'Somente um administrador autenticado pode alterar a validação de fontes.'
        using errcode = '42501';
    end if;

    if new.verification_status = 'verified' then
      if nullif(btrim(new.title), '') is null
         or jsonb_typeof(coalesce(new.authors, '[]'::jsonb)) <> 'array'
         or jsonb_array_length(coalesce(new.authors, '[]'::jsonb)) = 0
         or nullif(btrim(new.publisher), '') is null
         or (nullif(btrim(new.canonical_url), '') is null and nullif(btrim(new.doi), '') is null)
         or nullif(btrim(new.verification_method), '') is null
         or nullif(btrim(new.verification_evidence), '') is null then
        raise exception 'Fonte não pode ser validada: faltam autoria, instituição/editora, DOI/URL ou evidência verificável.'
          using errcode = '23514';
      end if;
    end if;

    if new.verification_status = 'pending' then
      new.verified_at := null;
      new.verified_by := null;
    else
      new.verified_at := now();
      new.verified_by := actor;
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.guard_citation_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  source_status text;
  status_changed boolean := false;
  citation_data_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    status_changed := new.verification_status <> 'pending';
  else
    status_changed := new.verification_status is distinct from old.verification_status;
    citation_data_changed :=
      new.material_id is distinct from old.material_id
      or new.source_id is distinct from old.source_id
      or new.section_id is distinct from old.section_id
      or new.citation_label is distinct from old.citation_label
      or new.locator is distinct from old.locator
      or new.supported_claim is distinct from old.supported_claim
      or new.evidence_excerpt is distinct from old.evidence_excerpt
      or new.relevance_note is distinct from old.relevance_note;
  end if;

  if tg_op = 'UPDATE' and (citation_data_changed or (status_changed and new.verification_status <> 'approved'))
     and exists (select 1 from public.materials m where m.id = old.material_id and m.status = 'published') then
    raise exception 'Citação vinculada a material publicado: retire o material de publicação antes de alterar ou invalidar a citação.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and citation_data_changed
     and old.verification_status in ('approved','rejected')
     and not status_changed then
    new.verification_status := 'pending';
    new.verified_at := null;
    new.verified_by := null;
    return new;
  end if;

  if status_changed then
    if actor is null or not exists (
      select 1 from public.user_roles ur where ur.user_id = actor and ur.role = 'admin'
    ) then
      raise exception 'Somente um administrador autenticado pode alterar a validação da citação.'
        using errcode = '42501';
    end if;

    if new.verification_status = 'approved' then
      select s.verification_status into source_status from public.sources s where s.id = new.source_id;
      if source_status is distinct from 'verified'
         or nullif(btrim(new.locator), '') is null
         or nullif(btrim(new.supported_claim), '') is null
         or nullif(btrim(new.evidence_excerpt), '') is null
         or nullif(btrim(new.relevance_note), '') is null then
        raise exception 'Citação não pode ser aprovada: a fonte precisa estar verificada e a citação precisa de localizador, afirmação sustentada, trecho de evidência e justificativa de pertinência.'
          using errcode = '23514';
      end if;
    end if;

    if new.verification_status = 'pending' then
      new.verified_at := null;
      new.verified_by := null;
    else
      new.verified_at := now();
      new.verified_by := actor;
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.guard_material_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  citation_total bigint;
  invalid_total bigint;
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

    if citation_total = 0 or invalid_total > 0 then
      raise exception 'Publicação bloqueada: o material precisa ter citações aprovadas, fontes verificadas e evidências/localizadores específicos em todas as citações.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.guard_published_material_metadata()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'published' and (
    new.title is distinct from old.title
    or new.introduction is distinct from old.introduction
    or new.topic_id is distinct from old.topic_id
  ) then
    raise exception 'Material publicado: retire-o de publicação antes de alterar título, introdução ou tópico.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_source_verification on public.sources;
create trigger trg_guard_source_verification before insert or update on public.sources
  for each row execute function private.guard_source_verification();
drop trigger if exists trg_guard_citation_verification on public.material_citations;
create trigger trg_guard_citation_verification before insert or update on public.material_citations
  for each row execute function private.guard_citation_verification();
drop trigger if exists trg_guard_material_publication on public.materials;
create trigger trg_guard_material_publication before insert or update of status on public.materials
  for each row execute function private.guard_material_publication();
drop trigger if exists trg_guard_published_material_metadata on public.materials;
create trigger trg_guard_published_material_metadata before update of title, introduction, topic_id on public.materials
  for each row execute function private.guard_published_material_metadata();

alter table public.sources enable row level security;
alter table public.material_citations enable row level security;
drop policy if exists sources_admin_insert on public.sources;
create policy sources_admin_insert on public.sources for insert to authenticated
  with check (private.has_role('admin'));
drop policy if exists sources_admin_update on public.sources;
create policy sources_admin_update on public.sources for update to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
drop policy if exists sources_select_student_admin on public.sources;
create policy sources_select_student_admin on public.sources for select to authenticated
  using (private.has_role('admin') or (private.has_role('student') and status = 'active'));
drop policy if exists sources_no_delete on public.sources;
create policy sources_no_delete on public.sources for delete to public using (false);

drop policy if exists material_citations_admin_insert on public.material_citations;
create policy material_citations_admin_insert on public.material_citations for insert to authenticated
  with check (private.has_role('admin'));
drop policy if exists material_citations_admin_update on public.material_citations;
create policy material_citations_admin_update on public.material_citations for update to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
drop policy if exists material_citations_select_student_admin on public.material_citations;
create policy material_citations_select_student_admin on public.material_citations for select to authenticated
  using (
    private.has_role('admin')
    or (
      private.has_role('student')
      and exists (select 1 from public.materials m where m.id = material_citations.material_id and m.status = 'published')
    )
  );
