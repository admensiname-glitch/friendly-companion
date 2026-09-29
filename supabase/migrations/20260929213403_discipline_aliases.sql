-- Migration: discipline_aliases
-- Purpose: explicit bridge between student-reported discipline names and official catalog disciplines

-- ── Table ─────────────────────────────────────────────────────────────────────

create table if not exists discipline_aliases (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now()
);

-- unique pair: one discipline cannot have the same normalized_alias twice
alter table discipline_aliases add constraint discipline_aliases_discipline_normalized_unique
  unique (discipline_id, normalized_alias);

-- index for fast lookup by normalized name
create index if not exists discipline_aliases_normalized_alias_idx
  on discipline_aliases (normalized_alias);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table discipline_aliases enable row level security;

-- Anyone authenticated can read aliases that belong to published official disciplines
create policy "Authenticated users can read aliases for published disciplines"
  on discipline_aliases for select
  to authenticated
  using (
    exists (
      select 1 from public.disciplines d
      where d.id = discipline_aliases.discipline_id
        and d.published = true
    )
  );

-- No writes for regular authenticated users
create policy "No inserts by authenticated users"
  on discipline_aliases for insert to authenticated with check (false);

create policy "No updates by authenticated users"
  on discipline_aliases for update to authenticated using (false);

create policy "No deletes by authenticated users"
  on discipline_aliases for delete to authenticated using (false);

-- ── Initial alias ─────────────────────────────────────────────────────────────

-- Alias: "Didática Geral" (how a student reported it) → "Didática" (official catalog)
-- 1. Find the official "Didática" discipline in the published catalog
-- 2. Insert the alias pointing to it

do $$
declare
  didatica_id uuid;
begin
  select d.id into didatica_id
  from public.disciplines d
  join public.courses c on c.id = d.course_id
  where d.name = 'Didática'
    and d.published = true
    and c.name = 'Pedagogia'
    and c.published = true
  limit 1;

  if didatica_id is not null then
    insert into discipline_aliases (discipline_id, alias, normalized_alias)
    values (
      didatica_id,
      'Didática Geral',
      'didatica geral'  -- already normalized: trim, lowercase, no accents
    )
    on conflict (discipline_id, normalized_alias) do nothing;
  end if;
end;
$$;
