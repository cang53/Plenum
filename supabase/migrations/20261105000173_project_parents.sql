-- Parent projects group projects under one name (parent > project). Two levels only. Safe to re-run.
create table if not exists public.project_parents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists project_parents_workspace_idx on public.project_parents (workspace_id);
alter table public.projects add column if not exists parent_id uuid references public.project_parents (id) on delete set null;

-- A project can only sit under a parent of its own workspace.
create or replace function public.check_project_parent() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.parent_id is not null and not exists (select 1 from public.project_parents where id = new.parent_id and workspace_id = new.workspace_id) then
    raise exception 'parent project must be in the same workspace';
  end if;
  return new;
end;
$$;
drop trigger if exists projects_check_parent on public.projects;
create trigger projects_check_parent before insert or update of parent_id on public.projects
for each row execute function public.check_project_parent();

alter table public.project_parents enable row level security;
drop policy if exists "staff see parent projects" on public.project_parents;
create policy "staff see parent projects" on public.project_parents
for select using (public.is_workspace_staff(workspace_id));
drop policy if exists "staff manage parent projects" on public.project_parents;
create policy "staff manage parent projects" on public.project_parents
for all using (public.is_workspace_staff(workspace_id)) with check (public.is_workspace_staff(workspace_id));
grant select, insert, update, delete on public.project_parents to authenticated;
