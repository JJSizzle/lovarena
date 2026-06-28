-- Avatar uploads must go through /api/avatar/upload (moderated server-side).
-- Run in Supabase SQL Editor after profile-age-avatars.sql.

drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
