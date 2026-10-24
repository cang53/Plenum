-- Every suggestion says why it was made (shown as "Why" in the Inbox). Older rows get a generic line so they stay editable.
alter table public.suggestions add column reason text not null default '';
update public.suggestions set reason = 'Suggested before reasons were recorded. See the source message.' where reason = '';
alter table public.suggestions add constraint suggestions_reason_present check (length(trim(reason)) > 0);
alter table public.suggestions alter column reason drop default;
