-- Keep browser Web Push fields required only for browser subscriptions.
-- Android FCM registrations use fcm_token and do not have Web Push key material.
alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_web_fields;

alter table public.push_subscriptions
  add constraint push_subscriptions_web_fields
  check (
    (
      channel = 'web_push'
      and endpoint is not null
      and p256dh is not null
      and auth_key is not null
      and fcm_token is null
    )
    or
    (
      channel = 'android_fcm'
      and fcm_token is not null
      and length(btrim(fcm_token)) > 0
      and endpoint is null
      and p256dh is null
      and auth_key is null
    )
  );

-- Multiple NULLs are allowed by a normal PostgreSQL unique index, so Web Push rows
-- remain unaffected while a single token cannot be registered more than once.
create unique index if not exists push_subscriptions_fcm_token_unique
  on public.push_subscriptions (fcm_token);
