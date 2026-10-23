-- Task plan rules (stage 8, S8-2). Runs after task_details_rules.sql, reusing its tasks.
\set ON_ERROR_STOP on
set role authenticated;

-- Pia (manager) sets a site and a dependency; both are audited, and a loop is refused.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.tasks set site = 'Rotterdam yard' where id = '40000000-0000-0000-0000-000000000001';
delete from public.task_dependencies where successor_id = '40000000-0000-0000-0000-000000000002';
do $$ begin
  if not exists (select 1 from public.audit_log where action = 'dependency_removed' and entity_id = '40000000-0000-0000-0000-000000000002') then
    raise exception 'dependency removal not logged';
  end if;
end $$;
insert into public.task_dependencies (predecessor_id, successor_id)
values ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.audit_log where action = 'site_changed' and actor_id = '00000000-0000-0000-0000-00000000000b') <> 1
     or (select count(*) from public.audit_log where action = 'dependency_added' and entity_id = '40000000-0000-0000-0000-000000000002') < 2 then
    raise exception 'site or dependency change not logged';
  end if;
  begin
    insert into public.task_dependencies (predecessor_id, successor_id)
    values ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001');
    raise exception 'a dependency loop was accepted';
  exception when raise_exception then
    if sqlerrm = 'a dependency loop was accepted' then raise; end if;
  end;
  begin
    update public.tasks set site = repeat('x', 81) where id = '40000000-0000-0000-0000-000000000001';
    raise exception 'oversized site accepted';
  exception when check_violation then null;
  end;
end $$;
-- Cy owns the second task but may not change its site or dependencies.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  update public.tasks set site = 'mine' where id = '40000000-0000-0000-0000-000000000002';
  raise exception 'owner edited the site';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  insert into public.task_dependencies (predecessor_id, successor_id)
  values ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002');
  raise exception 'owner added a dependency';
exception when insufficient_privilege then null;
end $$;
reset role;
\echo 'task plan rules: all checks passed'
