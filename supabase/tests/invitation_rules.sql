-- Rules for invitations and role changes (S3-8). Runs last, reusing the earlier people and project:
-- Ada admin (a), Pia manager (b), Mo member (c), Cy contributor (d), Eve staff off-project (e).
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'New.Hire@Example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'partner@supplier.example');
update auth.users set email = 'mo@example.com' where id = '00000000-0000-0000-0000-00000000000c';
update auth.users set email = 'cy@partner.example' where id = '00000000-0000-0000-0000-00000000000d';

set role authenticated;

do $$
declare n int; p constant uuid := '20000000-0000-0000-0000-000000000001';
begin
  -- Mo (member) cannot invite or see invitations; Pia (manager) can.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  begin
    insert into invitations (project_id, email, role, invited_by) values (p, 'x@example.com', 'member', auth.uid());
    raise exception 'a member invited someone';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  insert into invitations (project_id, email, role) values
    (p, 'new.hire@example.com', 'member'), (p, 'partner@supplier.example', 'contributor'),
    (p, 'cy@partner.example', 'member');
  begin
    insert into invitations (project_id, email, role) values (p, 'new.hire@example.com', 'member');
    raise exception 'duplicate invitation';
  exception when unique_violation then null;
  end;
  select count(*) into n from invitations;
  if n <> 3 then raise exception 'manager saw % invitations', n; end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  select count(*) into n from invitations;
  if n <> 0 then raise exception 'member saw invitations'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', true);
  select count(*) into n from invitations;
  if n <> 0 then raise exception 'outsider saw invitations'; end if;

  -- The invited address signs in: profile, workspace and project membership appear.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  if public.accept_my_invitations() <> 1 then raise exception 'new hire did not join'; end if;
  if public.project_role_of(p) is distinct from 'member' then raise exception 'new hire is not a member'; end if;
  if public.accept_my_invitations() <> 0 then raise exception 'invitation used twice'; end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  perform public.accept_my_invitations();
  if public.project_role_of(p) is distinct from 'contributor' then raise exception 'partner is not a contributor'; end if;
  if public.is_workspace_staff('10000000-0000-0000-0000-000000000001') then raise exception 'partner became staff'; end if;

  -- An outside contributor invited as a member stays contributor and the invitation stays pending.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
  if public.accept_my_invitations() <> 0 or public.project_role_of(p) <> 'contributor' then
    raise exception 'contributor was promoted by invitation';
  end if;

  -- Role changes: a manager promotes a member; a member cannot change roles or remove anyone.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  update project_members set role = 'project_manager' where project_id = p and user_id = auth.uid();
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'member promoted themselves'; end if;
  delete from project_members where project_id = p and user_id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'member removed someone'; end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  update project_members set role = 'project_manager' where project_id = p and user_id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'manager could not change a role'; end if;
  delete from project_members where project_id = p and user_id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'manager could not remove a member'; end if;
end $$;

reset role;
\echo 'invitation rules: all checks passed'
