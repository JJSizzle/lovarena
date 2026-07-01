-- Atomic helpers for party join and reputation updates (run in Supabase SQL Editor)

create or replace function public.subtract_reputation(p_user_id uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new int;
begin
  update profiles
  set reputation_score = greatest(0, least(500, reputation_score - p_amount))
  where id = p_user_id
  returning reputation_score into v_new;

  return v_new;
end;
$$;

create or replace function public.join_party_if_not_full(p_party_id uuid, p_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_status text;
  v_count int;
begin
  perform pg_advisory_xact_lock(hashtext(p_party_id::text));

  if exists (
    select 1
    from party_members
    where party_id = p_party_id and profile_id = p_profile_id
  ) then
    return 'ok';
  end if;

  select max_players, status
  into v_max, v_status
  from party_rooms
  where id = p_party_id;

  if not found then
    return 'not_found';
  end if;

  if v_status = 'ended' then
    return 'ended';
  end if;

  select count(*)::int into v_count
  from party_members
  where party_id = p_party_id;

  if v_count >= v_max then
    return 'full';
  end if;

  insert into party_members (party_id, profile_id, role)
  values (p_party_id, p_profile_id, 'member');

  return 'ok';
exception
  when unique_violation then
    return 'ok';
end;
$$;

grant execute on function public.subtract_reputation(uuid, int) to service_role;
grant execute on function public.join_party_if_not_full(uuid, uuid) to service_role;
