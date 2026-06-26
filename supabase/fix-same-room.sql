-- Fix: both tabs must land in the SAME room (messages were saving but tabs were split)
-- Run in Supabase SQL Editor

create or replace function find_or_create_match(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_room_id uuid;
begin
  -- If user is already in an active room, return it (partner matched them first)
  select id into v_room_id
  from chat_rooms
  where status = 'active'
    and (user1_id = p_user_id or user2_id = p_user_id)
  order by created_at desc
  limit 1;

  if v_room_id is not null then
    delete from waiting_users where user_id = p_user_id;
    return v_room_id;
  end if;

  delete from waiting_users where user_id = p_user_id;

  select user_id into v_partner_id
  from waiting_users
  where user_id <> p_user_id
  order by created_at asc
  limit 1
  for update skip locked;

  if v_partner_id is not null then
    select id into v_room_id
    from chat_rooms
    where status = 'active'
      and (
        (user1_id = p_user_id and user2_id = v_partner_id)
        or (user1_id = v_partner_id and user2_id = p_user_id)
      )
    limit 1;

    if v_room_id is not null then
      delete from waiting_users where user_id in (p_user_id, v_partner_id);
      return v_room_id;
    end if;

    delete from waiting_users where user_id in (p_user_id, v_partner_id);

    insert into chat_rooms (user1_id, user2_id)
    values (p_user_id, v_partner_id)
    returning id into v_room_id;

    return v_room_id;
  else
    insert into waiting_users (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;

    return null;
  end if;
end;
$$;

-- End duplicate active rooms (optional cleanup)
update chat_rooms
set status = 'ended'
where status = 'active'
  and id not in (
    select distinct on (least(user1_id, user2_id), greatest(user1_id, user2_id))
      id
    from chat_rooms
    where status = 'active'
    order by least(user1_id, user2_id), greatest(user1_id, user2_id), created_at desc
  );
