-- Lovarena: Auth profiles, friendships, private messaging, room connect
-- Run in Supabase SQL Editor after existing schema

-- ---------------------------------------------------------------------------
-- Profiles (extends Supabase auth.users)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  age_verified boolean not null default false,
  gender_identity text check (gender_identity in ('male', 'female', 'non_binary')),
  looking_for text check (
    looking_for in (
      'straight_men',
      'straight_women',
      'gay_men',
      'lesbian_women',
      'everyone'
    )
  ),
  created_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 15),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_.]+$')
);

create unique index if not exists profiles_username_idx on profiles (lower(username));

-- ---------------------------------------------------------------------------
-- Link anonymous session UUID (stranger chat) to signed-in profile
-- ---------------------------------------------------------------------------
create table if not exists room_session_links (
  session_user_id uuid primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  linked_at timestamptz not null default now()
);

create index if not exists room_session_links_profile_idx on room_session_links (profile_id);

-- ---------------------------------------------------------------------------
-- Mutual "Connect" clicks in a live stranger room
-- ---------------------------------------------------------------------------
create table if not exists room_connect_clicks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, profile_id)
);

create index if not exists room_connect_clicks_room_idx on room_connect_clicks (room_id);

alter table room_connect_clicks replica identity full;

-- ---------------------------------------------------------------------------
-- Friendships (mutual connect)
-- ---------------------------------------------------------------------------
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (user_id <> friend_id),
  constraint friendships_status_check check (status in ('pending', 'accepted')),
  unique (user_id, friend_id)
);

create index if not exists friendships_user_idx on friendships (user_id);
create index if not exists friendships_friend_idx on friendships (friend_id);

-- ---------------------------------------------------------------------------
-- Private messages between friends
-- ---------------------------------------------------------------------------
create table if not exists private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint private_messages_no_self check (sender_id <> receiver_id)
);

create index if not exists private_messages_pair_idx
  on private_messages (sender_id, receiver_id, created_at);
create index if not exists private_messages_receiver_idx
  on private_messages (receiver_id, created_at);

alter table private_messages replica identity full;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table friendships enable row level security;
alter table private_messages enable row level security;
alter table room_session_links enable row level security;
alter table room_connect_clicks enable row level security;

drop policy if exists "Profiles are viewable by everyone" on profiles;
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

drop policy if exists "Users see own friendships" on friendships;
create policy "Users see own friendships"
  on friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Users read own private messages" on private_messages;
create policy "Users read own private messages"
  on private_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users send private messages" on private_messages;
create policy "Users send private messages"
  on private_messages for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Users manage own session links" on room_session_links;
create policy "Users manage own session links"
  on room_session_links for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "Users manage own connect clicks" on room_connect_clicks;
create policy "Users manage own connect clicks"
  on room_connect_clicks for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "Users see connect clicks in their rooms" on room_connect_clicks;
create policy "Users see connect clicks in their rooms"
  on room_connect_clicks for select
  using (
    exists (
      select 1 from room_session_links rsl
      join chat_rooms cr on cr.id = room_connect_clicks.room_id
      where rsl.profile_id = auth.uid()
        and (cr.user1_id = rsl.session_user_id or cr.user2_id = rsl.session_user_id)
    )
    or auth.uid() = profile_id
  );

grant all on table profiles to service_role;
grant all on table friendships to service_role;
grant all on table private_messages to service_role;
grant all on table room_session_links to service_role;
grant all on table room_connect_clicks to service_role;

grant select on table profiles to anon, authenticated;
grant select, insert, update on table profiles to authenticated;
grant select on table friendships to authenticated;
grant select, insert on table private_messages to authenticated;
grant all on table room_session_links to authenticated;
grant select, insert on table room_connect_clicks to authenticated;

-- Realtime
do $$
begin
  alter publication supabase_realtime add table private_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table room_connect_clicks;
exception when duplicate_object then null;
end $$;
