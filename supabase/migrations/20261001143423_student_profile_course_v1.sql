alter table if exists public.student_profiles
  add column if not exists course_id uuid;

alter table if exists public.student_profiles
  drop constraint if exists student_profiles_course_id_fkey;

alter table if exists public.student_profiles
  add constraint student_profiles_course_id_fkey
  foreign key (course_id)
  references public.courses(id)
  on delete set null;

create index if not exists idx_student_profiles_course_id
  on public.student_profiles(course_id);

update public.student_profiles sp
set course_id = matched.course_id
from (
  select distinct on (sd.user_id)
    sd.user_id,
    c.id as course_id
  from public.student_disciplines sd
  join public.courses c
    on lower(trim(c.name)) = lower(trim(sd.course))
  where sd.course is not null
    and trim(sd.course) <> ''
  order by sd.user_id, sd.created_at desc
) matched
where sp.user_id = matched.user_id
  and sp.course_id is null;