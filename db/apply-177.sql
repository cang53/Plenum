-- Run once in the Supabase SQL editor; safe to re-run. Removes the Teams ingest function (CR-2).
drop function if exists public.ingest_teams(text, text, text, text, text, text, timestamptz);
