-- Delete rules (stage 5, S5-4): only a workspace admin deletes a project or removes a person; both are audited.
-- Runs last, with its own people and project so earlier row counts stay untouched.
\set ON_ERROR_STOP on
reset role;
insert into auth.users (id) values
  ('0000000d-0000-0000-0000-0000000000a1'), ('0000000d-0000-0000-0000-0000000000a2'), ('0000000d-0000-0000-0000-0000000000a3');
insert into public.profiles (id, display_name, email) values
  ('0000000d-0000-0000-0000-0000000000a1', 'Dee', 'dee@del.example'),
  ('0000000d-0000-0000-0000-0000000000a2', 'Dan', 'dan@del.example'),
  ('0000000d-0000-0000-0000-0000000000a3', 'Dot', 'dot@del.example');
insert into public.workspaces (id, name) values ('10000000-0000-0000-0000-0000000000d1', 'Delete Co');
insert into public.workspace_members (workspace_id, user_id, is_admin) values
  ('10000000-0000-0000-0000-0000000000d1', '0000000d-0000-0000-0000-0000000000a1', true),
  ('10000000-0000-0000-0000-0000000000d1', '0000000d-0000-0000-0000-0000000000a2', false),
  ('10000000-0000-0000-0000-0000000000d1', '0000000d-0000-0000-0000-0000000000a3', false);
insert into public.projects (id, workspace_id, name, email_slug, created_by) values
  ('20000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-0000000000d1', 'Doomed', 'doomed-test', '0000000d-0000-0000-0000-0000000000a1'),
  ('20000000-0000-0000-0000-0000000000d2', '10000000-0000-0000-0000-0000000000d1', 'Kept', 'kept-test', '0000000d-0000-0000-0000-0000000000a1');
insert into public.project_members (project_id, user_id, role) values
  ('20000000-0000-0000-0000-0000000000d2', '0000000d-0000-0000-0000-0000000000a2', 'member');
insert into public.tasks (project_id, title, owner_id, position) values
  ('20000000-0000-0000-0000-0000000000d2', 'Dan''s task', '0000000d-0000-0000-0000-0000000000a2', 0);

-- A non-admin is refused, and nothing changes.
set role authenticated;
set request.jwt.claim.sub = '0000000d-0000-0000-0000-0000000000a2';
do $$ begin
  begin
    perform public.delete_project('20000000-0000-0000-0000-0000000000d1');
    raise exception 'a non-admin deleted a project';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.remove_person('10000000-0000-0000-0000-0000000000d1', '0000000d-0000-0000-0000-0000000000a3');
    raise exception 'a non-admin removed a person';
  exception when insufficient_privilege then null;
  end;
end $$;
set role anon;
do $$ begin
  begin
    perform public.delete_project('20000000-0000-0000-0000-0000000000d1');
    raise exception 'anon deleted a project';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The admin deletes a project and removes a person (not herself).
set role authenticated;
set request.jwt.claim.sub = '0000000d-0000-0000-0000-0000000000a1';
do $$ begin
  begin
    perform public.remove_person('10000000-0000-0000-0000-0000000000d1', '0000000d-0000-0000-0000-0000000000a1');
    raise exception 'an admin removed herself';
  exception when insufficient_privilege then null;
  end;
end $$;
select public.delete_project('20000000-0000-0000-0000-0000000000d1');
select public.remove_person('10000000-0000-0000-0000-0000000000d1', '0000000d-0000-0000-0000-0000000000a2');

reset role;
do $$ begin
  if exists (select 1 from projects where id = '20000000-0000-0000-0000-0000000000d1') then raise exception 'project still there'; end if;
  if not exists (select 1 from projects where id = '20000000-0000-0000-0000-0000000000d2') then raise exception 'other project deleted'; end if;
  if exists (select 1 from workspace_members where user_id = '0000000d-0000-0000-0000-0000000000a2')
     or exists (select 1 from project_members where user_id = '0000000d-0000-0000-0000-0000000000a2') then
    raise exception 'person still a member';
  end if;
  if (select owner_id from tasks where title = 'Dan''s task') is not null then raise exception 'task still owned'; end if;
  if not exists (select 1 from workspace_members where user_id = '0000000d-0000-0000-0000-0000000000a3') then
    raise exception 'wrong person removed';
  end if;
  if (select count(*) from audit_log where workspace_id = '10000000-0000-0000-0000-0000000000d1'
        and actor_id = '0000000d-0000-0000-0000-0000000000a1'
        and ((action = 'deleted' and entity_type = 'projects') or (action = 'removed' and entity_type = 'people'))) <> 2 then
    raise exception 'deletions not audited';
  end if;
end $$;
