-- Atomic referrer bonus when an invitee completes a qualified chat (run in Supabase SQL Editor)

create or replace function public.apply_referral_referrer_bonus(p_referrer_id uuid, p_bonus int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    qualified_referrals = qualified_referrals + 1,
    reputation_score = least(500, reputation_score + p_bonus)
  where id = p_referrer_id;
end;
$$;

grant execute on function public.apply_referral_referrer_bonus(uuid, int) to service_role;
