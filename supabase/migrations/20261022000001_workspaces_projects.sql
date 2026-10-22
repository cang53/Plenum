-- Workspaces, projects and per-project roles (backlog task 4).
-- Access rules live here as row-level security, so every client gets the same checks.

create extension if not exists pgcrypto;

create type public.member_kind as enum ('staff', 'contributor');
create type public.project_role as enum ('project_manager', 'member', 'contributor');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.member_kind not null default 'staff',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  -- Contributors are outside partners and can never administer a workspace.
  check (not (is_admin and kind = 'contributor'))
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- Local part of the project's inbound email address, e.g. "line4-ghent".
  email_slug text not null unique check (email_slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.project_role not null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index on public.projects (workspace_id);
create index on public.project_members (user_id);
create index on public.workspace_members (user_id);

-- Helper checks. Security definer so policies can call them without recursing into RLS.

create function public.is_workspace_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid());
$$;

create function public.is_workspace_staff(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid() and kind = 'staff'
  );
$$;

create function public.is_workspace_admin(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid() and is_admin
  );
$$;

create function public.project_role_of(p uuid) returns public.project_role
language sql stable security definer set search_path = public as $$
  select role from project_members where project_id = p and user_id = auth.uid();
$$;

create function public.can_see_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.project_role_of(p) is not null
    or exists (select 1 from projects where id = p and public.is_workspace_admin(workspace_id));
$$;

create function public.can_manage_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.project_role_of(p) = 'project_manager'
    or exists (select 1 from projects where id = p and public.is_workspace_admin(workspace_id));
$$;

-- Whoever creates a project becomes its project manager.
create function public.add_creator_as_manager() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into project_members (project_id, user_id, role)
    values (new.id, new.created_by, 'project_manager')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger projects_add_creator
after insert on public.projects
for each row execute function public.add_creator_as_manager();

-- Row-level security.

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy "see own profile and people in shared projects" on public.profiles
for select using (
  id = auth.uid()
  or exists (
    select 1 from project_members mine
    join project_members theirs on theirs.project_id = mine.project_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
  or exists (
    select 1 from workspace_members wm
    where wm.user_id = profiles.id and public.is_workspace_admin(wm.workspace_id)
  )
);

create policy "edit own profile" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members see their workspace" on public.workspaces
for select using (public.is_workspace_member(id));

create policy "admins rename their workspace" on public.workspaces
for update using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));

create policy "admins see workspace members, people see themselves" on public.workspace_members
for select using (user_id = auth.uid() or public.is_workspace_admin(workspace_id));

create policy "admins manage workspace members" on public.workspace_members
for all using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "see projects you belong to" on public.projects
for select using (public.can_see_project(id));

create policy "staff create projects in their workspace" on public.projects
for insert with check (public.is_workspace_staff(workspace_id) and created_by = auth.uid());

create policy "managers edit projects" on public.projects
for update using (public.can_manage_project(id)) with check (public.can_manage_project(id));

create policy "see members of your projects" on public.project_members
for select using (public.can_see_project(project_id));

create policy "managers add members" on public.project_members
for insert with check (public.can_manage_project(project_id));

create policy "managers change roles" on public.project_members
for update using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "managers remove members" on public.project_members
for delete using (public.can_manage_project(project_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- A project member must belong to the project's workspace, and outside contributors
-- can only hold the contributor role.
create function public.check_project_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  member_kind public.member_kind;
begin
  select wm.kind into member_kind
  from projects p
  join workspace_members wm on wm.workspace_id = p.workspace_id and wm.user_id = new.user_id
  where p.id = new.project_id;

  if member_kind is null then
    raise exception 'user % is not in this project''s workspace', new.user_id;
  end if;
  if member_kind = 'contributor' and new.role <> 'contributor' then
    raise exception 'outside contributors can only have the contributor role';
  end if;
  return new;
end;
$$;

create trigger project_members_check
before insert or update on public.project_members
for each row execute function public.check_project_member();

-- A project stays in the workspace it was created in, and keeps its creator.
create function public.lock_project_fields() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.workspace_id is distinct from old.workspace_id or new.created_by is distinct from old.created_by then
    raise exception 'a project cannot move workspace or change creator'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger projects_lock_fields
before update on public.projects
for each row execute function public.lock_project_fields();

-- Creates a project and returns it. Clients use this instead of insert ... returning, because
-- the creator only becomes a member (and can see the row) once the insert has finished.
-- Security invoker: the insert policy above still decides who may create a project.
create function public.create_project(workspace uuid, project_name text, slug text)
returns setof public.projects
language plpgsql set search_path = public as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into projects (id, workspace_id, name, email_slug, created_by)
  values (new_id, workspace, project_name, slug, auth.uid());
  return query select * from projects where id = new_id;
end;
$$;
