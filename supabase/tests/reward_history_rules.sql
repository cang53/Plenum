-- Reward history (S13-3). Runs after team_goal_rules.sql; project 2...01, Pia manager b, Mo member c.
\set ON_ERROR_STOP on
reset role;
insert into public.team_goals values ('20000000-0000-0000-0000-000000000001', date_trunc('month', current_date - interval '2 months')::date),
                                     ('20000000-0000-0000-0000-000000000001', date_trunc('month', current_date)::date)
on conflict do nothing;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ declare r record; n int; begin
  select count(*) into n from public.team_goal_history('20000000-0000-0000-0000-000000000001');
  if n <> 1 then raise exception 'expected only the past month, got %', n; end if;
  select * into r from public.team_goal_history('20000000-0000-0000-0000-000000000001');
  if r.month <> date_trunc('month', current_date - interval '2 months')::date or r.weeks_done <> 0 or r.weeks_total < 4 then raise exception 'bad history row: %', r; end if;
end $$;
-- Outsiders and anon get nothing.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ee';
do $$ begin
  if exists (select 1 from public.team_goal_history('20000000-0000-0000-0000-000000000001')) then raise exception 'outsider saw history'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform * from public.team_goal_history('20000000-0000-0000-0000-000000000001'); raise exception 'anon ran history';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
