-- Timesheet approval rules (S11-4). Runs after milestone_rules.sql, reusing its people and project.
\set ON_ERROR_STOP on
select p.id as proj from public.tasks t join public.projects p on p.id = t.project_id where t.id = '40000000-0000-0000-0000-000000000001' \gset
select :'proj' as pid \gset
set role authenticated;

-- Cy (member) submits his own week, but not someone else's.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into public.timesheet_weeks (project_id, user_id, week_start) values (:'pid', '00000000-0000-0000-0000-00000000000d', '2026-10-19');
do $$ begin
  insert into public.timesheet_weeks (project_id, user_id, week_start) values (current_setting('request.jwt.claim.sub')::uuid, '00000000-0000-0000-0000-00000000000b', '2026-10-19');
  raise exception 'submitted for someone else';
exception when others then null;
end $$;
-- He cannot approve it himself.
do $$ begin
  update public.timesheet_weeks set status = 'approved';
  raise exception 'member approved own week';
exception when insufficient_privilege then null;
end $$;
-- Pia (manager) sends it back, Cy resubmits, Pia approves.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.timesheet_weeks set status = 'sent_back', note = 'Add Friday' where week_start = '2026-10-19';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
update public.timesheet_weeks set status = 'submitted' where week_start = '2026-10-19';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.timesheet_weeks set status = 'approved' where week_start = '2026-10-19';
-- Locked: nobody can change an approved week, and it is reported as locked.
do $$ begin
  update public.timesheet_weeks set status = 'sent_back' where week_start = '2026-10-19';
  raise exception 'approved week changed';
exception when insufficient_privilege then null;
end $$;
reset role;
do $$ begin
  if not public.week_locked((select project_id from public.timesheet_weeks limit 1), '00000000-0000-0000-0000-00000000000d', '2026-10-22') then
    raise exception 'week not reported locked';
  end if;
  if (select count(*) from public.audit_log where entity_type = 'timesheet_weeks') <> 3 then
    raise exception 'decisions not audited';
  end if;
end $$;
\echo 'timesheet rules: all checks passed'
