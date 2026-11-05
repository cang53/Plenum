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

-- Nested groups: accepting a step of a risk linked to an activity puts the task in a "Remediation plan" group inside the
-- activity's group, anchored right after that activity; a second step reuses the group; groups cannot loop.
insert into public.phases (id, project_id, name) values ('9d000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'Procurement');
insert into public.tasks (id, project_id, phase_id, title) values ('9e000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-0000000000a1', 'Order gearbox');
insert into public.risks (id, project_id, title, linked_task_id) values ('9b000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-000000000001', 'Gearbox late', '9e000000-0000-0000-0000-0000000000a1');
insert into public.risk_plan_steps (id, risk_id, project_id, title) values
  ('9c000000-0000-0000-0000-0000000000a2', '9b000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-000000000001', 'Find another supplier'),
  ('9c000000-0000-0000-0000-0000000000a3', '9b000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-000000000001', 'Book air freight');
set role authenticated;
do $$
declare a uuid; b uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  a := public.accept_risk_step('9c000000-0000-0000-0000-0000000000a2');
  b := public.accept_risk_step('9c000000-0000-0000-0000-0000000000a3');
  if (select count(*) from public.phases where name = 'Remediation plan' and parent_id = '9d000000-0000-0000-0000-0000000000a1' and after_task_id = '9e000000-0000-0000-0000-0000000000a1') <> 1 then
    raise exception 'remediation group missing or duplicated';
  end if;
  if (select count(distinct t.phase_id) from public.tasks t join public.phases p on p.id = t.phase_id where t.id in (a, b) and p.name = 'Remediation plan') <> 1 then
    raise exception 'steps not in the remediation group';
  end if;
  begin
    update public.phases set parent_id = (select id from public.phases where name = 'Remediation plan' limit 1) where id = '9d000000-0000-0000-0000-0000000000a1';
    raise exception 'a group loop was allowed';
  exception when raise_exception then
    if sqlerrm = 'a group loop was allowed' then raise; end if;
  end;
end $$;
reset role;
