-- AI analysis of a project's open risks and issues: what to look at, hints, and lessons from the Library.
-- A weekly job writes one with the service key; a project manager can also refresh it by hand. Nothing here changes a risk.
create table public.risk_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source text not null check (source in ('weekly', 'manual')),
  summary text not null check (length(summary) <= 2000),
  flags jsonb not null default '[]' check (jsonb_typeof(flags) = 'array'),
  hints jsonb not null default '[]' check (jsonb_typeof(hints) = 'array'),
  lessons jsonb not null default '[]' check (jsonb_typeof(lessons) = 'array'),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.risk_analyses (project_id, created_at desc);

alter table public.risk_analyses enable row level security;
create policy "see analyses of your projects" on public.risk_analyses for select using (public.can_see_project(project_id));
create policy "managers add analyses" on public.risk_analyses for insert with check (
  public.can_manage_project(project_id) and created_by = auth.uid() and source = 'manual');
revoke all on public.risk_analyses from anon, authenticated;
grant select, insert on public.risk_analyses to authenticated;
