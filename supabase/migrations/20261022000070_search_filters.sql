-- Search by date range and linked task (S8-5). `d_from` and `d_to` are days, both included;
-- `linked` limits results to that task and the message it came from.
drop function public.search_project(uuid, text, int);
create function public.search_project(p uuid, q text, skip int default 0, d_from date default null, d_to date default null, linked uuid default null)
returns table (kind text, id uuid, title text, snippet text)
language sql stable security invoker set search_path = public as $$
  with query as (select websearch_to_tsquery('simple', q) as tsq),
       lk as (select t.id, t.source_message_id from tasks t where t.id = linked and t.project_id = p)
  select * from (
    select 'task', t.id, t.title, ts_headline('simple', t.details, query.tsq, 'MaxFragments=1,MaxWords=20,MinWords=5')
    from tasks t, query where t.project_id = p and to_tsvector('simple', t.title || ' ' || t.details) @@ query.tsq
      and (d_from is null or t.created_at >= d_from) and (d_to is null or t.created_at < d_to + 1)
      and (linked is null or t.id = linked)
    union all
    select 'message', m.id, m.subject, ts_headline('simple', m.body_text, query.tsq, 'MaxFragments=1,MaxWords=20,MinWords=5')
    from messages m, query
    where m.project_id = p
      and to_tsvector('simple', m.subject || ' ' || m.body_text || ' ' || coalesce(m.from_name, '') || ' ' || m.from_address) @@ query.tsq
      and (d_from is null or m.received_at >= d_from) and (d_to is null or m.received_at < d_to + 1)
      and (linked is null or m.id in (select source_message_id from lk))
    union all
    select 'decision', d.id, d.title, ts_headline('simple', d.details, query.tsq, 'MaxFragments=1,MaxWords=20,MinWords=5')
    from decisions d, query where d.project_id = p and to_tsvector('simple', d.title || ' ' || d.details) @@ query.tsq
      and (d_from is null or d.created_at >= d_from) and (d_to is null or d.created_at < d_to + 1)
      and linked is null
  ) r(kind, id, title, snippet)
  order by r.kind, r.id
  offset greatest(skip, 0) limit 51;
$$;

revoke execute on function public.search_project(uuid, text, int, date, date, uuid) from public, anon;
grant execute on function public.search_project(uuid, text, int, date, date, uuid) to authenticated;
