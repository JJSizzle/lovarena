-- Lovarena production security bundle (idempotent)
-- Run once in Supabase → SQL Editor on production.

-- ---------------------------------------------------------------------------
-- 1) Stranger chat messages: room members only (replaces public read)
-- ---------------------------------------------------------------------------
create or replace function public.is_chat_room_member(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from chat_rooms r
    where r.id = p_room_id
      and (r.user1_id = p_user_id or r.user2_id = p_user_id)
  );
$$;

revoke all on function public.is_chat_room_member(uuid, uuid) from public;
grant execute on function public.is_chat_room_member(uuid, uuid) to authenticated;

alter table messages enable row level security;

drop policy if exists "Anyone can read messages" on messages;
drop policy if exists "Room members read messages" on messages;

create policy "Room members read messages"
  on messages for select
  to authenticated
  using (public.is_chat_room_member(room_id, auth.uid()));

revoke select on table messages from anon;
revoke insert, update, delete on table messages from anon, authenticated;
grant select on table messages to authenticated;

alter table messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Rate limiting (skip if security-and-legal.sql already ran)
-- ---------------------------------------------------------------------------
create table if not exists rate_limit_buckets (
  bucket_key text primary key,
  hit_count int not null default 0,
  window_start timestamptz not null default now()
);

create or replace function check_rate_limit(
  p_bucket_key text,
  p_max_hits int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_start timestamptz;
  v_now timestamptz := now();
begin
  select hit_count, window_start
  into v_count, v_start
  from rate_limit_buckets
  where bucket_key = p_bucket_key
  for update;

  if not found then
    insert into rate_limit_buckets (bucket_key, hit_count, window_start)
    values (p_bucket_key, 1, v_now);
    return true;
  end if;

  if v_start + (p_window_seconds || ' seconds')::interval < v_now then
    update rate_limit_buckets
    set hit_count = 1, window_start = v_now
    where bucket_key = p_bucket_key;
    return true;
  end if;

  if v_count >= p_max_hits then
    return false;
  end if;

  update rate_limit_buckets
  set hit_count = hit_count + 1
  where bucket_key = p_bucket_key;

  return true;
end;
$$;

alter table rate_limit_buckets disable row level security;
grant all on table rate_limit_buckets to service_role;
grant execute on function check_rate_limit(text, int, int) to service_role;
