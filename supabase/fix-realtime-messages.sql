-- Run in Supabase SQL Editor if messages don't appear live

-- Realtime needs full row data for filtered subscriptions
alter table messages replica identity full;

-- Enable realtime on messages (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object then null;
end $$;

-- Ensure reads work for realtime (anon key in browser)
drop policy if exists "Anyone can read messages" on messages;
create policy "Anyone can read messages"
  on messages for select
  using (true);

grant all on table messages to service_role;
grant select on table messages to anon;
grant select on table messages to authenticated;
