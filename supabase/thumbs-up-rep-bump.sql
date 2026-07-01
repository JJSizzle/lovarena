-- Bump thumbs-up reputation reward from +2 to +3
-- Run once in Supabase SQL Editor

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
