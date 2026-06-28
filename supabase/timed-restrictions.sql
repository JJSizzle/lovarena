-- Timed 24h restrictions + auto-review support
-- Run in Supabase SQL Editor

alter table flagged_users
  add column if not exists restricted_until timestamptz,
  add column if not exists review_status text not null default 'pending',
  add column if not exists auto_reviewed_at timestamptz,
  add column if not exists is_permanent_ban boolean not null default false;

alter table flagged_users drop constraint if exists flagged_users_review_status_check;
alter table flagged_users add constraint flagged_users_review_status_check check (
  review_status in ('pending', 'upheld', 'dismissed', 'banned', 'expired')
);

create table if not exists moderation_strikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists moderation_strikes_user_idx
  on moderation_strikes (user_id, created_at desc);

-- Migrate existing permanent-style flags
update flagged_users
set
  is_permanent_ban = true,
  review_status = 'banned',
  restricted_until = null
where flagged_for_abuse = true
  and (
    reason like 'admin_ban%'
    or reason like 'second_strike%'
  );

-- Give active non-permanent flags a 24h window from flagged_at
update flagged_users
set
  restricted_until = flagged_at + interval '24 hours',
  is_permanent_ban = false,
  review_status = case
    when review_status = 'banned' then review_status
    else 'pending'
  end
where flagged_for_abuse = true
  and is_permanent_ban = false
  and restricted_until is null;

-- Clear already-expired timed restrictions
update flagged_users
set
  flagged_for_abuse = false,
  review_status = 'expired'
where flagged_for_abuse = true
  and is_permanent_ban = false
  and restricted_until is not null
  and restricted_until <= now();

create or replace function is_user_currently_restricted(p_user_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from flagged_users fu
    where fu.user_id = p_user_id
      and fu.flagged_for_abuse = true
      and (
        fu.is_permanent_ban
        or (fu.restricted_until is not null and fu.restricted_until > now())
      )
  );
$$;

-- Patch matchmaking to respect timed restrictions (replaces find_or_create_match)
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
