create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  constraint user_roles_role_check check (role in ('student', 'admin')),
  constraint user_roles_user_id_role_key unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Users can read their own roles"
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = required_role
  );
$$;

revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to authenticated;

create or replace function public.assign_initial_student_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger assign_initial_student_role_on_auth_user
after insert on auth.users
for each row
execute function public.assign_initial_student_role();

insert into public.user_roles (user_id, role)
select id, 'student'
from auth.users
on conflict (user_id, role) do nothing;
