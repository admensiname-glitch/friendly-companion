create table if not exists public.internal_content_rebuild_auth (
  id integer primary key,
  token_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.internal_content_rebuild_auth enable row level security;

revoke all on public.internal_content_rebuild_auth from anon, authenticated;

insert into public.internal_content_rebuild_auth (id, token_hash)
values (1, encode(digest(encode(gen_random_bytes(32),'hex'), 'sha256'), 'hex'))
on conflict (id) do nothing;
