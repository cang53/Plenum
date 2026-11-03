-- Live Stream: lets Supabase Realtime announce changes to messages and AI cards.
-- Row-level security still decides who hears what. Safe to run twice.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agent_actions') then
    alter publication supabase_realtime add table public.agent_actions;
  end if;
end $$;
