-- Risk scoring: likelihood and severity from 1 to 5 for the risk matrix. For an issue, severity is its impact.
-- Access is unchanged: the existing risk policies decide who may read and edit.
alter table public.risks
  add column if not exists likelihood smallint not null default 3 check (likelihood between 1 and 5),
  add column if not exists severity smallint not null default 3 check (severity between 1 and 5);
