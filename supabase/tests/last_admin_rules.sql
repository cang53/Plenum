-- Last admin protection: the only admin cannot be demoted or removed; with a second admin it can.
\set ON_ERROR_STOP on
do $$
declare
  ws uuid := '10000000-0000-0000-0000-000000000001';
  a uuid := '00000000-0000-0000-0000-00000000000a';
  b uuid := '00000000-0000-0000-0000-00000000000b';
begin
  begin
    update workspace_members set role = 'member' where workspace_id = ws and user_id = a;
    raise exception 'the last admin was demoted';
  exception when check_violation then null;
  end;
  begin
    delete from workspace_members where workspace_id = ws and user_id = a;
    raise exception 'the last admin was removed';
  exception when check_violation then null;
  end;
  update workspace_members set role = 'admin' where workspace_id = ws and user_id = b;
  update workspace_members set role = 'member' where workspace_id = ws and user_id = a;
  begin
    update workspace_members set role = 'member' where workspace_id = ws and user_id = b;
    raise exception 'the new last admin was demoted';
  exception when check_violation then null;
  end;
end $$;
