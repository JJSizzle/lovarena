-- Per-question trivia voting timer (synced across clients)

alter table party_rooms
  add column if not exists voting_deadline_at timestamptz;
