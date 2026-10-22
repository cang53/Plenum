-- Access-rule tests for backlog task 4. Each block raises an error when a rule is broken.
\set ON_ERROR_STOP on

-- People: Ada (workspace admin), Pia (project manager), Mo (member),
-- Cy (outside contributor), Eve (staff, not on the project).
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-00000000000e');
insert into public.profiles (id, display_name, email) values
  ('00000000-0000-0000-0000-00000000000a', 'Ada', 'ada@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'Pia', 'pia@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'Mo', 'mo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'Cy', 'cy@partner.example'),
  ('00000000-0000-0000-0000-00000000000e', 'Eve', 'eve@example.com');
insert into public.workspaces (id, name) values ('10000000-0000-0000-0000-000000000001', 'Example Industrial Group');
insert into public.workspace_members (workspace_id, user_id, kind, is_admin) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'staff', true),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'staff', false),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'staff', false),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'contributor', false),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'staff', false);

-- A second workspace with a project of its own, which nobody above may touch.
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000ff');
insert into public.profiles (id, display_name, email) values ('00000000-0000-0000-0000-0000000000ff', 'Zed', 'zed@other.example');
insert into public.workspaces (id, name) values ('10000000-0000-0000-0000-000000000002', 'Other Group');
insert into public.workspace_members (workspace_id, user_id) values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000ff');
insert into public.projects (id, workspace_id, name, email_slug, created_by) values
  ('20000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000002', 'Other plant', 'other-plant', '00000000-0000-0000-0000-0000000000ff');

set role authenticated;

-- Pia creates a project and becomes its project manager.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.projects (id, workspace_id, name, email_slug, created_by)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Line 4 retrofit', 'line4-ghent', '00000000-0000-0000-0000-00000000000b');

-- create_project returns the new row to its creator (plain insert ... returning cannot).
do $$
declare created public.projects;
begin
  select * into created from public.create_project('10000000-0000-0000-0000-000000000001', 'Substation upgrade', 'substation-ghent');
  if created.id is null or created.created_by <> '00000000-0000-0000-0000-00000000000b' then
    raise exception 'create_project did not return the new project';
  end if;
end $$;

-- A project manager cannot move a project into another workspace.
do $$ begin
  update public.projects set workspace_id = '10000000-0000-0000-0000-000000000002'
  where id = '20000000-0000-0000-0000-000000000001';
  raise exception 'project moved workspace';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  if public.project_role_of('20000000-0000-0000-0000-000000000001') is distinct from 'project_manager' then
    raise exception 'creator should be project manager';
  end if;
end $$;

-- Pia adds Mo as a member and Cy as a contributor.
insert into public.project_members (project_id, user_id, role) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'member'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'contributor');

-- An outside contributor cannot be made a project manager.
do $$ begin
  update public.project_members set role = 'project_manager'
  where project_id = '20000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'contributor was promoted';
exception when raise_exception then
  if sqlerrm = 'contributor was promoted' then raise; end if;
end $$;

-- Mo (member) sees the project but cannot add people or rename it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$
declare n int;
begin
  select count(*) into n from public.projects;
  if n <> 1 then raise exception 'member should see 1 project, saw %', n; end if;

  update public.projects set name = 'Renamed' where id = '20000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'member renamed the project'; end if;

  begin
    insert into public.project_members (project_id, user_id, role)
    values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'member');
    raise exception 'member added someone';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Eve (staff, not on the project) sees nothing of it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$
declare n int;
begin
  select count(*) into n from public.projects;
  if n <> 0 then raise exception 'outsider saw % projects', n; end if;
  select count(*) into n from public.project_members;
  if n <> 0 then raise exception 'outsider saw % memberships', n; end if;
end $$;

-- Cy (contributor) sees the project but cannot create one.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$
declare n int;
begin
  select count(*) into n from public.projects;
  if n <> 1 then raise exception 'contributor should see 1 project, saw %', n; end if;
  begin
    insert into public.projects (workspace_id, name, email_slug, created_by)
    values ('10000000-0000-0000-0000-000000000001', 'Side project', 'side-project', '00000000-0000-0000-0000-00000000000d');
    raise exception 'contributor created a project';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Ada (workspace admin) sees and can rename every project in her workspace, and none elsewhere.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare n int;
begin
  select count(*) into n from public.projects;
  if n <> 2 then raise exception 'admin should see 2 projects, saw %', n; end if;
  update public.projects set name = 'Line 4 retrofit, Ghent' where id = '20000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'admin could not rename the project'; end if;
end $$;

reset role;
\echo 'access rules: all checks passed'
