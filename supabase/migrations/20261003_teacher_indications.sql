-- Teacher-to-student indication flow
create table if not exists public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(class_id, student_id)
);

create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  message text,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.teacher_classes enable row level security;
alter table public.teacher_class_members enable row level security;
alter table public.teacher_assignments enable row level security;

create or replace function public.is_teacher_or_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('teacher','professor','admin')); $$;

create or replace function public.join_teacher_class(p_join_code text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare c public.teacher_classes;
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 select * into c from public.teacher_classes where upper(join_code)=upper(trim(p_join_code)) limit 1;
 if c.id is null then raise exception 'Código de turma não encontrado'; end if;
 insert into public.teacher_class_members(class_id,student_id) values(c.id,auth.uid()) on conflict do nothing;
 return jsonb_build_object('class_id',c.id,'name',c.name);
end; $$;

create or replace function public.get_student_teacher_assignments()
returns table(id uuid,title text,message text,due_at timestamptz,topic_id uuid,topic_name text,discipline_id uuid,discipline_name text,class_name text,teacher_id uuid)
language sql stable security definer set search_path=public
as $$
 select a.id,a.title,a.message,a.due_at,a.topic_id,t.name,d.id,d.name,c.name,a.teacher_id
 from public.teacher_assignments a
 join public.teacher_class_members m on m.class_id=a.class_id and m.student_id=auth.uid()
 join public.teacher_classes c on c.id=a.class_id
 left join public.topics t on t.id=a.topic_id
 left join public.disciplines d on d.id=t.discipline_id
 order by a.created_at desc;
$$;

create or replace function public.create_teacher_class(p_name text,p_join_code text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare new_id uuid;
begin
 if not public.is_teacher_or_admin() then raise exception 'teacher role required'; end if;
 insert into public.teacher_classes(teacher_id,name,join_code) values(auth.uid(),trim(p_name),upper(trim(p_join_code))) returning id into new_id;
 return new_id;
end; $$;

create or replace function public.create_teacher_assignment(p_class_id uuid,p_topic_id uuid,p_title text,p_message text default null,p_due_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public
as $$
declare new_id uuid;
begin
 if not public.is_teacher_or_admin() then raise exception 'teacher role required'; end if;
 if not exists(select 1 from public.teacher_classes where id=p_class_id and teacher_id=auth.uid()) then raise exception 'turma não pertence ao professor'; end if;
 insert into public.teacher_assignments(class_id,teacher_id,topic_id,title,message,due_at)
 values(p_class_id,auth.uid(),p_topic_id,trim(p_title),p_message,p_due_at) returning id into new_id;
 return new_id;
end; $$;

grant execute on function public.join_teacher_class(text) to authenticated;
grant execute on function public.get_student_teacher_assignments() to authenticated;
grant execute on function public.create_teacher_class(text,text) to authenticated;
grant execute on function public.create_teacher_assignment(uuid,uuid,text,text,timestamptz) to authenticated;
