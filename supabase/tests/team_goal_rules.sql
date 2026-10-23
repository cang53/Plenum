-- Team challenge (S12-6). Runs after timesheet_approval_rules.sql; project 2...01 members: Pia manager b, Mo member c, Cy contributor d.
\set ON_ERROR_STOP on
set role authenticated;

-- A member cannot set the goal; nobody can write the table directly.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  begin perform public.set_team_goal('20000000-0000-0000-0000-000000000001', current_date, true); raise exception 'member set the goal';
  exception when insufficient_privilege then null; end;
  begin insert into public.team_goals values ('20000000-0000-0000-0000-000000000001', date_trunc('month', current_date)); raise exception 'direct write';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.team_goal_progress('20000000-0000-0000-0000-000000000001', current_date)) then raise exception 'progress without a goal'; end if;
end $$;

-- The manager sets it; members see progress as counts only.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.set_team_goal('20000000-0000-0000-0000-000000000001', current_date, true);
do $$ begin
  if (select weeks_done from public.team_goal_progress('20000000-0000-0000-0000-000000000001', current_date)) <> 0 then raise exception 'weeks done before anyone submitted'; end if;
end $$;
reset role;
set session_replication_role = replica; -- setup only: skip the week-lock trigger
insert into public.timesheet_weeks (project_id, user_id, week_start, submitted_at)
select '20000000-0000-0000-0000-000000000001', user_id, date_trunc('week', current_date)::date, date_trunc('week', current_date) + interval '1 day'
from public.project_members where project_id = '20000000-0000-0000-0000-000000000001'
on conflict (project_id, user_id, week_start) do update set submitted_at = excluded.submitted_at;
set session_replication_role = origin;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ declare r record; begin
  select * into r from public.team_goal_progress('20000000-0000-0000-0000-000000000001', current_date);
  if r.weeks_done < 1 or r.weeks_total < r.weeks_done then raise exception 'on-time week not counted: %', r; end if;
end $$;

-- A late submission does not count; outsiders and anon get nothing.
reset role;
set session_replication_role = replica;
update public.timesheet_weeks set submitted_at = date_trunc('week', current_date) + interval '6 days' where week_start = date_trunc('week', current_date)::date and user_id = '00000000-0000-0000-0000-00000000000c';
set session_replication_role = origin;
set role authenticated;
do $$ begin
  if (select weeks_done from public.team_goal_progress('20000000-0000-0000-0000-000000000001', current_date)) <> 0 then raise exception 'late week counted'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ee';
do $$ begin
  if exists (select 1 from public.team_goal_progress('20000000-0000-0000-0000-000000000001', current_date)) then raise exception 'outsider saw progress'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform * from public.team_goal_progress('20000000-0000-0000-0000-000000000001', current_date); raise exception 'anon ran progress';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
