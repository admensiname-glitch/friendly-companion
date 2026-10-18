create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default false,
  study_reminders boolean not null default true,
  review_reminders boolean not null default true,
  learning_recommendations boolean not null default true,
  announcements boolean not null default false,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time not null default '21:00',
  quiet_hours_end time not null default '08:00',
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
drop policy if exists "Users manage own notification preferences" on public.notification_preferences;
create policy "Users manage own notification preferences" on public.notification_preferences
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.notification_preferences to authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('web_push','android_fcm')),
  endpoint text,
  p256dh text,
  auth_key text,
  fcm_token text,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_web_fields check (
    (channel = 'web_push' and endpoint is not null and p256dh is not null and auth_key is not null)
    or (channel = 'android_fcm' and fcm_token is not null)
  )
);
create unique index if not exists push_subscriptions_endpoint_unique on public.push_subscriptions(endpoint) where endpoint is not null;
create unique index if not exists push_subscriptions_fcm_token_unique on public.push_subscriptions(fcm_token) where fcm_token is not null;
create index if not exists push_subscriptions_user_active_idx on public.push_subscriptions(user_id, active);
alter table public.push_subscriptions enable row level security;
drop policy if exists "Users read own push subscriptions" on public.push_subscriptions;
create policy "Users read own push subscriptions" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users register own push subscriptions" on public.push_subscriptions;
create policy "Users register own push subscriptions" on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own push subscriptions" on public.push_subscriptions;
create policy "Users update own push subscriptions" on public.push_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own push subscriptions" on public.push_subscriptions;
create policy "Users delete own push subscriptions" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  topic text,
  category text not null default 'learning' check (category in ('study','review','recommendation','announcement','system')),
  target_url text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  push_sent_at timestamptz,
  delivery_status text not null default 'queued' check (delivery_status in ('queued','sent','partial','failed','in_app_only'))
);
create index if not exists student_notifications_user_created_idx on public.student_notifications(user_id, created_at desc);
alter table public.student_notifications enable row level security;
drop policy if exists "Users read own notifications" on public.student_notifications;
create policy "Users read own notifications" on public.student_notifications for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users mark own notifications read" on public.student_notifications;
create policy "Users mark own notifications read" on public.student_notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, update on public.student_notifications to authenticated;
