-- Ensure Direct people search never returns a user when either side has blocked the other.
create or replace function public.direct_find_people(search_text text)
returns table(user_id uuid, display_name text, avatar_url text, allow_requests boolean)
language sql
stable
security definer
set search_path to ''
as $function$
  select p.user_id,
         coalesce(nullif(trim(p.display_name), ''), 'Estudante') as display_name,
         p.avatar_url,
         true as allow_requests
  from public.student_profiles p
  left join public.direct_settings s on s.user_id = p.user_id
  left join public.direct_request_permissions rp
    on rp.recipient_id = p.user_id and rp.requester_id = auth.uid()
  where auth.uid() is not null
    and p.user_id <> auth.uid()
    and length(trim(coalesce(search_text, ''))) >= 2
    and coalesce(nullif(trim(p.display_name), ''), '') ilike '%' || left(trim(search_text), 80) || '%'
    and coalesce(s.allow_requests, true)
    and coalesce(rp.allowed, true)
    and not exists (
      select 1 from public.direct_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.user_id)
         or (b.blocker_id = p.user_id and b.blocked_id = auth.uid())
    )
  order by p.display_name
  limit 20;
$function$;
