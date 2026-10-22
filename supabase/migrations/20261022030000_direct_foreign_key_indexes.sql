-- Supporting indexes for Direct foreign keys.
-- Applied to production as migration direct_foreign_key_indexes.
create index if not exists idx_direct_conversations_created_by on public.direct_conversations (created_by);
create index if not exists idx_direct_messages_sender_id on public.direct_messages (sender_id);
create index if not exists idx_direct_voice_drafts_conversation_id on public.direct_voice_drafts (conversation_id);
create index if not exists idx_direct_voice_drafts_user_id on public.direct_voice_drafts (user_id);
