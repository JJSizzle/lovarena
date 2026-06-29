-- Fix: permission denied for table party_rooms
-- Run in Supabase SQL Editor after party-rooms.sql

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
