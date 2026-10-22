-- Live SES sender (S6-1): each attempt is recorded in the outbox with its outcome.
alter table public.outbox
  add column status text not null default 'fake' check (status in ('fake', 'sent', 'failed')),
  add column error text;
