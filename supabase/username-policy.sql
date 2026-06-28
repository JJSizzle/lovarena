-- Username policy: 3–15 chars, letters/numbers/underscore/period
-- Run after auth-social.sql on existing projects.

alter table profiles drop constraint if exists profiles_username_length;
alter table profiles add constraint profiles_username_length
  check (char_length(username) between 3 and 15);

alter table profiles drop constraint if exists profiles_username_format;
alter table profiles add constraint profiles_username_format
  check (username ~ '^[a-zA-Z0-9_.]+$');
