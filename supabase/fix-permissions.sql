-- Run this in Supabase SQL Editor if you see:
-- "permission denied for table waiting_users"

-- Functions run with owner privileges (bypasses RLS / grant issues)
alter function find_or_create_match(uuid) security definer;
alter function leave_chat(uuid, uuid) security definer;

alter function find_or_create_match(uuid) set search_path = public;
alter function leave_chat(uuid, uuid) set search_path = public;

-- Allow API roles to use the tables
grant all on table waiting_users to service_role;
grant all on table chat_rooms to service_role;
grant all on table messages to service_role;

grant all on table waiting_users to postgres;
grant all on table chat_rooms to postgres;
grant all on table messages to postgres;

-- Matching tables are server-only; disable RLS on queue/rooms
alter table waiting_users disable row level security;
alter table chat_rooms disable row level security;
