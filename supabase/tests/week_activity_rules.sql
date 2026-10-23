-- Week activity (S11-6). Runs after timesheet_approval_rules.sql; project 2...01 members: Pia manager b, Mo member c.
\set ON_ERROR_STOP on
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.tasks set owner_id = '00000000-0000-0000-0000-00000000000c'
  where id = '40000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  if (select count(*) from public.my_week_activity('20000000-0000-0000-0000-000000000001', current_date - 1, current_date + 1)) <> 1 then raise exception 'owner does not see own activity'; end if;
  if exists (select 1 from public.my_week_activity('20000000-0000-0000-0000-000000000001', current_date + 7, current_date + 14)) then raise exception 'activity outside the range returned'; end if;
end $$;

-- A colleague, even the manager, gets nothing for someone else's tasks.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if exists (select 1 from public.my_week_activity('20000000-0000-0000-0000-000000000001', current_date - 1, current_date + 1)) then raise exception 'activity of another person returned'; end if;
end $$;

-- Anonymous callers cannot run it.
reset role;
set role anon;
do $$ begin
  begin
    perform * from public.my_week_activity('20000000-0000-0000-0000-000000000001', current_date - 1, current_date + 1);
    raise exception 'anon ran my_week_activity';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
