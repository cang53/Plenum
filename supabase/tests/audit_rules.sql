-- Rules for the audit log (backlog task 15). Runs after suggestions_rules.sql, reusing what the
-- earlier tests did: Pia made four items from the gearbox message, accepted a suggestion and added two dependencies.
\set ON_ERROR_STOP on

do $$ declare n int; begin
  select count(*) into n from public.audit_log
  where project_id = '20000000-0000-0000-0000-000000000001' and actor_id = '00000000-0000-0000-0000-00000000000b';
  if n <> 7 then raise exception 'expected 7 audit rows for Pia, found %', n; end if;
  if not exists (select 1 from public.audit_log where action = 'accepted' and entity_type = 'suggestions' and source_message_id is not null)
     or not exists (select 1 from public.audit_log where action = 'created' and entity_type = 'risks' and source_message_id is not null) then
    raise exception 'approval or item creation not logged with its source message';
  end if;
  -- Task edits (tasks_rules.sql): Mo's and Cy's status changes, each logged under the person who made it.
  if (select count(*) from public.audit_log where action = 'status_changed' and entity_type = 'tasks') <> 2
     or not exists (select 1 from public.audit_log where action = 'status_changed' and actor_id = '00000000-0000-0000-0000-00000000000c') then
    raise exception 'task status changes not logged with their author';
  end if;
end $$;

set role authenticated;

-- The manager and the workspace admin read it; members, contributors and outsiders do not.
do $$
declare who text; want int; n int;
begin
  foreach who in array array['b', 'a', 'c', 'd', 'e'] loop
    perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || who, true);
    select count(*) into n from public.audit_log;
    want := case when who in ('a', 'b') then 9 else 0 end;
    if n <> want then raise exception 'user % saw % audit rows, expected %', who, n, want; end if;
  end loop;
end $$;

-- Nobody can write, change or remove rows through the API, and the helpers are not callable.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    insert into public.audit_log (workspace_id, project_id, action, entity_type, entity_id)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'x', 'x', gen_random_uuid());
    raise exception 'a signed-in user wrote an audit row';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.audit_log;
    raise exception 'a signed-in user deleted audit rows';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.write_audit('20000000-0000-0000-0000-000000000001', 'x', 'x', gen_random_uuid(), null);
    raise exception 'a signed-in user called write_audit';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Even the database owner cannot edit or truncate it.
do $$ begin
  begin
    update public.audit_log set action = 'edited';
    raise exception 'edited the audit log';
  exception when raise_exception then
    if sqlerrm = 'edited the audit log' then raise; end if;
  end;
  begin
    truncate public.audit_log;
    raise exception 'truncated the audit log';
  exception when raise_exception then
    if sqlerrm = 'truncated the audit log' then raise; end if;
  end;
end $$;

-- The demo seed fills a workspace; it is not callable by signed-in users.
do $$ declare p uuid; begin
  p := public.seed_demo_project('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
  if (select count(*) from public.tasks where project_id = p) <> 4
     or (select count(*) from public.task_dependencies d join public.tasks t on t.id = d.successor_id where t.project_id = p) <> 3
     or (select count(*) from public.messages where project_id = p) <> 3 then
    raise exception 'demo seed incomplete';
  end if;
end $$;
set role authenticated;
do $$ begin
  perform public.seed_demo_project('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
  raise exception 'a signed-in user seeded a project';
exception when insufficient_privilege then null;
end $$;
reset role;

\echo 'audit rules: all checks passed'
