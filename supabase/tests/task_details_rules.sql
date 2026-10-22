-- Task description rules (stage 4, S4-2). Runs after audit_rules.sql, reusing its tasks.
\set ON_ERROR_STOP on
set role authenticated;

-- Pia (project manager) writes a description; the audit log records the change but not the text.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.tasks set details = 'Crane booked for week 45' where id = '40000000-0000-0000-0000-000000000001';
do $$ begin
  if (select details from public.tasks where id = '40000000-0000-0000-0000-000000000001') <> 'Crane booked for week 45'
     or (select count(*) from public.audit_log where action = 'details_changed' and actor_id = '00000000-0000-0000-0000-00000000000b') <> 1 then
    raise exception 'description edit not saved or not logged';
  end if;
  begin
    update public.tasks set details = repeat('x', 5001) where id = '40000000-0000-0000-0000-000000000001';
    raise exception 'oversized description accepted';
  exception when check_violation then null;
  end;
end $$;

-- Mo owns the task but may change the status only, not the description.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  update public.tasks set details = 'mine' where id = '40000000-0000-0000-0000-000000000001';
  raise exception 'owner edited the description';
exception when insufficient_privilege then null;
end $$;

reset role;
\echo 'task details rules: all checks passed'
