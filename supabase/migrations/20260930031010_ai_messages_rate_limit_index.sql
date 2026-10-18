create index if not exists ai_messages_user_role_created_idx
on public.ai_messages (user_id, role, created_at desc);