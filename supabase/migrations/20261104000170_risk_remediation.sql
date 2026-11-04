-- Remediation: a saved snapshot of the plan (timeline changes and chat) per risk or issue, and a remediation status on the risk. Safe to re-run.
alter table public.risks add column if not exists remediation text not null default 'none';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'risks_remediation_check') then
    alter table public.risks add constraint risks_remediation_check check (remediation in ('none', 'in_remediation', 'remediated'));
  end if;
end $$;

create table if not exists public.risk_plan_snapshots (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references public.risks (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  origin text not null check (origin in ('ai', 'manual')),
  doc jsonb not null default '{}'::jsonb check (octet_length(doc::text) <= 200000),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists risk_plan_snapshots_risk_idx on public.risk_plan_snapshots (risk_id, created_at desc);

alter table public.risk_plan_snapshots enable row level security;
drop policy if exists "read plan snapshots" on public.risk_plan_snapshots;
create policy "read plan snapshots" on public.risk_plan_snapshots for select using (public.can_see_project(project_id));
drop policy if exists "managers add plan snapshots" on public.risk_plan_snapshots;
create policy "managers add plan snapshots" on public.risk_plan_snapshots for insert with check (created_by = auth.uid() and public.can_manage_project(project_id));
revoke all on public.risk_plan_snapshots from anon, authenticated;
grant select, insert on public.risk_plan_snapshots to authenticated;
