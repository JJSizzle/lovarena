-- Optional "prefer shared interests" matchmaking toggle

alter table waiting_users
  add column if not exists prefer_shared_interests boolean not null default false;

drop function if exists find_or_create_match(uuid, text, text);
drop function if exists find_or_create_match(uuid, text, text, boolean);

create or replace function find_or_create_match(
  p_user_id uuid,
  p_match_mode text default 'worldwide',
  p_country_code text default null,
  p_prefer_shared_interests boolean default false
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
  v_seeker_interests text[];
begin
  v_mode := case when p_match_mode = 'regional' then 'regional' else 'worldwide' end;

  select gender_identity, looking_for, interests
  into v_seeker_gender, v_seeker_looking_for, v_seeker_interests
  from profiles
  where id = p_user_id;

  if v_seeker_gender is null or v_seeker_looking_for is null then
    raise exception 'Profile orientation must be set before matchmaking';
  end if;

  if is_user_currently_restricted(p_user_id) then
    raise exception 'Account restricted';
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
      and not users_are_blocked(p_user_id, w.user_id)
      and not is_user_currently_restricted(w.user_id)
      and orientation_mutual_match(
        v_seeker_looking_for,
        v_seeker_gender,
        p.looking_for,
        p.gender_identity
      )
      and (
        not p_prefer_shared_interests
        or interest_overlap_score(v_seeker_interests, p.interests) >= 1
      )
      and (
        not w.prefer_shared_interests
        or interest_overlap_score(p.interests, v_seeker_interests) >= 1
      )
    order by interest_overlap_score(v_seeker_interests, p.interests) desc, w.created_at asc
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
      and not users_are_blocked(p_user_id, w.user_id)
      and not is_user_currently_restricted(w.user_id)
      and orientation_mutual_match(
        v_seeker_looking_for,
        v_seeker_gender,
        p.looking_for,
        p.gender_identity
      )
      and (
        not p_prefer_shared_interests
        or interest_overlap_score(v_seeker_interests, p.interests) >= 1
      )
      and (
        not w.prefer_shared_interests
        or interest_overlap_score(p.interests, v_seeker_interests) >= 1
      )
    order by interest_overlap_score(v_seeker_interests, p.interests) desc, w.created_at asc
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

    perform record_match_pair(v_room_id, p_user_id, v_partner_id);

    return v_room_id;
  else
    insert into waiting_users (user_id, match_mode, country_code, prefer_shared_interests)
    values (
      p_user_id,
      v_mode,
      case when v_mode = 'regional' then p_country_code else null end,
      coalesce(p_prefer_shared_interests, false)
    )
    on conflict (user_id) do update set
      match_mode = excluded.match_mode,
      country_code = excluded.country_code,
      prefer_shared_interests = excluded.prefer_shared_interests,
      created_at = now();

    return null;
  end if;
end;
$$;

alter function find_or_create_match(uuid, text, text, boolean) security definer;
alter function find_or_create_match(uuid, text, text, boolean) set search_path = public;
