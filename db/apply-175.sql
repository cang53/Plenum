-- Run once in the Supabase SQL editor; safe to re-run. Fixes the error after apply-174.
-- after_task_id is a plain anchor, not a foreign key: a second link between phases and tasks makes the API's phases(name) embed ambiguous.
alter table public.phases drop constraint if exists phases_after_task_id_fkey;
