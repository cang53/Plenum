-- Admin as its own role (S11-7): workspace_members.role replaces the is_admin flag.
create type public.workspace_role as enum ('member', 'admin');

alter table public.workspace_members add column role public.workspace_role not null default 'member';
update public.workspace_members set role = 'admin' where is_admin;
alter table public.workspace_members drop column is_admin;
-- Contributors are outside partners and can never administer a workspace.
alter table public.workspace_members add check (not (role = 'admin' and kind = 'contributor'));

create or replace function public.is_workspace_admin(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.onboard(workspace_name text, project_name text, slug text, with_demo boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  ws uuid := gen_random_uuid();
  proj uuid := gen_random_uuid();
  phase uuid := gen_random_uuid();
begin
  if me is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from workspace_members where user_id = me)
     or exists (select 1 from project_members where user_id = me) then
    raise exception 'you already belong to a workspace' using errcode = 'insufficient_privilege';
  end if;
  if (select count(*) from workspaces) >= (select value from platform_limits where key = 'max_workspaces') then
    raise exception 'new workspaces are closed for now' using errcode = 'insufficient_privilege';
  end if;
  insert into profiles (id, display_name, email)
  select id, split_part(email, '@', 1), email from auth.users where id = me
  on conflict do nothing;
  insert into workspaces (id, name) values (ws, workspace_name);
  insert into workspace_members (workspace_id, user_id, kind, role) values (ws, me, 'staff', 'admin');
  insert into projects (id, workspace_id, name, email_slug, created_by) values (proj, ws, project_name, slug, me);
  if with_demo then
    insert into phases (id, project_id, name, position) values (phase, proj, 'Demo: getting started', 0);
    insert into tasks (project_id, phase_id, title, owner_id, start_date, due_date, status, position) values
      (proj, phase, 'Look around the board', me, current_date, current_date + 2, 'in_progress', 0),
      (proj, phase, 'Invite a colleague', me, current_date + 2, current_date + 4, 'todo', 1),
      (proj, phase, 'Delete the demo tasks', me, current_date + 4, current_date + 7, 'todo', 2);
  end if;
  return proj;
end;
$$;
