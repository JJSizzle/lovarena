-- Translation preferences (run after platform-features.sql)
alter table profiles
  add column if not exists primary_language text not null default 'English',
  add column if not exists auto_translate boolean not null default false;
