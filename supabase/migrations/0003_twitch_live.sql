-- Adds the Twitch channel field used by the new /live page.
-- Run this once in the Supabase SQL editor, after 0001 and 0002.

alter table live_streams add column if not exists twitch_channel text;

-- Old Livepeer-specific columns (stream_key, playback_id) are no longer
-- written to, but left in place in case you want to roll back. Safe to
-- drop later once you've confirmed Twitch is working:
-- alter table live_streams drop column if exists stream_key;
-- alter table live_streams drop column if exists playback_id;
