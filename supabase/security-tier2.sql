-- Security tier 2: admin audit trail + new-account match captcha grants
-- Run once in Supabase SQL Editor after security-and-legal.sql

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  action text not null,
  target_user_id uuid references profiles(id) on delete set null,
  report_id uuid references abuse_reports(id) on delete set null,
  appeal_id uuid references restriction_appeals(id) on delete set null,
  details jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on admin_audit_log (created_at desc);

create index if not exists admin_audit_log_admin_id_idx
  on admin_audit_log (admin_id, created_at desc);

create table if not exists match_captcha_grants (
  profile_id uuid primary key references profiles(id) on delete cascade,
  verified_at timestamptz not null default now()
);

alter table admin_audit_log enable row level security;
alter table match_captcha_grants enable row level security;
