-- Persist restriction appeals for admin review

create table if not exists restriction_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  restriction_reason text,
  status text not null default 'open'
    check (status in ('open', 'approved', 'denied')),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists restriction_appeals_status_idx
  on restriction_appeals (status, created_at desc);

create index if not exists restriction_appeals_user_idx
  on restriction_appeals (user_id, created_at desc);

alter table restriction_appeals disable row level security;
grant all on table restriction_appeals to service_role;
