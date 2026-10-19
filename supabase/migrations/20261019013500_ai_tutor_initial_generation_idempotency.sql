-- Prevent duplicate initial comprehension-question generation for the same authenticated Tutor message.
-- Only the Edge Function service-role client may access these idempotency records.
create table if not exists public.ai_tutor_generation_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) = 64),
  topic_id uuid not null references public.topics(id) on delete cascade,
  conversation_id uuid null references public.ai_conversations(id) on delete cascade,
  state text not null check (state in ('processing', 'rate_limited', 'completed', 'failed')),
  assessment_id uuid null references public.ai_micro_assessments(id) on delete set null,
  lease_expires_at timestamptz not null default now(),
  error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_tutor_generation_requests_pkey primary key (user_id, idempotency_key)
);

create index if not exists ai_tutor_generation_requests_lease_idx
  on public.ai_tutor_generation_requests (lease_expires_at)
  where state in ('processing', 'rate_limited', 'failed');

alter table public.ai_tutor_generation_requests enable row level security;
revoke all on table public.ai_tutor_generation_requests from public, anon, authenticated;
grant all on table public.ai_tutor_generation_requests to service_role;
