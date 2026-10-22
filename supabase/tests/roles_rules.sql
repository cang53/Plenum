-- Roles screen rules (stage 5, S5-5): a workspace admin changes roles, a plain member cannot, and the change is audited.
\set ON_ERROR_STOP on
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
  insert into public.project_members (project_id, user_id, role)
  values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'member');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  update public.project_members set role = 'project_manager'
  where project_id = '20000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000c';
  if (select role from public.project_members where project_id = '20000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000c') <> 'member' then
    raise exception 'a member promoted themselves';
  end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
  update public.project_members set role = 'project_manager'
  where project_id = '20000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000c';
  if not exists (select 1 from public.audit_log where action = 'role_changed'
    and actor_id = '00000000-0000-0000-0000-00000000000a' and entity_id = '00000000-0000-0000-0000-00000000000c') then
    raise exception 'role change not audited';
  end if;
  update public.project_members set role = 'project_manager'
  where project_id = '20000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000c';
  if (select count(*) from public.audit_log where action = 'role_changed' and entity_id = '00000000-0000-0000-0000-00000000000c') <> 1 then
    raise exception 'an unchanged role was audited';
  end if;
end $$;
