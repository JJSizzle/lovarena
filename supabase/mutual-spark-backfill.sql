-- One-time backfill: pairs who both tapped Connect in chat before auto-friendship shipped.
-- Safe to re-run (idempotent upsert).

with sparked_rooms as (
  select room_id
  from room_connect_clicks
  group by room_id
  having count(distinct profile_id) >= 2
),
spark_pairs as (
  select cr.user1_id as user_id, cr.user2_id as friend_id
  from sparked_rooms sr
  join chat_rooms cr on cr.id = sr.room_id
  where cr.user2_id is not null
  union
  select cr.user2_id, cr.user1_id
  from sparked_rooms sr
  join chat_rooms cr on cr.id = sr.room_id
  where cr.user2_id is not null
)
insert into friendships (user_id, friend_id, status, connection_type)
select sp.user_id, sp.friend_id, 'accepted', 'mutual_connect'
from spark_pairs sp
where sp.user_id <> sp.friend_id
on conflict (user_id, friend_id) do update
set status = 'accepted', connection_type = 'mutual_connect';
