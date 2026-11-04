-- Risk plan steps: everyone on the project reads them, only a manager adds or accepts, accepting makes a task with the owner.
\set ON_ERROR_STOP on

insert into public.risks (id, project_id, title) values ('9b000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'Supplier slips');
insert into public.risk_plan_steps (id, risk_id, project_id, title, start_date, due_date, owner_id)
values ('9c000000-0000-0000-0000-0000000000a1', '9b000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'Call supplier', '2026-11-10', '2026-11-11', '00000000-0000-0000-0000-00000000000c');

set role authenticated;
do $$
declare t uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  if (select count(*) from public.risk_plan_steps) <> 1 then raise exception 'a member cannot read steps'; end if;
  begin
    insert into public.risk_plan_steps (risk_id, project_id, title) values ('9b000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'x');
    raise exception 'a member added a step';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.accept_risk_step('9c000000-0000-0000-0000-0000000000a1');
    raise exception 'a member accepted a step';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  t := public.accept_risk_step('9c000000-0000-0000-0000-0000000000a1');
  if not exists (select 1 from public.tasks where id = t and title = 'Call supplier' and due_date = '2026-11-11' and owner_id = '00000000-0000-0000-0000-00000000000c') then
    raise exception 'task missing';
  end if;
  begin
    perform public.accept_risk_step('9c000000-0000-0000-0000-0000000000a1');
    raise exception 'accepted twice';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
