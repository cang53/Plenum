-- Project search (stage 4, S4-4). One query over tasks, messages and decisions. The function runs
-- with the caller's rights, so row-level security decides what each person can find.

create index tasks_search on public.tasks using gin (to_tsvector('simple', title || ' ' || details));
create index messages_search on public.messages using gin (to_tsvector('simple', subject || ' ' || body_text));
create index decisions_search on public.decisions using gin (to_tsvector('simple', title || ' ' || details));

create function public.search_project(p uuid, q text)
returns table (kind text, id uuid, title text, snippet text)
language sql stable security invoker set search_path = public as $$
  with query as (select websearch_to_tsquery('simple', q) as tsq)
  select * from (
    select 'task', t.id, t.title, ts_headline('simple', t.details, query.tsq, 'MaxFragments=1,MaxWords=20,MinWords=5')
    from tasks t, query where t.project_id = p and to_tsvector('simple', t.title || ' ' || t.details) @@ query.tsq
    union all
    select 'message', m.id, m.subject, ts_headline('simple', m.body_text, query.tsq, 'MaxFragments=1,MaxWords=20,MinWords=5')
    from messages m, query where m.project_id = p and to_tsvector('simple', m.subject || ' ' || m.body_text) @@ query.tsq
    union all
    select 'decision', d.id, d.title, ts_headline('simple', d.details, query.tsq, 'MaxFragments=1,MaxWords=20,MinWords=5')
    from decisions d, query where d.project_id = p and to_tsvector('simple', d.title || ' ' || d.details) @@ query.tsq
  ) r(kind, id, title, snippet)
  limit 50;
$$;
revoke execute on function public.search_project(uuid, text) from public, anon;
grant execute on function public.search_project(uuid, text) to authenticated;
