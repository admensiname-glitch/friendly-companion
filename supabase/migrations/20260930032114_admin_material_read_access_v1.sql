
create policy "Admins select all materials"
on public.materials
for select to authenticated
using (public.has_role('admin'));

create policy "Admins select all material sections"
on public.material_sections
for select to authenticated
using (public.has_role('admin'));
