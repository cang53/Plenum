-- Outbox for the local fake email sender (stage 3, S3-4). Nothing is delivered; each "sent" email
-- is a row that managers can read. Written only by the server (service role).

create table public.outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  to_addresses text[] not null check (cardinality(to_addresses) > 0),
  subject text not null,
  body_text text not null default '',
  created_at timestamptz not null default now()
);
create index on public.outbox (workspace_id, created_at desc);

alter table public.outbox enable row level security;

create policy "managers and admins read the outbox" on public.outbox
for select using (
  public.is_workspace_admin(workspace_id) or (project_id is not null and public.can_manage_project(project_id))
);

revoke all on public.outbox from authenticated;
grant select on public.outbox to authenticated;
