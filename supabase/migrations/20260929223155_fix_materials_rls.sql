-- Migration: 20260929223155_fix_materials_rls
-- Purpose: substituir policies RLS de materials que usavam request.jwt.claim_role
--          pela funcao existente public.has_role(), permitindo leitura via Browser Client

-- ── 1. materials ─────────────────────────────────────────────────────────────

-- Remove policy antiga que dependia de request.jwt.claim_role
drop policy if exists "Authenticated users can view published materials" on public.materials;

-- Nova policy: qualquer usuario autenticado com role student ou admin pode ler
-- materiais publicados. Escritas permanecem bloqueadas para usuarios comuns.
create policy "Students and admins can read published materials"
  on public.materials
  for select
  to authenticated
  using (
    status = 'published'
    and (
      public.has_role('student')
      or public.has_role('admin')
    )
  );

-- Mantem bloqueio de escrita para usuarios comuns (nao altera policies existentes)
drop policy if exists "No inserts on materials" on public.materials;
create policy "No inserts on materials"
  on public.materials for insert to authenticated with check (false);

drop policy if exists "No updates on materials" on public.materials;
create policy "No updates on materials"
  on public.materials for update to authenticated using (false);

drop policy if exists "No deletes on materials" on public.materials;
create policy "No deletes on materials"
  on public.materials for delete to authenticated using (false);


-- ── 2. material_sections ─────────────────────────────────────────────────────

-- Remove policy antiga
drop policy if exists "Authenticated users can view sections of published materials" on public.material_sections;

-- Nova policy: so permite leitura de secoes cujo material pai esteja publicado
create policy "Students and admins can read sections of published materials"
  on public.material_sections
  for select
  to authenticated
  using (
    exists (
      select 1 from public.materials m
      where m.id = material_sections.material_id
        and m.status = 'published'
    )
    and (
      public.has_role('student')
      or public.has_role('admin')
    )
  );

drop policy if exists "No inserts on material_sections" on public.material_sections;
create policy "No inserts on material_sections"
  on public.material_sections for insert to authenticated with check (false);

drop policy if exists "No updates on material_sections" on public.material_sections;
create policy "No updates on material_sections"
  on public.material_sections for update to authenticated using (false);

drop policy if exists "No deletes on material_sections" on public.material_sections;
create policy "No deletes on material_sections"
  on public.material_sections for delete to authenticated using (false);


-- ── 3. material_citations ────────────────────────────────────────────────────

-- Remove policy antiga
drop policy if exists "Authenticated users can view citations of published materials" on public.material_citations;

-- Nova policy: so permite leitura de citacoes cujo material pai esteja publicado
create policy "Students and admins can read citations of published materials"
  on public.material_citations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.materials m
      where m.id = material_citations.material_id
        and m.status = 'published'
    )
    and (
      public.has_role('student')
      or public.has_role('admin')
    )
  );

drop policy if exists "No inserts on material_citations" on public.material_citations;
create policy "No inserts on material_citations"
  on public.material_citations for insert to authenticated with check (false);

drop policy if exists "No updates on material_citations" on public.material_citations;
create policy "No updates on material_citations"
  on public.material_citations for update to authenticated using (false);

drop policy if exists "No deletes on material_citations" on public.material_citations;
create policy "No deletes on material_citations"
  on public.material_citations for delete to authenticated using (false);
