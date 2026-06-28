-- Realtime room status (instant "stranger left" when chat_rooms.status → ended)
-- Run in Supabase SQL Editor.

alter table chat_rooms replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_rooms'
  ) then
    alter publication supabase_realtime add table chat_rooms;
  end if;
end $$;
