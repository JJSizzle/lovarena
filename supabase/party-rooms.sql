-- Friends-only party rooms (2–4 players): prompt cards + trivia

create table if not exists party_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id) on delete cascade,
  invite_code text not null unique,
  status text not null default 'lobby'
    check (status in ('lobby', 'playing', 'ended')),
  game_mode text not null default 'prompts'
    check (game_mode in ('prompts', 'trivia')),
  max_players int not null default 4
    check (max_players between 2 and 4),
  round_index int not null default 0,
  phase text not null default 'waiting'
    check (phase in ('waiting', 'voting', 'reveal', 'discussion')),
  current_prompt text,
  current_options jsonb,
  correct_option_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists party_rooms_invite_code_idx on party_rooms (invite_code);
create index if not exists party_rooms_host_idx on party_rooms (host_id);

create table if not exists party_members (
  party_id uuid not null references party_rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('host', 'member')),
  joined_at timestamptz not null default now(),
  primary key (party_id, profile_id)
);

create index if not exists party_members_profile_idx on party_members (profile_id);

create table if not exists party_votes (
  party_id uuid not null references party_rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  round_index int not null,
  option_id text not null,
  created_at timestamptz not null default now(),
  primary key (party_id, profile_id, round_index)
);

create table if not exists party_messages (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party_rooms(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists party_messages_party_idx
  on party_messages (party_id, created_at desc);

alter table party_rooms replica identity full;
alter table party_members replica identity full;
alter table party_votes replica identity full;
alter table party_messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'party_rooms'
  ) then
    alter publication supabase_realtime add table party_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'party_members'
  ) then
    alter publication supabase_realtime add table party_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'party_votes'
  ) then
    alter publication supabase_realtime add table party_votes;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'party_messages'
  ) then
    alter publication supabase_realtime add table party_messages;
  end if;
end $$;

-- Permissions (API uses service_role; Realtime uses member SELECT policies)
create or replace function public.is_party_member(p_party_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from party_members
    where party_id = p_party_id
      and profile_id = p_user_id
  );
$$;

revoke all on function public.is_party_member(uuid, uuid) from public;
grant execute on function public.is_party_member(uuid, uuid) to authenticated;

grant all on table party_rooms to service_role;
grant all on table party_members to service_role;
grant all on table party_votes to service_role;
grant all on table party_messages to service_role;

alter table party_rooms enable row level security;
alter table party_members enable row level security;
alter table party_votes enable row level security;
alter table party_messages enable row level security;

drop policy if exists "Party members read party_rooms" on party_rooms;
drop policy if exists "Party members read party_members" on party_members;
drop policy if exists "Party members read party_votes" on party_votes;
drop policy if exists "Party members read party_messages" on party_messages;

create policy "Party members read party_rooms"
  on party_rooms for select
  to authenticated
  using (public.is_party_member(id, auth.uid()));

create policy "Party members read party_members"
  on party_members for select
  to authenticated
  using (public.is_party_member(party_id, auth.uid()));

create policy "Party members read party_votes"
  on party_votes for select
  to authenticated
  using (public.is_party_member(party_id, auth.uid()));

create policy "Party members read party_messages"
  on party_messages for select
  to authenticated
  using (public.is_party_member(party_id, auth.uid()));

grant select on table party_rooms to authenticated;
grant select on table party_members to authenticated;
grant select on table party_votes to authenticated;
grant select on table party_messages to authenticated;
