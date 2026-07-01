-- Party chat read cursors (seen markers in party lobby/game chat)
-- Run once in Supabase SQL Editor

create table if not exists party_read_cursors (
  party_id uuid not null references party_rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (party_id, profile_id)
);

create index if not exists party_read_cursors_party_idx
  on party_read_cursors (party_id);

alter table party_read_cursors enable row level security;
