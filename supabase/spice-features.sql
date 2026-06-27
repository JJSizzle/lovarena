alter table profiles
  add column if not exists avatar_emoji text default '😎',
  add column if not exists voice_only_default boolean not null default false,
  add column if not exists chat_streak int not null default 0,
  add column if not exists last_chat_day date,
  add column if not exists positive_ratings int not null default 0;

create table if not exists chat_feedback (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references chat_rooms(id) on delete set null,
  rater_id uuid not null references profiles(id) on delete cascade,
  partner_id uuid not null references profiles(id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (room_id, rater_id)
);

alter table chat_feedback disable row level security;
grant all on table chat_feedback to service_role;

create or replace function bump_chat_streak(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak int;
  v_last date;
begin
  select chat_streak, last_chat_day into v_streak, v_last
  from profiles where id = p_user_id;

  if v_last is null or v_last < current_date - 1 then
    v_streak := 1;
  elsif v_last = current_date - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  elsif v_last = current_date then
    v_streak := coalesce(v_streak, 1);
  else
    v_streak := 1;
  end if;

  update profiles
  set chat_streak = v_streak, last_chat_day = current_date
  where id = p_user_id;

  return v_streak;
end;
$$;

create or replace function apply_positive_rating(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    positive_ratings = positive_ratings + 1,
    reputation_score = least(100, reputation_score + 2)
  where id = p_partner_id;
end;
$$;
