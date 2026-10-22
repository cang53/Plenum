-- Stage 7 (S7-1): lists page by cursor, 50 at a time, newest first, with (time desc, id desc) as the key.
-- These indexes match that order so a page costs the same at 10 or 10,000 rows.

create index messages_page on public.messages (project_id, received_at desc, id desc);
create index audit_log_page on public.audit_log (project_id, created_at desc, id desc);
create index notifications_page on public.notifications (project_id, created_at desc, id desc);
create index tasks_page on public.tasks (project_id, created_at desc, id desc);
create index decisions_page on public.decisions (project_id, created_at desc, id desc);
create index risks_page on public.risks (project_id, created_at desc, id desc);
-- Replaced by the wider ones above (same leading columns).
drop index public.messages_project_id_received_at_idx;

-- Search pages too: `skip` hits already shown, one extra row says there is more. Order is fixed so pages do not overlap.
drop function public.search_project(uuid, text);
create function public.search_project(p uuid, q text, skip int default 0)
returns table (kind text, id uuid, title text, snippet text)
language sql stable security invoker set search_path = public as $$
  with query as (select websearch_to_tsquery('simple', q) as tsq)
  select * from (
    select 'task', t.id, t.title, ts_headline('simple', t.details, query.tsq, 'MaxFragments=1,MaxWords=20,MinWords=5')
    from tasks t, query where t.project_id = p and to_tsvector('simple', t.title || ' ' || t.details) @@ query.tsq
    union all
    select 'message', m.id, m.subject, ts_headline('simple', m.body_text, query.tsq, 'MaxFragments=1,MaxWords=20,MinWords=5')
    from messages m, query
    where m.project_id = p
      and to_tsvector('simple', m.subject || ' ' || m.body_text || ' ' || coalesce(m.from_name, '') || ' ' || m.from_address) @@ query.tsq
    union all
    select 'decision', d.id, d.title, ts_headline('simple', d.details, query.tsq, 'MaxFragments=1,MaxWords=20,MinWords=5')
    from decisions d, query where d.project_id = p and to_tsvector('simple', d.title || ' ' || d.details) @@ query.tsq
  ) r(kind, id, title, snippet)
  order by r.kind, r.id
  offset greatest(skip, 0) limit 51;
$$;
