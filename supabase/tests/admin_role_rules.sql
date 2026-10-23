-- Admin role (S11-7): admin is a role, not a flag; contributors cannot hold it; only admins pass is_workspace_admin.
\set ON_ERROR_STOP on
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'workspace_members' and column_name = 'is_admin') then
    raise exception 'is_admin flag still exists';
  end if;
  begin
    update public.workspace_members set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000000d';
    raise exception 'a contributor became admin';
  exception when check_violation then null;
  end;
end $$;
set role authenticated;
do $$
declare ws uuid := '10000000-0000-0000-0000-000000000001';
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
  if not public.is_workspace_admin(ws) then raise exception 'admin role not recognised'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  if public.is_workspace_admin(ws) then raise exception 'a plain member counts as admin'; end if;
  update public.workspace_members set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000000b';
  if public.is_workspace_admin(ws) then raise exception 'a member promoted themselves'; end if;
end $$;
