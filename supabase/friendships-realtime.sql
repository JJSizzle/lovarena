-- Realtime friend request / friendship notifications

alter table friendships replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table friendships;
  end if;
end $$;
