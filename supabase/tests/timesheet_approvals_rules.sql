-- Timesheet approvals rules (S14-21). Runs after timesheet_export_rules.sql: Cy's week of 2026-10-19 is approved with 5 hours.
\set ON_ERROR_STOP on
select project_id as pid from public.timesheet_weeks limit 1 \gset
set role authenticated;
-- Cy (member) cannot read anyone's hours, but sees the counts.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  perform * from public.week_hours((select project_id from public.timesheet_weeks limit 1), '2026-10-19');
  raise exception 'member read weekly hours';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform * from public.week_detail((select project_id from public.timesheet_weeks limit 1), '00000000-0000-0000-0000-00000000000d', '2026-10-19');
  raise exception 'member read a week in detail';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  if (select submitted from public.week_counts((select project_id from public.timesheet_weeks limit 1), '2026-10-19')) < 1 then raise exception 'count missing'; end if;
end $$;
-- Pia (manager) reads hours and detail.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if (select hours from public.week_hours((select project_id from public.timesheet_weeks limit 1), '2026-10-19') where user_id = '00000000-0000-0000-0000-00000000000d' and week_start = '2026-10-19') <> 5 then
    raise exception 'weekly hours wrong';
  end if;
  if (select count(*) from public.week_detail((select project_id from public.timesheet_weeks limit 1), '00000000-0000-0000-0000-00000000000d', '2026-10-19')) < 1 then
    raise exception 'week detail missing';
  end if;
end $$;
-- Someone outside the project gets no counts.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ff';
do $$ begin
  if exists (select 1 from public.week_counts((select project_id from public.timesheet_weeks limit 1), '2026-10-19')) then raise exception 'outsider read counts'; end if;
end $$;
reset role;
\echo 'timesheet approvals rules: all checks passed'
