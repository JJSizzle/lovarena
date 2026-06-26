-- Run this ENTIRE file in Supabase SQL Editor if you see:
-- "function find_or_create_match(uuid) does not exist"
-- or matching fails after schema changes

drop function if exists find_or_create_match(uuid);
drop function if exists find_or_create_match(uuid, text, text);

alter table waiting_users
  add column if not exists match_mode text not null default 'worldwide';

alter table waiting_users
  add column if not exists country_code text;

alter table chat_rooms
  add column if not exists match_mode text default 'worldwide';

create or replace function find_or_create_match(
  p_user_id uuid,
  p_match_mode text default 'worldwide',
  p_country_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_room_id uuid;
  v_mode text;
begin
  v_mode := case when p_match_mode = 'regional' then 'regional' else 'worldwide' end;

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

  if v_mode = 'regional' then
    select user_id into v_partner_id
    from waiting_users
    where user_id <> p_user_id
      and match_mode = 'regional'
      and country_code = p_country_code
    order by created_at asc
    limit 1
    for update skip locked;
  else
    select user_id into v_partner_id
    from waiting_users
    where user_id <> p_user_id
      and match_mode = 'worldwide'
    order by created_at asc
    limit 1
    for update skip locked;
  end if;

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

    insert into chat_rooms (user1_id, user2_id, match_mode)
    values (p_user_id, v_partner_id, v_mode)
    returning id into v_room_id;

    return v_room_id;
  else
    insert into waiting_users (user_id, match_mode, country_code)
    values (
      p_user_id,
      v_mode,
      case when v_mode = 'regional' then p_country_code else null end
    )
    on conflict (user_id) do update set
      match_mode = excluded.match_mode,
      country_code = excluded.country_code,
      created_at = now();

    return null;
  end if;
end;
$$;

create or replace function leave_chat(p_user_id uuid, p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
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
