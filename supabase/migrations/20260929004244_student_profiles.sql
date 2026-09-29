-- Tabela de perfil acadêmico do aluno
create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  institution text,
  semester integer check (semester between 1 and 20),
  daily_study_minutes integer check (daily_study_minutes between 15 and 480),
  difficulties text[],
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

-- Proprietário lê e modifica apenas seu próprio perfil
create policy "Students manage their own profile"
on public.student_profiles
for all
to authenticated
using ((select auth.uid()) = user_id);

-- Disciplinas cursadas pelo aluno
create table if not exists public.student_disciplines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline_name text not null,
  course text not null default 'Pedagogia',
  created_at timestamptz not null default now(),
  constraint unique_user_discipline unique (user_id, discipline_name)
);

alter table public.student_disciplines enable row level security;

create policy "Students manage their own disciplines"
on public.student_disciplines
for all
to authenticated
using ((select auth.uid()) = user_id);

-- Avaliações futuras informadas pelo aluno
create table if not exists public.student_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline text not null,
  exam_type text not null,
  exam_date date,
  created_at timestamptz not null default now()
);

alter table public.student_exams enable row level security;

create policy "Students manage their own exams"
on public.student_exams
for all
to authenticated
using ((select auth.uid()) = user_id);
