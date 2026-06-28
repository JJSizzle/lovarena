-- Track how a friendship started: mutual in-chat Connect vs friend request
-- Run in Supabase SQL Editor

alter table friendships
  add column if not exists connection_type text;

alter table friendships
  drop constraint if exists friendships_connection_type_check;

alter table friendships
  add constraint friendships_connection_type_check
  check (connection_type is null or connection_type in ('mutual_connect', 'request'));

comment on column friendships.connection_type is
  'mutual_connect = both tapped Connect in chat; request = friend request flow';
