-- Run this entire script in Supabase SQL Editor (one result table, 10 rows)

select migration, status from (
  select 1 as ord, 'reputation-scale' as migration,
    case
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'apply_positive_rating'
      ) then '❌ function missing — run reputation-scale.sql'
      when exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'apply_positive_rating'
          and pg_get_functiondef(p.oid) like '%least(500, reputation_score + 2)%'
      ) then '✅ applied'
      else '❌ old version (cap 100?) — run reputation-scale.sql'
    end as status

  union all

  select 2, 'report-reasons',
    case
      when not exists (
        select 1 from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        where t.relname = 'abuse_reports' and c.conname = 'abuse_reports_reason_check'
      ) then '❌ constraint missing — run report-reasons.sql'
      when exists (
        select 1 from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        where t.relname = 'abuse_reports' and c.conname = 'abuse_reports_reason_check'
          and pg_get_constraintdef(c.oid) like '%sexual_harassment%'
      ) then '✅ applied'
      else '❌ old reasons only — run report-reasons.sql'
    end

  union all

  select 3, 'timed-restrictions',
    case
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'flagged_users'
          and column_name = 'restricted_until'
      ) then '❌ columns missing — run timed-restrictions.sql'
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'moderation_strikes'
      ) then '❌ moderation_strikes missing — run timed-restrictions.sql'
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'is_user_currently_restricted'
      ) then '❌ function missing — run timed-restrictions.sql'
      else '✅ applied'
    end

  union all

  select 4, 'avatar-upload-moderation',
    case
      when exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname = 'Users can upload own avatar'
      ) then '❌ client upload still allowed — run avatar-upload-moderation.sql'
      else '✅ applied'
    end

  union all

  select 5, 'friend-connection-type',
    case
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'friendships'
          and column_name = 'connection_type'
      ) then '❌ column missing — run friend-connection-type.sql'
      else '✅ applied'
    end

  union all

  select 6, 'restriction-appeals',
    case
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'restriction_appeals'
      ) then '❌ table missing — run restriction-appeals.sql'
      else '✅ applied'
    end

  union all

  select 7, 'prefer-shared-interests',
    case
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'waiting_users'
          and column_name = 'prefer_shared_interests'
      ) then '❌ column missing — run prefer-shared-interests.sql'
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'find_or_create_match'
          and pg_get_function_identity_arguments(p.oid) like '%boolean%'
      ) then '❌ match fn missing 4th arg — run prefer-shared-interests.sql'
      else '✅ applied'
    end

  union all

  select 8, 'social-privacy-prefs',
    case
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles'
          and column_name = 'allow_friend_requests'
      ) then '❌ columns missing — run social-privacy-prefs.sql'
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles'
          and column_name = 'allow_mutual_spark'
      ) then '❌ allow_mutual_spark missing — run social-privacy-prefs.sql'
      else '✅ applied'
    end

  union all

  select 9, 'regional-state-match',
    case
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'waiting_users'
          and column_name = 'state_code'
      ) then '❌ state_code missing — run regional-state-match.sql'
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'find_or_create_match'
          and pg_get_function_identity_arguments(p.oid) like '%text%'
          and pg_get_function_identity_arguments(p.oid) like '%boolean%'
          and pg_get_function_identity_arguments(p.oid) like '%text%'
      ) then '❌ match fn missing state arg — run regional-state-match.sql'
      else '✅ applied'
    end

  union all

  select 10, 'profile-location',
    case
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles'
          and column_name = 'country_code'
      ) then '❌ country_code missing — run profile-location.sql'
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles'
          and column_name = 'state_code'
      ) then '❌ state_code missing — run profile-location.sql'
      else '✅ applied'
    end
) checks
order by ord;
