-- Run ONLY if you got "relation already exists" on the full schema.
-- Safe to re-run: updates functions without recreating tables.

create or replace function find_or_create_match(p_user_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_partner_id uuid;
  v_room_id uuid;
begin
  select user_id into v_partner_id
  from waiting_users
  where user_id <> p_user_id
  order by created_at asc
  limit 1
  for update skip locked;

  if v_partner_id is not null then
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

create or replace function leave_chat(p_user_id uuid, p_room_id uuid)
returns void
language plpgsql
as $$
begin
  delete from waiting_users where user_id = p_user_id;

  update chat_rooms
  set status = 'ended'
  where id = p_room_id
    and status = 'active'
    and (user1_id = p_user_id or user2_id = p_user_id);
end;
$$;

-- Ignore error if realtime is already enabled for messages:
-- alter publication supabase_realtime add table messages;
