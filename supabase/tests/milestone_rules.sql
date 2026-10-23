-- Milestone rules (S10-7). Runs after task_plan_rules.sql, reusing its tasks.
\set ON_ERROR_STOP on
set role authenticated;

-- Pia (manager) marks a task as a milestone; the change is audited.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.tasks set is_milestone = true where id = '40000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.audit_log where action = 'milestone_changed' and entity_id = '40000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'milestone change not logged';
  end if;
end $$;
-- Cy owns the second task but may not make it a milestone.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  update public.tasks set is_milestone = true where id = '40000000-0000-0000-0000-000000000002';
  raise exception 'owner set a milestone';
exception when insufficient_privilege then null;
end $$;
reset role;
\echo 'milestone rules: all checks passed'
