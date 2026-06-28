-- Lock down stranger chat messages for production scale.
-- Run in Supabase SQL Editor after fix-realtime-messages.sql (replaces open read policy).

create or replace function public.is_chat_room_member(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from chat_rooms r
    where r.id = p_room_id
      and (r.user1_id = p_user_id or r.user2_id = p_user_id)
  );
$$;

revoke all on function public.is_chat_room_member(uuid, uuid) from public;
grant execute on function public.is_chat_room_member(uuid, uuid) to authenticated;

alter table messages enable row level security;

drop policy if exists "Anyone can read messages" on messages;
drop policy if exists "Room members read messages" on messages;

create policy "Room members read messages"
  on messages for select
  to authenticated
  using (public.is_chat_room_member(room_id, auth.uid()));

revoke select on table messages from anon;
revoke insert, update, delete on table messages from anon, authenticated;
grant select on table messages to authenticated;

alter table messages replica identity full;
