-- Privacy toggles for friend requests and in-chat mutual spark

alter table public.profiles
  add column if not exists allow_friend_requests boolean not null default true,
  add column if not exists allow_mutual_spark boolean not null default true;

comment on column public.profiles.allow_friend_requests is
  'When false, other users cannot send new friend requests.';
comment on column public.profiles.allow_mutual_spark is
  'When false, in-chat mutual spark cannot create a connection with this user.';
