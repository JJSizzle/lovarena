-- Username change limit: 2 renames after the initial username
-- Unique usernames: case-insensitive (index on lower(username) from auth-social.sql)
-- Run in Supabase SQL Editor on existing projects.

alter table profiles
  add column if not exists username_change_count int not null default 0;

alter table profiles drop constraint if exists profiles_username_change_count_nonneg;
alter table profiles add constraint profiles_username_change_count_nonneg
  check (username_change_count >= 0 and username_change_count <= 2);

create unique index if not exists profiles_username_idx on profiles (lower(username));
