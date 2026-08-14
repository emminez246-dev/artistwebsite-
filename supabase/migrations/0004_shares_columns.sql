-- Adds a shares counter to songs and videos, matching what posts already
-- has, so the new ShareButton component works consistently everywhere.
-- Run this once in the Supabase SQL editor, after 0001-0003.

alter table songs add column if not exists shares integer not null default 0;
alter table videos add column if not exists shares integer not null default 0;
