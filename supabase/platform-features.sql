alter table profiles
  add column if not exists bio text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists avatar_url text,
  add column if not exists reputation_score int not null default 100,
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references profiles(id) on delete set null,
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists face_blur_default boolean not null default true;

create unique index if not exists profiles_referral_code_idx
  on profiles (referral_code)
  where referral_code is not null;

alter table profiles drop constraint if exists profiles_bio_length;
alter table profiles add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 280);

create table if not exists user_presence (
  user_id uuid primary key references profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  in_queue boolean not null default false,
  in_chat boolean not null default false
);

create index if not exists user_presence_last_seen_idx on user_presence (last_seen_at desc);

create table if not exists match_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  partner_id uuid not null references profiles(id) on delete cascade,
  room_id uuid references chat_rooms(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists match_history_user_idx on match_history (user_id, created_at desc);

create table if not exists room_video_consent (
  room_id uuid not null references chat_rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  consented_at timestamptz not null default now(),
  primary key (room_id, profile_id)
);

alter table user_presence disable row level security;
alter table match_history disable row level security;
alter table room_video_consent disable row level security;

grant all on table user_presence to service_role;
grant all on table match_history to service_role;
grant all on table room_video_consent to service_role;

create or replace function generate_referral_code()
returns text
language plpgsql
as $$
declare
  v_code text;
  v_taken boolean;
begin
  loop
    v_code := lower(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    select exists(select 1 from profiles where referral_code = v_code) into v_taken;
    exit when not v_taken;
  end loop;
  return v_code;
end;
$$;

update profiles
set referral_code = generate_referral_code()
where referral_code is null;

create or replace function profiles_referral_default()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null then
    new.referral_code := generate_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_referral_default_trg on profiles;
create trigger profiles_referral_default_trg
  before insert on profiles
  for each row execute function profiles_referral_default();

create or replace function users_are_blocked(a uuid, b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function interest_overlap_score(a text[], b text[])
returns int
language sql
immutable
as $$
  select coalesce(
    (
      select count(*)::int
      from unnest(coalesce(a, '{}')) x
      inner join unnest(coalesce(b, '{}')) y on x = y
    ),
    0
  );
$$;

create or replace function record_match_pair(p_room_id uuid, p_user_a uuid, p_user_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into match_history (user_id, partner_id, room_id)
  values (p_user_a, p_user_b, p_room_id), (p_user_b, p_user_a, p_room_id);
end;
$$;

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

  if exists (
    select 1 from flagged_users
    where user_id = p_user_id and flagged_for_abuse = true
  ) then
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
      and not exists (
        select 1 from flagged_users fu
        where fu.user_id = w.user_id and fu.flagged_for_abuse = true
      )
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
      and not exists (
        select 1 from flagged_users fu
        where fu.user_id = w.user_id and fu.flagged_for_abuse = true
      )
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

alter function find_or_create_match(uuid, text, text) security definer;
alter function find_or_create_match(uuid, text, text) set search_path = public;

create or replace function online_user_count(p_window_seconds int default 120)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from user_presence
  where last_seen_at > now() - (p_window_seconds || ' seconds')::interval;
$$;

create or replace function auto_flag_on_reports(p_user_id uuid, p_threshold int default 3)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from abuse_reports
  where reported_user_id = p_user_id
    and created_at > now() - interval '24 hours';

  if v_count >= p_threshold then
    insert into flagged_users (user_id, flagged_for_abuse, reason, flagged_at)
    values (
      p_user_id,
      true,
      'Auto-flagged: multiple reports in 24h',
      now()
    )
    on conflict (user_id) do update set
      flagged_for_abuse = true,
      reason = excluded.reason,
      flagged_at = now();

    update profiles
    set reputation_score = greatest(0, reputation_score - 25)
    where id = p_user_id;
  end if;
end;
$$;
