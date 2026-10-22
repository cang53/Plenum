-- Stage 7 (S7-2): search that ranks, stems English and Dutch, highlights, and filters by date or linked task.

-- Title (a) counts most, then body (b), then sender (c). English and Dutch stems sit in one vector.
create function public.search_vec(a text, b text, c text default '') returns tsvector
language sql immutable parallel safe as $$
  select setweight(to_tsvector('english', coalesce(a, '')) || to_tsvector('dutch', coalesce(a, '')), 'A')
      || setweight(to_tsvector('english', coalesce(b, '')) || to_tsvector('dutch', coalesce(b, '')), 'B')
      || setweight(to_tsvector('english', coalesce(c, '')) || to_tsvector('dutch', coalesce(c, '')), 'C');
$$;

create function public.search_query(q text) returns tsquery
language sql immutable parallel safe as $$
  select websearch_to_tsquery('english', q) || websearch_to_tsquery('dutch', q);
$$;

-- Marks matches with control characters (the text may hold any markup). The language that matched wins.
create function public.search_snippet(doc text, tsq tsquery) returns text
language sql immutable parallel safe as $$
  select case when en like '%' || chr(2) || '%' then en when nl like '%' || chr(2) || '%' then nl else en end
  from (select
    ts_headline('english', doc, tsq, 'StartSel=' || chr(2) || ',StopSel=' || chr(3) || ',MaxFragments=1,MaxWords=20,MinWords=5') as en,
    ts_headline('dutch', doc, tsq, 'StartSel=' || chr(2) || ',StopSel=' || chr(3) || ',MaxFragments=1,MaxWords=20,MinWords=5') as nl) h;
$$;

drop index public.messages_search;
create index messages_search on public.messages
  using gin (public.search_vec(subject, body_text, coalesce(from_name, '') || ' ' || from_address));

drop function public.search_project(uuid, text, int);
-- `since` and `until` are whole days (inclusive); `task` keeps that task and the message it came from.
create function public.search_project(p uuid, q text, skip int default 0, since date default null, until date default null, task uuid default null)
returns table (kind text, id uuid, title text, snippet text)
language sql stable security invoker set search_path = public as $$
  with query as (select search_query(q) as tsq)
  select r.kind, r.id, r.title, r.snippet from (
    select 'task' as kind, t.id, t.title, search_snippet(t.details, query.tsq) as snippet,
           ts_rank_cd(search_vec(t.title, t.details), query.tsq) as rank
    from tasks t, query
    where t.project_id = p and search_vec(t.title, t.details) @@ query.tsq
      and (since is null or t.created_at >= since) and (until is null or t.created_at < until + 1)
      and (task is null or t.id = task)
    union all
    select 'message', m.id, m.subject, search_snippet(m.body_text, query.tsq),
           ts_rank_cd(search_vec(m.subject, m.body_text, coalesce(m.from_name, '') || ' ' || m.from_address), query.tsq)
    from messages m, query
    where m.project_id = p
      and search_vec(m.subject, m.body_text, coalesce(m.from_name, '') || ' ' || m.from_address) @@ query.tsq
      and (since is null or m.received_at >= since) and (until is null or m.received_at < until + 1)
      and (task is null or m.id = (select source_message_id from tasks where id = task))
    union all
    select 'decision', d.id, d.title, search_snippet(d.details, query.tsq),
           ts_rank_cd(search_vec(d.title, d.details), query.tsq)
    from decisions d, query
    where d.project_id = p and search_vec(d.title, d.details) @@ query.tsq
      and (since is null or d.created_at >= since) and (until is null or d.created_at < until + 1)
      and task is null
  ) r
  order by r.rank desc, r.kind, r.id
  offset greatest(skip, 0) limit 51;
$$;

-- A replaced function loses its grants: signed-in people only, as before.
revoke execute on function public.search_project(uuid, text, int, date, date, uuid) from public, anon;
grant execute on function public.search_project(uuid, text, int, date, date, uuid) to authenticated;
