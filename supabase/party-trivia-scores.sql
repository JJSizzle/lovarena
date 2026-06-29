-- Trivia scoreboard per party member

alter table party_rooms
  add column if not exists last_scored_round int not null default -1;

create table if not exists party_trivia_scores (
  party_id uuid not null references party_rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  score int not null default 0 check (score >= 0),
  primary key (party_id, profile_id)
);

create index if not exists party_trivia_scores_party_idx
  on party_trivia_scores (party_id);

grant all on table party_trivia_scores to service_role;

alter table party_trivia_scores enable row level security;

drop policy if exists "Party members read party_trivia_scores" on party_trivia_scores;

create policy "Party members read party_trivia_scores"
  on party_trivia_scores for select
  to authenticated
  using (public.is_party_member(party_id, auth.uid()));

grant select on table party_trivia_scores to authenticated;
