-- Server-side DM read cursors, read-receipt prefs, and web push subscriptions.

alter table profiles
  add column if not exists read_receipts_enabled boolean not null default true;

alter table profiles
  add column if not exists web_push_enabled boolean not null default true;

create table if not exists dm_read_cursors (
  user_id uuid not null references profiles (id) on delete cascade,
  peer_id uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, peer_id),
  constraint dm_read_cursors_no_self check (user_id <> peer_id)
);

create index if not exists dm_read_cursors_peer_idx
  on dm_read_cursors (peer_id, user_id);

alter table dm_read_cursors replica identity full;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on push_subscriptions (user_id);

alter table dm_read_cursors enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists "Users manage own dm read cursors" on dm_read_cursors;
create policy "Users manage own dm read cursors"
  on dm_read_cursors for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users view dm read cursors in thread" on dm_read_cursors;
create policy "Users view dm read cursors in thread"
  on dm_read_cursors for select
  using (auth.uid() = user_id or auth.uid() = peer_id);

grant select, insert, update on table dm_read_cursors to authenticated;
grant all on table dm_read_cursors to service_role;

grant all on table push_subscriptions to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'dm_read_cursors'
  ) then
    alter publication supabase_realtime add table dm_read_cursors;
  end if;
end $$;
