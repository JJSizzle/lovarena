-- Allow "prefer_not_to_say" as a gender_identity value (run once in Supabase SQL Editor).

alter table profiles drop constraint if exists profiles_gender_identity_check;

alter table profiles add constraint profiles_gender_identity_check
  check (
    gender_identity is null
    or gender_identity in (
      'male',
      'female',
      'non_binary',
      'prefer_not_to_say'
    )
  );
