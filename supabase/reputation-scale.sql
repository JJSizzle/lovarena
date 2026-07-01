-- Reputation scale: start 100, max 500 (run in Supabase SQL Editor)

create or replace function apply_positive_rating(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    positive_ratings = positive_ratings + 1,
    reputation_score = least(500, reputation_score + 3)
  where id = p_partner_id;
end;
$$;

create or replace function auto_flag_on_reports(p_user_id uuid, p_threshold int default 3)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from abuse_reports
  where reported_user_id = p_user_id
    and created_at > now() - interval '24 hours';

  if v_count >= p_threshold then
    insert into flagged_users (user_id, flagged_for_abuse, reason, flagged_at)
    values (
      p_user_id,
      true,
      'Auto-flagged: multiple reports in 24h',
      now()
    )
    on conflict (user_id) do update set
      flagged_for_abuse = true,
      reason = excluded.reason,
      flagged_at = now();

    update profiles
    set reputation_score = greatest(0, reputation_score - 50)
    where id = p_user_id;
  end if;
end;
$$;
