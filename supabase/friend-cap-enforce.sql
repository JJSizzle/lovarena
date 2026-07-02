-- Atomic friend accept with 200-friend cap (run in Supabase SQL Editor)

create or replace function public.count_accepted_friends(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct case
    when user_id = p_user_id then friend_id
    when friend_id = p_user_id then user_id
  end)::int
  from friendships
  where status = 'accepted'
    and (user_id = p_user_id or friend_id = p_user_id);
$$;

create or replace function public.accept_friendship_if_under_cap(
  p_user_id uuid,
  p_partner_id uuid,
  p_connection_type text default 'request',
  p_max_friends int default 200
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_count int;
  v_partner_count int;
begin
  if p_user_id = p_partner_id then
    return 'invalid';
  end if;

  if p_connection_type not in ('request', 'mutual_connect') then
    return 'invalid';
  end if;

  if exists (
    select 1
    from friendships
    where status = 'accepted'
      and (
        (user_id = p_user_id and friend_id = p_partner_id)
        or (user_id = p_partner_id and friend_id = p_user_id)
      )
  ) then
    return 'already_friends';
  end if;

  perform 1
  from friendships
  where status = 'accepted'
    and (user_id = p_user_id or friend_id = p_user_id)
  for update;

  perform 1
  from friendships
  where status = 'accepted'
    and (user_id = p_partner_id or friend_id = p_partner_id)
  for update;

  v_user_count := count_accepted_friends(p_user_id);
  v_partner_count := count_accepted_friends(p_partner_id);

  if v_user_count >= p_max_friends then
    return 'user_full';
  end if;

  if v_partner_count >= p_max_friends then
    return 'partner_full';
  end if;

  update friendships
  set status = 'accepted', connection_type = p_connection_type
  where user_id = p_partner_id
    and friend_id = p_user_id
    and status = 'pending';

  insert into friendships (user_id, friend_id, status, connection_type)
  values
    (p_user_id, p_partner_id, 'accepted', p_connection_type),
    (p_partner_id, p_user_id, 'accepted', p_connection_type)
  on conflict (user_id, friend_id) do update
    set status = 'accepted', connection_type = excluded.connection_type;

  v_user_count := count_accepted_friends(p_user_id);
  v_partner_count := count_accepted_friends(p_partner_id);

  if v_user_count > p_max_friends or v_partner_count > p_max_friends then
    delete from friendships
    where (user_id = p_user_id and friend_id = p_partner_id)
       or (user_id = p_partner_id and friend_id = p_user_id);
    return case
      when v_user_count > p_max_friends then 'user_full'
      else 'partner_full'
    end;
  end if;

  return 'ok';
end;
$$;

grant execute on function public.count_accepted_friends(uuid) to service_role;
grant execute on function public.accept_friendship_if_under_cap(uuid, uuid, text, int) to service_role;
