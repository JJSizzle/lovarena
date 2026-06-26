alter table profiles add column if not exists is_admin boolean not null default false;

-- User blocks
create table if not exists user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

create index if not exists user_blocks_blocker_idx on user_blocks (blocker_id);
create index if not exists user_blocks_blocked_idx on user_blocks (blocked_id);

-- Abuse reports
create table if not exists abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_user_id uuid not null references profiles(id) on delete cascade,
  room_id uuid references chat_rooms(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint abuse_reports_reason_check check (
    reason in ('harassment', 'hate_speech', 'nudity', 'spam', 'underage', 'other')
  ),
  constraint abuse_reports_status_check check (
    status in ('open', 'reviewed', 'actioned', 'dismissed')
  )
);

create index if not exists abuse_reports_status_idx on abuse_reports (status, created_at desc);

-- Rate limiting (server-side buckets)
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

alter table user_blocks enable row level security;
alter table abuse_reports enable row level security;
alter table rate_limit_buckets disable row level security;

drop policy if exists "Users manage own blocks" on user_blocks;
create policy "Users manage own blocks"
  on user_blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

drop policy if exists "Users see own blocks" on user_blocks;
create policy "Users see own blocks"
  on user_blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users create reports" on abuse_reports;
create policy "Users create reports"
  on abuse_reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Users see own reports" on abuse_reports;
create policy "Users see own reports"
  on abuse_reports for select
  using (auth.uid() = reporter_id);

grant all on table user_blocks to service_role;
grant all on table abuse_reports to service_role;
grant all on table rate_limit_buckets to service_role;
grant select, insert on table user_blocks to authenticated;
grant insert, select on table abuse_reports to authenticated;
grant execute on function check_rate_limit(text, int, int) to service_role;
