-- Reward switches (S12-1): admin only writes, members read, changes are audited.
\set ON_ERROR_STOP on
-- Earlier files may leave other people promoted; start from a known state.
update public.workspace_members set role = 'member' where user_id = '00000000-0000-0000-0000-00000000000b';
set role authenticated;
do $$
declare ws uuid := '10000000-0000-0000-0000-000000000001'; n int;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  begin
    perform public.set_reward_switches(ws, array['North']);
    raise exception 'a non-admin switched rewards';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.reward_switches values (ws, 'North');
    raise exception 'a non-admin wrote the table directly';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
  perform public.set_reward_switches(ws, array['North', ' North ', 'South']);
  select count(*) into n from public.reward_switches where workspace_id = ws;
  if n <> 2 then raise exception 'expected 2 switches, got %', n; end if;
  perform public.set_reward_switches(ws, array[]::text[]);
  select count(*) into n from public.reward_switches where workspace_id = ws;
  if n <> 0 then raise exception 'list was not replaced'; end if;
  select count(*) into n from public.audit_log where entity_type = 'reward_switches';
  if n <> 3 then raise exception 'expected 3 audit rows, got %', n; end if;
end $$;
