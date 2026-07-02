-- Run this entire script in Supabase SQL Editor (one result table, 27 rows)

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
          and pg_get_functiondef(p.oid) like '%least(500, reputation_score + 3)%'
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

  union all

  select 11, 'party-rooms',
    case
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'party_rooms'
      ) then '❌ party_rooms missing — run party-rooms.sql'
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'party_members'
      ) then '❌ party_members missing — run party-rooms.sql'
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'party_votes'
      ) then '❌ party_votes missing — run party-rooms.sql'
      else '✅ applied'
    end

  union all

  select 12, 'party-permissions',
    case
      when not has_table_privilege('service_role', 'public.party_rooms', 'INSERT') then
        '❌ service_role grants missing — run party-permissions.sql'
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'is_party_member'
      ) then '❌ is_party_member missing — run party-permissions.sql'
      when not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'party_rooms'
          and policyname = 'Party members read party_rooms'
      ) then '❌ RLS policies missing — run party-permissions.sql'
      else '✅ applied'
    end

  union all

  select 13, 'party-trivia-timer',
    case
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'party_rooms'
          and column_name = 'voting_deadline_at'
      ) then '❌ voting_deadline_at missing — run party-trivia-timer.sql'
      else '✅ applied'
    end

  union all

  select 14, 'party-trivia-scores',
    case
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'party_trivia_scores'
      ) then '❌ party_trivia_scores missing — run party-trivia-scores.sql'
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'party_rooms'
          and column_name = 'last_scored_round'
      ) then '❌ last_scored_round missing — run party-trivia-scores.sql'
      else '✅ applied'
    end

  union all

  select 15, 'party-hangout-mode',
    case
      when not exists (
        select 1 from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = 'party_rooms'
          and c.conname = 'party_rooms_game_mode_check'
          and pg_get_constraintdef(c.oid) like '%hangout%'
      ) then '❌ hangout game_mode missing — run party-hangout-mode.sql'
      else '✅ applied'
    end

  union all

  select 16, 'friendships-realtime',
    case
      when not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and tablename = 'friendships'
      ) then '❌ friendships realtime missing — run friendships-realtime.sql'
      else '✅ applied'
    end

  union all

  select 17, 'prefer-shared-languages',
    case
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'waiting_users'
          and column_name = 'prefer_shared_languages'
      ) then '❌ prefer_shared_languages missing — run prefer-shared-languages.sql'
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'find_or_create_match'
          and pg_get_function_identity_arguments(p.oid) like '%prefer_shared_languages%'
      ) then '❌ find_or_create_match language param missing — run prefer-shared-languages.sql'
      else '✅ applied'
    end

  union all

  select 18, 'dm-read-state',
    case
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'dm_read_cursors'
      ) then '❌ dm_read_cursors missing — run dm-read-state.sql'
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'push_subscriptions'
      ) then '❌ push_subscriptions missing — run dm-read-state.sql'
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name = 'read_receipts_enabled'
      ) then '❌ read_receipts_enabled missing — run dm-read-state.sql'
      else '✅ applied'
    end

  union all

  select 19, 'security-tier2-admin-audit',
    case
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'admin_audit_log'
      ) then '❌ admin_audit_log missing — run security-tier2.sql'
      else '✅ applied'
    end

  union all

  select 20, 'security-tier2-match-captcha',
    case
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'match_captcha_grants'
      ) then '❌ match_captcha_grants missing — run security-tier2.sql'
      else '✅ applied'
    end

  union all

  select 21, 'party-read-cursors',
    case
      when not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'party_read_cursors'
      ) then '❌ party_read_cursors missing — run party-read-cursors.sql'
      else '✅ applied'
    end

  union all

  select 22, 'party-host-unlock',
    case
      when not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name = 'party_host_unlocked'
      ) then '❌ party_host_unlocked missing — run party-host-unlock.sql'
      else '✅ applied'
    end

  union all

  select 23, 'thumbs-up-rep-bump',
    case
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'apply_positive_rating'
          and pg_get_functiondef(p.oid) like '%reputation_score + 3%'
      ) then '❌ still +2 — run thumbs-up-rep-bump.sql'
      else '✅ applied'
    end

  union all

  select 24, 'atomic-integrity',
    case
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'join_party_if_not_full'
      ) then '❌ join_party_if_not_full missing — run atomic-integrity.sql'
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'subtract_reputation'
      ) then '❌ subtract_reputation missing — run atomic-integrity.sql'
      else '✅ applied'
    end

  union all

  select 25, 'referral-referrer-bonus',
    case
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'apply_referral_referrer_bonus'
      ) then '❌ apply_referral_referrer_bonus missing — run referral-referrer-bonus.sql'
      else '✅ applied'
    end

  union all

  select 26, 'dm-unread-threads',
    case
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'latest_dm_by_sender'
      ) then '❌ latest_dm_by_sender missing — run dm-unread-threads.sql'
      else '✅ applied'
    end

  union all

  select 27, 'friend-cap-enforce',
    case
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'accept_friendship_if_under_cap'
      ) then '❌ accept_friendship_if_under_cap missing — run friend-cap-enforce.sql'
      when not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'count_accepted_friends'
      ) then '❌ count_accepted_friends missing — run friend-cap-enforce.sql'
      else '✅ applied'
    end
) checks
order by ord;
