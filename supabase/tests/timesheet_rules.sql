-- Timesheet rules (S11-3). Runs after milestone_rules.sql, reusing its tasks and the members of project 2...01 (Pia manager b, Mo member c, Cy contributor d).
\set ON_ERROR_STOP on
set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.save_hours('40000000-0000-0000-0000-000000000001', '2026-11-02', 4);
select public.save_hours('40000000-0000-0000-0000-000000000001', '2026-11-02', 6.5);
do $$ begin
  if (select count(*) from public.timesheet_entries) <> 1 then raise exception 'second save did not replace'; end if;
  if (select hours from public.timesheet_entries) <> 6.5 then raise exception 'hours not updated'; end if;
  begin
    perform public.save_hours('40000000-0000-0000-0000-000000000001', '2026-11-03', 25);
    raise exception 'more than 24 hours accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.timesheet_entries (project_id, task_id, user_id, work_date, hours)
    values ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '2026-11-04', 1);
    raise exception 'direct write allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Nobody else sees Mo's hours, not even the manager.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if exists (select 1 from public.timesheet_entries) then raise exception 'manager can read another person''s hours'; end if;
end $$;

-- A contributor logs their own hours and sees only those.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select public.save_hours('40000000-0000-0000-0000-000000000001', '2026-11-02', 2);
do $$ begin
  if (select count(*) from public.timesheet_entries) <> 1 or (select hours from public.timesheet_entries) <> 2 then raise exception 'contributor sees other hours'; end if;
end $$;
-- Zero removes only the caller's entry.
select public.save_hours('40000000-0000-0000-0000-000000000001', '2026-11-02', 0);
do $$ begin
  if exists (select 1 from public.timesheet_entries) then raise exception 'zero did not remove the entry'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  if (select count(*) from public.timesheet_entries) <> 1 then raise exception 'zero removed another person''s entry'; end if;
end $$;

-- Someone outside the project cannot log on its tasks.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  perform public.save_hours('40000000-0000-0000-0000-000000000001', '2026-11-02', 1);
  raise exception 'outsider logged hours';
exception when raise_exception then
  if sqlerrm = 'outsider logged hours' then raise; end if;
end $$;
reset role;
