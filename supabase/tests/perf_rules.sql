-- Performance budget (stage 9, S9-5). Runs last. A project with 10k messages must stay fast on the
-- timeline, board, Gantt and search, read as a member (row-level security applies).
\set ON_ERROR_STOP on
reset role;
insert into public.messages (project_id, external_id, from_address, from_name, subject, body_text, received_at)
select '20000000-0000-0000-0000-000000000001', 'perf-' || n, 'sender' || (n % 50) || '@example.com', 'Sender ' || (n % 50),
       'Update ' || n || case when n % 500 = 0 then ' crane' else '' end, 'Progress note about pour, rebar and inspection ' || n,
       now() - (n || ' minutes')::interval
from generate_series(1, 10000) n;
insert into public.tasks (project_id, title, start_date, due_date, position)
select '20000000-0000-0000-0000-000000000001', 'Perf task ' || n, current_date + n % 300, current_date + n % 300 + 5, n
from generate_series(1, 2000) n;
analyze public.messages;
analyze public.tasks;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

create temp table perf_ms (name text, ms numeric);
grant all on perf_ms to authenticated;
do $$
declare t timestamptz; budget_ms numeric; r record;
begin
  for r in select * from (values
    ('timeline', $q$select id from public.messages where project_id = '20000000-0000-0000-0000-000000000001' order by received_at desc, id desc limit 51$q$),
    ('timeline sender filter', $q$select id from public.messages where project_id = '20000000-0000-0000-0000-000000000001' and (from_address ilike '%sender7@%' or from_name ilike '%sender 7%') order by received_at desc limit 51$q$),
    ('board', $q$select id from public.tasks where project_id = '20000000-0000-0000-0000-000000000001' order by position$q$),
    ('gantt', $q$select id from public.tasks where project_id = '20000000-0000-0000-0000-000000000001' order by start_date nulls first$q$),
    ('search', $q$select * from public.search_project('20000000-0000-0000-0000-000000000001', 'crane')$q$)
  ) v(name, sql) loop
    -- Search ranks and highlights 10k bodies (about 300 ms on a quiet machine), so shared CI runners get more headroom.
    budget_ms := case when r.name = 'search' then 1500 else 500 end;
    t := clock_timestamp();
    execute r.sql;
    insert into perf_ms values (r.name, extract(milliseconds from clock_timestamp() - t));
    if (select ms from perf_ms where name = r.name) > budget_ms then
      raise exception '% took % ms, over the % ms budget', r.name, (select ms from perf_ms where name = r.name), budget_ms;
    end if;
  end loop;
end $$;
select * from perf_ms;
