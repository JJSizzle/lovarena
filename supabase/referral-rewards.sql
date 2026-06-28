-- Referral reward tracking (run after platform-features.sql)
alter table profiles
  add column if not exists referral_reward_claimed boolean not null default false,
  add column if not exists qualified_referrals int not null default 0,
  add column if not exists first_chat_completed boolean not null default false;
