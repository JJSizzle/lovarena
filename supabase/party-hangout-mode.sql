-- Allow hangout-only parties (video + chat, no game)

alter table party_rooms
  drop constraint if exists party_rooms_game_mode_check;

alter table party_rooms
  add constraint party_rooms_game_mode_check
  check (game_mode in ('prompts', 'trivia', 'hangout'));
