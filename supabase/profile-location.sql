-- Public profile location (country + optional US state)

alter table profiles
  add column if not exists country_code text,
  add column if not exists state_code text;

comment on column profiles.country_code is 'ISO country code shown on public profile';
comment on column profiles.state_code is 'US state code when country_code is US';
