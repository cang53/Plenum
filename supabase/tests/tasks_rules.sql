-- Rules for phases, tasks and dependencies (backlog task 5). Runs after access_rules.sql,
-- reusing its people and project. Each block raises an error when a rule is broken.
\set ON_ERROR_STOP on

-- A task in the other workspace's project (from access_rules.sql).
insert into public.tasks (id, project_id, title)
values ('40000000-0000-0000-0000-000000000099', '20000000-0000-0000-0000-000000000099', 'Other plant task');

set role authenticated;

-- Pia (project manager) builds a small plan.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.phases (id, project_id, name, position) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Site works', 1);
insert into public.tasks (id, project_id, phase_id, title, owner_id, start_date, due_date) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Lifting works', '00000000-0000-0000-0000-00000000000c', '2026-11-03', '2026-11-14'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Install gearbox', '00000000-0000-0000-0000-00000000000d', '2026-11-24', '2026-11-28'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Electrical tests', null, '2026-12-01', '2026-12-08');
insert into public.task_dependencies (predecessor_id, successor_id) values
  ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003');

-- A dependency loop is refused.
do $$ begin
  insert into public.task_dependencies (predecessor_id, successor_id)
  values ('40000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001');
  raise exception 'loop accepted';
exception when raise_exception then
  if sqlerrm = 'loop accepted' then raise; end if;
end $$;

-- Sub-subtasks are refused.
insert into public.tasks (id, project_id, parent_id, title) values
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Book crane');
do $$ begin
  insert into public.tasks (project_id, parent_id, title)
  values ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'Too deep');
  raise exception 'deep subtask accepted';
exception when raise_exception then
  if sqlerrm = 'deep subtask accepted' then raise; end if;
end $$;

-- Pia cannot reach into another workspace's project, even by id: no subtask under its task,
-- no dependency on it, no moving a task there. Nor can she give a task to someone off the project.
do $$ begin
  begin
    insert into public.tasks (project_id, parent_id, title)
    values ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000099', 'Hidden child');
    raise exception 'subtask under a hidden task accepted';
  exception when raise_exception then
    if sqlerrm = 'subtask under a hidden task accepted' then raise; end if;
  end;
  begin
    insert into public.task_dependencies (predecessor_id, successor_id)
    values ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000099');
    raise exception 'dependency on a hidden task accepted';
  exception when raise_exception then
    if sqlerrm = 'dependency on a hidden task accepted' then raise; end if;
  end;
  begin
    update public.tasks set project_id = '20000000-0000-0000-0000-000000000099'
    where id = '40000000-0000-0000-0000-000000000003';
    raise exception 'task moved to another project';
  exception when raise_exception then
    if sqlerrm = 'task moved to another project' then raise; end if;
  end;
  begin
    update public.tasks set owner_id = '00000000-0000-0000-0000-00000000000e'
    where id = '40000000-0000-0000-0000-000000000003';
    raise exception 'task given to a non-member';
  exception when raise_exception then
    if sqlerrm = 'task given to a non-member' then raise; end if;
  end;
end $$;

-- Mo (member) owns "Lifting works": may change its status, nothing else, and nobody else's task.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
update public.tasks set status = 'in_progress' where id = '40000000-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  begin
    update public.tasks set due_date = '2026-12-31' where id = '40000000-0000-0000-0000-000000000001';
    raise exception 'owner moved the due date';
  exception when insufficient_privilege then null;
  end;

  update public.tasks set status = 'done' where id = '40000000-0000-0000-0000-000000000003';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'member changed a task they do not own'; end if;

  begin
    insert into public.tasks (project_id, title) values ('20000000-0000-0000-0000-000000000001', 'My own task');
    raise exception 'member created a task';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Cy (contributor) owns "Install gearbox" and can mark it blocked.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
update public.tasks set status = 'blocked' where id = '40000000-0000-0000-0000-000000000002';

-- Eve (not on the project) sees no tasks, phases or dependencies.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$
declare n int;
begin
  select (select count(*) from public.tasks) + (select count(*) from public.phases)
       + (select count(*) from public.task_dependencies) into n;
  if n <> 0 then raise exception 'outsider saw % plan rows', n; end if;
end $$;

reset role;
do $$ begin
  if (select status from public.tasks where id = '40000000-0000-0000-0000-000000000001') <> 'in_progress'
     or (select status from public.tasks where id = '40000000-0000-0000-0000-000000000002') <> 'blocked' then
    raise exception 'owner status updates were lost';
  end if;
end $$;
\echo 'task rules: all checks passed'
