-- Persistent, device-scoped likes.
-- No accounts required: each browser gets a random "device_id" (see lib/device-id.ts)
-- stored in localStorage. That id is the unique key that stops a device from
-- liking the same item twice, and lets a device see its like on any tab/window.
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists pgcrypto;

-- Make sure every likeable table has a denormalized counter column.
alter table songs  add column if not exists likes integer not null default 0;
alter table posts  add column if not exists likes integer not null default 0;
alter table videos add column if not exists likes integer not null default 0;

create table if not exists likes (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('song', 'post', 'video')),
  target_id   uuid not null,
  device_id   text not null check (char_length(device_id) between 10 and 100),
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, device_id)
);

create index if not exists likes_target_idx on likes (target_type, target_id);
create index if not exists likes_device_idx on likes (device_id);

-- Lock the raw table down. All access goes through the RPCs below, which run
-- as SECURITY DEFINER, so the anon key can never read/write another device's rows.
alter table likes enable row level security;

-- Toggle a like for (target_type, target_id) from device_id.
-- Atomically inserts-or-deletes the like row and adjusts the counter, so
-- concurrent taps (e.g. two tabs) can't double count or go negative.
create or replace function toggle_like(
  p_target_type text,
  p_target_id uuid,
  p_device_id text
) returns table (liked boolean, like_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted uuid;
  v_table text;
begin
  if p_target_type not in ('song', 'post', 'video') then
    raise exception 'invalid target_type';
  end if;
  v_table := p_target_type || 's';

  delete from likes
    where target_type = p_target_type
      and target_id = p_target_id
      and device_id = p_device_id
    returning id into v_deleted;

  if v_deleted is not null then
    execute format('update %I set likes = greatest(0, likes - 1) where id = $1', v_table)
      using p_target_id;
    liked := false;
  else
    insert into likes (target_type, target_id, device_id)
      values (p_target_type, p_target_id, p_device_id)
      on conflict do nothing;
    execute format('update %I set likes = likes + 1 where id = $1', v_table)
      using p_target_id;
    liked := true;
  end if;

  execute format('select likes from %I where id = $1', v_table)
    into like_count
    using p_target_id;

  return next;
end;
$$;

-- Given a list of target_ids, return which ones this device has already liked.
-- Used to restore like state on page load / in another tab.
create or replace function get_liked(
  p_target_type text,
  p_target_ids uuid[],
  p_device_id text
) returns table (target_id uuid)
language sql
security definer
set search_path = public
as $$
  select l.target_id
  from likes l
  where l.target_type = p_target_type
    and l.device_id = p_device_id
    and l.target_id = any(p_target_ids);
$$;

grant execute on function toggle_like(text, uuid, text) to anon, authenticated;
grant execute on function get_liked(text, uuid[], text) to anon, authenticated;
