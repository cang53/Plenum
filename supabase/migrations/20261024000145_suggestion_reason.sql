-- Every suggestion says why it was made (shown as "Why" in the Inbox). Triage always writes one (the app drops answers
-- without a reason); the default only covers rows written before this column existed and direct test inserts.
alter table public.suggestions add column reason text not null default 'Not recorded. See the source message.' check (length(trim(reason)) > 0);
