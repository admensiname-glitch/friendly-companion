drop policy if exists "No updates on materials" on public.materials;
drop policy if exists "materials_no_update" on public.materials;

drop policy if exists "No updates on material_sections" on public.material_sections;
drop policy if exists "material_sections_no_update" on public.material_sections;

create policy "Admins update materials"
on public.materials
for update to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "Admins update material sections"
on public.material_sections
for update to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "Admins select all materials"
on public.materials
for select to authenticated
using (public.has_role('admin'));

create policy "Admins select all material sections"
on public.material_sections
for select to authenticated
using (public.has_role('admin'));
