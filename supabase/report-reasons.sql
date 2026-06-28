-- Expand abuse report reason options (run in Supabase SQL Editor)

alter table abuse_reports drop constraint if exists abuse_reports_reason_check;

alter table abuse_reports add constraint abuse_reports_reason_check check (
  reason in (
    'harassment',
    'sexual_harassment',
    'hate_speech',
    'nudity',
    'inappropriate_profile',
    'violence_threats',
    'spam',
    'scam',
    'underage',
    'other'
  )
);
