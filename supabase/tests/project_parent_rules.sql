-- Parent project rules: staff manage parents, outsiders cannot see them, projects stay inside their workspace.
\set ON_ERROR_STOP on
insert into auth.users (id) values ('00000000-0000-0000-0000-000000bb00a1'), ('00000000-0000-0000-0000-000000bb00a2'), ('00000000-0000-0000-0000-000000bb00a3');
insert into public.profiles (id, display_name, email) values
  ('00000000-0000-0000-0000-000000bb00a1', 'Sam', 'sam@example.com'),
  ('00000000-0000-0000-0000-000000bb00a2', 'Cleo', 'cleo@partner.example'),
  ('00000000-0000-0000-0000-000000bb00a3', 'Zoe', 'zoe@other.example');
insert into public.workspaces (id, name) values ('11000000-0000-0000-0000-000000000001', 'Group A'), ('11000000-0000-0000-0000-000000000002', 'Group B');
insert into public.workspace_members (workspace_id, user_id, kind, role) values
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000bb00a1', 'staff', 'member'),
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000bb00a2', 'contributor', 'member'),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000bb00a3', 'staff', 'member');
set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000bb00a1';
insert into public.project_parents (id, workspace_id, name) values ('12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Dock 3');
insert into public.projects (id, workspace_id, name, email_slug, created_by, parent_id)
values ('13000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Bay upgrade', 'bay-upgrade', '00000000-0000-0000-0000-000000bb00a1', '12000000-0000-0000-0000-000000000001');
do $$ begin
  if (select count(*) from public.project_parents) <> 1 then raise exception 'staff should see their parent project'; end if;
end $$;

-- A parent from another workspace is refused.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000bb00a3';
insert into public.project_parents (id, workspace_id, name) values ('12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'Other');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000bb00a1';
do $$ begin
  begin
    update public.projects set parent_id = '12000000-0000-0000-0000-000000000002' where id = '13000000-0000-0000-0000-000000000001';
    raise exception 'cross-workspace parent was allowed';
  exception when others then
    if sqlerrm = 'cross-workspace parent was allowed' then raise; end if;
  end;
end $$;

-- Outside contributors and other workspaces see no parents; staff of another workspace cannot create one here.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000bb00a2';
do $$ begin if (select count(*) from public.project_parents) <> 0 then raise exception 'contributor saw a parent project'; end if; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000bb00a3';
do $$ begin
  if (select count(*) from public.project_parents) <> 1 then raise exception 'other workspace saw a foreign parent'; end if;
  begin
    insert into public.project_parents (workspace_id, name) values ('11000000-0000-0000-0000-000000000001', 'Sneaky');
    raise exception 'foreign insert was allowed';
  exception when others then
    if sqlerrm = 'foreign insert was allowed' then raise; end if;
  end;
end $$;
select 'project parent rules ok';
