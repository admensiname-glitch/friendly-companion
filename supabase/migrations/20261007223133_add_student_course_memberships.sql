
create table if not exists public.student_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists student_courses_user_id_idx on public.student_courses(user_id);
create index if not exists student_courses_course_id_idx on public.student_courses(course_id);

alter table public.student_courses enable row level security;

revoke all on table public.student_courses from anon;
grant select, insert, update, delete on table public.student_courses to authenticated;

drop policy if exists "Students can view their course memberships" on public.student_courses;
create policy "Students can view their course memberships"
on public.student_courses for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Students can add their course memberships" on public.student_courses;
create policy "Students can add their course memberships"
on public.student_courses for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Students can update their course memberships" on public.student_courses;
create policy "Students can update their course memberships"
on public.student_courses for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Students can remove their course memberships" on public.student_courses;
create policy "Students can remove their course memberships"
on public.student_courses for delete to authenticated
using ((select auth.uid()) = user_id);

insert into public.student_courses (user_id, course_id)
select sp.user_id, sp.course_id
from public.student_profiles sp
where sp.course_id is not null
on conflict (user_id, course_id) do nothing;
