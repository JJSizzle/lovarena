-- Optional government ID verification + verified-only match pool (run in Supabase SQL Editor)

alter table profiles
  add column if not exists id_verified boolean not null default false,
  add column if not exists id_verified_at timestamptz,
  add column if not exists id_verification_reward_claimed boolean not null default false,
  add column if not exists persona_inquiry_id text;

alter table waiting_users
  add column if not exists verified_only boolean not null default false;

create or replace function public.apply_id_verification_bonus(p_user_id uuid, p_bonus int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_awarded int := 0;
  v_rows int := 0;
begin
  update profiles
  set
    id_verified = true,
    id_verified_at = coalesce(id_verified_at, now()),
    reputation_score = case
      when id_verification_reward_claimed then reputation_score
      else least(500, reputation_score + p_bonus)
    end,
    id_verification_reward_claimed = true
  where id = p_user_id
    and not id_verified;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    v_awarded := p_bonus;
  end if;

  return v_awarded;
end;
$$;

grant execute on function public.apply_id_verification_bonus(uuid, int) to service_role;

drop function if exists find_or_create_match(uuid, text, text);
drop function if exists find_or_create_match(uuid, text, text, boolean);
drop function if exists find_or_create_match(uuid, text, text, boolean, text);
drop function if exists find_or_create_match(uuid, text, text, boolean, text, boolean);

create or replace function find_or_create_match(
  p_user_id uuid,
  p_match_mode text default 'worldwide',
  p_country_code text default null,
  p_prefer_shared_interests boolean default false,
  p_state_code text default null,
  p_prefer_shared_languages boolean default false,
  p_verified_only boolean default false
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
  v_seeker_languages text[];
  v_seeker_id_verified boolean;
  v_state_code text;
begin
  v_mode := case when p_match_mode = 'regional' then 'regional' else 'worldwide' end;
  v_state_code := nullif(trim(p_state_code), '');

  if v_state_code is not null and (v_mode <> 'regional' or p_country_code is distinct from 'US') then
    v_state_code := null;
  end if;

  select gender_identity, looking_for, interests, languages, id_verified
  into v_seeker_gender, v_seeker_looking_for, v_seeker_interests, v_seeker_languages, v_seeker_id_verified
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
      and (
        (v_state_code is null and w.state_code is null)
        or (v_state_code is not null and w.state_code = v_state_code)
      )
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
      and (
        not p_prefer_shared_languages
        or interest_overlap_score(v_seeker_languages, p.languages) >= 1
      )
      and (
        not w.prefer_shared_languages
        or interest_overlap_score(p.languages, v_seeker_languages) >= 1
      )
      and (
        not p_verified_only
        or p.id_verified = true
      )
      and (
        not w.verified_only
        or v_seeker_id_verified = true
      )
    order by
      interest_overlap_score(v_seeker_languages, p.languages) desc,
      interest_overlap_score(v_seeker_interests, p.interests) desc,
      w.created_at asc
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
      and (
        not p_prefer_shared_languages
        or interest_overlap_score(v_seeker_languages, p.languages) >= 1
      )
      and (
        not w.prefer_shared_languages
        or interest_overlap_score(p.languages, v_seeker_languages) >= 1
      )
      and (
        not p_verified_only
        or p.id_verified = true
      )
      and (
        not w.verified_only
        or v_seeker_id_verified = true
      )
    order by
      interest_overlap_score(v_seeker_languages, p.languages) desc,
      interest_overlap_score(v_seeker_interests, p.interests) desc,
      w.created_at asc
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
    insert into waiting_users (
      user_id,
      match_mode,
      country_code,
      prefer_shared_interests,
      state_code,
      prefer_shared_languages,
      verified_only
    )
    values (
      p_user_id,
      v_mode,
      case when v_mode = 'regional' then p_country_code else null end,
      coalesce(p_prefer_shared_interests, false),
      case when v_mode = 'regional' then v_state_code else null end,
      coalesce(p_prefer_shared_languages, false),
      coalesce(p_verified_only, false)
    )
    on conflict (user_id) do update set
      match_mode = excluded.match_mode,
      country_code = excluded.country_code,
      prefer_shared_interests = excluded.prefer_shared_interests,
      state_code = excluded.state_code,
      prefer_shared_languages = excluded.prefer_shared_languages,
      verified_only = excluded.verified_only,
      created_at = now();

    return null;
  end if;
end;
$$;

alter function find_or_create_match(uuid, text, text, boolean, text, boolean, boolean) security definer;
alter function find_or_create_match(uuid, text, text, boolean, text, boolean, boolean) set search_path = public;
