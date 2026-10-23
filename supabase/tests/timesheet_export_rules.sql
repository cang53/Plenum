-- Timesheet export rules (S11-5). Runs after timesheet_approval_rules.sql: Cy's week of 2026-10-19 is approved.
\set ON_ERROR_STOP on
select project_id as pid from public.timesheet_weeks limit 1 \gset
set role authenticated;
-- Cy (member) cannot export.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  perform * from public.timesheet_export((select project_id from public.timesheet_weeks limit 1), '2026-10-01', '2026-10-31');
  raise exception 'member exported timesheets';
exception when insufficient_privilege then null;
end $$;
-- Pia (manager) gets only approved weeks, and nothing outside the period.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if (select count(*) from public.timesheet_export((select project_id from public.timesheet_weeks limit 1), '2026-10-19', '2026-10-25')) < 1 then
    raise exception 'approved hours missing from export';
  end if;
  if (select count(*) from public.timesheet_export((select project_id from public.timesheet_weeks limit 1), '2026-01-01', '2026-01-31')) <> 0 then
    raise exception 'export ignored the period';
  end if;
end $$;
reset role;
\echo 'timesheet export rules: all checks passed'
