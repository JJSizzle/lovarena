-- Latest DM per sender for accurate unread counts (run in Supabase SQL Editor)

create or replace function public.latest_dm_by_sender(p_receiver_id uuid)
returns table (
  id uuid,
  sender_id uuid,
  content text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (sender_id) id, sender_id, content, created_at
  from private_messages
  where receiver_id = p_receiver_id
  order by sender_id, created_at desc;
$$;

grant execute on function public.latest_dm_by_sender(uuid) to service_role;
