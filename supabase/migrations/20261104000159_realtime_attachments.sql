-- Live Stream: attachments appear for everyone without a refresh. Row-level security still applies. Safe to run twice.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_attachments') then
    alter publication supabase_realtime add table public.message_attachments;
  end if;
end $$;
