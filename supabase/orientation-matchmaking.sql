alter table profiles
  add column if not exists gender_identity text,
  add column if not exists looking_for text;

alter table profiles drop constraint if exists profiles_gender_identity_check;
alter table profiles add constraint profiles_gender_identity_check
  check (gender_identity is null or gender_identity in ('male', 'female', 'non_binary'));

alter table profiles drop constraint if exists profiles_looking_for_check;
alter table profiles add constraint profiles_looking_for_check
  check (
    looking_for is null
    or looking_for in (
      'straight_men',
      'straight_women',
      'gay_men',
      'lesbian_women',
      'everyone'
    )
  );

create or replace function orientation_partner_matches(
  p_seeker_looking_for text,
  p_partner_gender text,
  p_partner_looking_for text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_seeker_looking_for = 'everyone' then true
    when p_seeker_looking_for = 'straight_men' then
      p_partner_gender = 'male' and p_partner_looking_for = 'straight_women'
    when p_seeker_looking_for = 'straight_women' then
      p_partner_gender = 'female' and p_partner_looking_for = 'straight_men'
    when p_seeker_looking_for = 'gay_men' then
      p_partner_gender = 'male' and p_partner_looking_for = 'gay_men'
    when p_seeker_looking_for = 'lesbian_women' then
      p_partner_gender = 'female' and p_partner_looking_for = 'lesbian_women'
    else false
  end;
$$;

create or replace function orientation_mutual_match(
  a_looking_for text,
  a_gender text,
  b_looking_for text,
  b_gender text
)
returns boolean
language sql
immutable
as $$
  select
    orientation_partner_matches(a_looking_for, b_gender, b_looking_for)
    and orientation_partner_matches(b_looking_for, a_gender, a_looking_for);
$$;

drop function if exists find_or_create_match(uuid);
drop function if exists find_or_create_match(uuid, text, text);

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
  v_seeker_gender text;
  v_seeker_looking_for text;
begin
  v_mode := case when p_match_mode = 'regional' then 'regional' else 'worldwide' end;

  select gender_identity, looking_for
  into v_seeker_gender, v_seeker_looking_for
  from profiles
  where id = p_user_id;

  if v_seeker_gender is null or v_seeker_looking_for is null then
    raise exception 'Profile orientation must be set before matchmaking';
  end if;

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
    select w.user_id into v_partner_id
    from waiting_users w
    inner join profiles p on p.id = w.user_id
    where w.user_id <> p_user_id
      and w.match_mode = 'regional'
      and w.country_code = p_country_code
      and p.gender_identity is not null
      and p.looking_for is not null
      and orientation_mutual_match(
        v_seeker_looking_for,
        v_seeker_gender,
        p.looking_for,
        p.gender_identity
      )
    order by w.created_at asc
    limit 1
    for update of w skip locked;
  else
    select w.user_id into v_partner_id
    from waiting_users w
    inner join profiles p on p.id = w.user_id
    where w.user_id <> p_user_id
      and w.match_mode = 'worldwide'
      and p.gender_identity is not null
      and p.looking_for is not null
      and orientation_mutual_match(
        v_seeker_looking_for,
        v_seeker_gender,
        p.looking_for,
        p.gender_identity
      )
    order by w.created_at asc
    limit 1
    for update of w skip locked;
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

alter function find_or_create_match(uuid, text, text) security definer;
alter function find_or_create_match(uuid, text, text) set search_path = public;
