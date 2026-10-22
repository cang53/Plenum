-- Background jobs (S7-9): one scheduled endpoint runs the digest and retry-send. job_runs holds the last
-- run of each job (server only; no personal data). claim_job makes a job run at most once per interval.
create table public.job_runs (
  job text primary key,
  last_run_at timestamptz not null,
  ok boolean,
  detail text
);
alter table public.job_runs enable row level security;
revoke all on public.job_runs from anon, authenticated;

create function public.claim_job(p_job text, p_min interval) returns boolean
language sql security definer set search_path = public as $$
  with c as (
    insert into job_runs (job, last_run_at) values (p_job, now())
    on conflict (job) do update set last_run_at = now(), ok = null, detail = null
      where job_runs.last_run_at < now() - p_min
    returning 1
  ) select exists (select 1 from c);
$$;

-- Failed sends are retried once per run, at most 3 attempts in all, and only for a day.
alter table public.outbox
  add column attempt int not null default 1,
  add column retried boolean not null default false;

create function public.claim_failed_emails(p_limit int) returns setof public.outbox
language sql security definer set search_path = public as $$
  update outbox set retried = true where id in (
    select id from outbox where status = 'failed' and not retried and attempt < 3
      and created_at > now() - interval '1 day'
    order by created_at limit p_limit for update skip locked
  ) returning *;
$$;

revoke execute on function public.claim_job(text, interval), public.claim_failed_emails(int) from public, anon, authenticated;
grant execute on function public.claim_job(text, interval), public.claim_failed_emails(int) to service_role;
