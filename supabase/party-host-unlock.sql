-- Party host unlock flag (hysteresis: unlock at 125, lose hosting below 75)
-- Run once in Supabase SQL Editor

alter table profiles
  add column if not exists party_host_unlocked boolean not null default false;

-- Grandfather users who already earned Rising-tier reputation
update profiles
set party_host_unlocked = true
where reputation_score >= 125
  and party_host_unlocked = false;
