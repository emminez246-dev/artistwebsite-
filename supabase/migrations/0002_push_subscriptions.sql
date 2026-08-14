-- Standard Web Push subscriptions (replaces the old fcm_tokens table).
-- Each row is one browser's PushSubscription. No Firebase project needed.
--
-- Run this once in the Supabase SQL editor, after 0001_likes.sql.

create table if not exists push_subscriptions (
  endpoint    text primary key,
  p256dh      text not null,
  auth        text not null,
  device_info jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
-- No anon policies: all reads/writes happen through the server (service role
-- key) via the /api/push/* routes, never directly from the browser.

-- Optional: migrate any old Firebase tokens table out once you've confirmed
-- the new flow works end to end.
-- drop table if exists fcm_tokens;
