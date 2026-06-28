-- Run in Supabase SQL Editor if messages don't appear live.
-- IMPORTANT: After this, run secure-messages-rls.sql so messages are not public.

alter table messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object then null;
end $$;

grant all on table messages to service_role;

-- Do NOT grant anon/authenticated broad SELECT here.
-- Run supabase/secure-messages-rls.sql for room-scoped read access + Realtime.
