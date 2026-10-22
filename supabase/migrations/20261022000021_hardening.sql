-- Hardening (stage 4, S4-9): cap how many workspaces onboard() may create, so a stranger who
-- signs in cannot fill the database. Raise the cap with an update in the SQL editor.
create table public.platform_limits (
  key text primary key,
  value int not null check (value >= 0)
);
alter table public.platform_limits enable row level security;
-- No policies and no grants: only the service role and the SQL editor can read or change limits.
revoke all on public.platform_limits from authenticated, anon;
insert into public.platform_limits values ('max_workspaces', 25);

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
  insert into workspace_members (workspace_id, user_id, kind, is_admin) values (ws, me, 'staff', true);
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
