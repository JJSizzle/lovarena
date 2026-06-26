-- Run this in Supabase: SQL Editor → New query → Run

create table waiting_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  match_mode text not null default 'worldwide',
  country_code text,
  created_at timestamptz default now()
);

create table chat_rooms (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null,
  user2_id uuid not null,
  status text not null default 'active',
  match_mode text default 'worldwide',
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz default now()
);

create index messages_room_id_idx on messages(room_id);

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

alter table messages enable row level security;
alter table waiting_users disable row level security;
alter table chat_rooms disable row level security;

grant all on table waiting_users to service_role;
grant all on table chat_rooms to service_role;
grant all on table messages to service_role;

create policy "Anyone can read messages"
  on messages for select
  using (true);

alter publication supabase_realtime add table messages;
