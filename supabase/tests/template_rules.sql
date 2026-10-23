-- Project template rules (stage 8, S8-4). Runs after task_plan_rules.sql, reusing its projects and tasks.
\set ON_ERROR_STOP on
set role authenticated;

-- Pia (manager) copies the project: tasks and dependencies come over, messages and owners do not.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare
  src uuid := '20000000-0000-0000-0000-000000000001';
  copy uuid;
begin
  copy := public.create_project_from(src, 'Copy', 'copy-project');
  if (select count(*) from public.tasks where project_id = copy) <> (select count(*) from public.tasks where project_id = src)
     or (select count(*) from public.phases where project_id = copy) <> (select count(*) from public.phases where project_id = src) then
    raise exception 'tasks or phases not copied';
  end if;
  if exists (select 1 from public.tasks where project_id = copy and (owner_id is not null or start_date is not null or due_date is not null or status <> 'todo')) then
    raise exception 'owners, dates or status were copied';
  end if;
  if (select count(*) from public.task_dependencies d join public.tasks t on t.id = d.successor_id where t.project_id = copy)
     <> (select count(*) from public.task_dependencies d join public.tasks t on t.id = d.successor_id where t.project_id = src) then
    raise exception 'dependencies not copied';
  end if;
  if exists (select 1 from public.messages where project_id = copy) then raise exception 'messages were copied'; end if;
  if not public.can_manage_project(copy) then raise exception 'creator is not a manager of the copy'; end if;
  if not exists (select 1 from public.audit_log where action = 'created_from_template' and project_id = copy) then
    raise exception 'copy not logged';
  end if;
end $$;

-- Dee is not a manager of the source and is refused.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  perform public.create_project_from('20000000-0000-0000-0000-000000000001', 'Nope', 'nope-project');
  raise exception 'a non-manager copied the project';
exception when insufficient_privilege then null;
end $$;
