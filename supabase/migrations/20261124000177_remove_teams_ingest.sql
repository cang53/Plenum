-- Teams is no longer read: ingestion is the project's own email address and messages written in Plenum.
-- Old Teams messages and the projects' teams_* columns stay as history; only the ingest function goes.
drop function if exists public.ingest_teams(text, text, text, text, text, text, timestamptz);
