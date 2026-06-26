-- Abuse moderation: flag users who send severe hate speech / slurs
-- Run in Supabase SQL Editor (safe on existing projects)

create table if not exists flagged_users (
  user_id uuid primary key,
  flagged_for_abuse boolean not null default true,
  reason text not null default 'severe_hate_speech_or_slur',
  source_room_id uuid references chat_rooms(id) on delete set null,
  flagged_at timestamptz not null default now()
);

create index if not exists flagged_users_abuse_idx
  on flagged_users (flagged_for_abuse)
  where flagged_for_abuse = true;

alter table flagged_users disable row level security;

grant all on table flagged_users to service_role;
