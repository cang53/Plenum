-- Paging rules (stage 7, S7-1). 10,000 messages; Pia is a manager of project 1.
\set ON_ERROR_STOP on
reset role;
insert into public.messages (project_id, external_id, from_address, subject, body_text, received_at)
select '20000000-0000-0000-0000-000000000001', 'page-' || n, 'p@example.com', 'Bulk ' || n, 'bulk body ' || n,
       timestamptz '2026-01-01' + (n / 3) * interval '1 minute'  -- three messages share each minute, so the id tie-break matters
from generate_series(1, 10000) n;
analyze public.messages;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

create temp table page (id uuid, received_at timestamptz);
grant all on page to authenticated;
do $$
declare
  seen int := 0; pages int := 0; last_at timestamptz; last_id uuid; got int; line text; plan text := '';
  t0 timestamptz := clock_timestamp();
begin
  loop
    truncate page;
    insert into page
      select id, received_at from public.messages
      where project_id = '20000000-0000-0000-0000-000000000001' and external_id like 'page-%'
        and (last_at is null or (received_at, id) < (last_at, last_id))
      order by received_at desc, id desc limit 50;
    select count(*) into got from page;
    exit when got = 0;
    select received_at, id into last_at, last_id from page order by received_at, id limit 1;
    seen := seen + got; pages := pages + 1;
  end loop;
  -- Every message exactly once: 200 full pages, none repeated or skipped across the ties.
  if seen <> 10000 or pages <> 200 then raise exception 'paging walked % rows in % pages', seen, pages; end if;
  if clock_timestamp() - t0 > interval '10 seconds' then raise exception 'paging 10k messages was too slow'; end if;

  -- A page deep into the list still uses the paging index instead of sorting the project.
  for line in execute format($q$explain select id from public.messages
      where project_id = '20000000-0000-0000-0000-000000000001' and (received_at, id) < (%L, %L)
      order by received_at desc, id desc limit 51$q$, last_at + interval '1 day', last_id)
  loop plan := plan || line || E'\n'; end loop;
  if plan not like '%messages_page%' or plan like '%Sort%' then raise exception E'page query did not use the paging index:\n%', plan; end if;
end $$;

-- Search pages: the extra row says there is more, and skip moves along without overlap.
do $$ begin
  if (select count(*) from public.search_project('20000000-0000-0000-0000-000000000001', 'bulk')) <> 51 then
    raise exception 'search page should return 50 plus one';
  end if;
  if (select count(distinct id) from (
        select id from public.search_project('20000000-0000-0000-0000-000000000001', 'bulk', 0) limit 50) a
      join (select id from public.search_project('20000000-0000-0000-0000-000000000001', 'bulk', 50) limit 50) b using (id)) <> 0 then
    raise exception 'search pages overlap';
  end if;
end $$;
