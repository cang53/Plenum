-- Document and drawing links (S9-9): a manager tags an attachment with a type, a document number and a revision.
-- The newest revision of a document number is the one on the latest message; older ones are superseded.
alter table public.message_attachments
  add column doc_type text check (doc_type in ('drawing', 'specification', 'permit', 'report', 'other')),
  add column doc_ref text check (doc_ref <> ''),
  add column revision text check (revision <> ''),
  add constraint revision_needs_ref check (revision is null or doc_ref is not null);
create index on public.message_attachments (lower(doc_ref)) where doc_ref is not null;

create function public.tag_attachment(p_attachment uuid, p_type text, p_ref text, p_revision text) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select m.project_id into pid from message_attachments a join messages m on m.id = a.message_id where a.id = p_attachment;
  if pid is null or not public.can_manage_project(pid) then raise exception 'not allowed'; end if;
  update message_attachments
    set doc_type = nullif(trim(p_type), ''), doc_ref = nullif(trim(p_ref), ''), revision = nullif(trim(p_revision), '')
    where id = p_attachment;
  perform write_audit(pid, 'attachment_tagged', 'message_attachments', p_attachment, null);
end;
$$;
revoke execute on function public.tag_attachment(uuid, text, text, text) from public, anon;
grant execute on function public.tag_attachment(uuid, text, text, text) to authenticated;

-- Computed column (select it as `superseded`): a later message in the project carries the same document number.
create function public.superseded(a public.message_attachments) returns boolean
language sql stable security invoker set search_path = public as $$
  select a.doc_ref is not null and exists (
    select 1 from messages m0, message_attachments b join messages mb on mb.id = b.message_id
    where m0.id = a.message_id and mb.project_id = m0.project_id and lower(b.doc_ref) = lower(a.doc_ref)
      and (mb.received_at, b.id) > (m0.received_at, a.id));
$$;

-- Search also finds (punctuation becomes spaces so file names and numbers split into words) tagged documents by file name, type, number or revision.
create or replace function public.search_project(p uuid, q text, skip int default 0, since date default null, until date default null, task uuid default null)
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
    union all
    select 'document', a.id, a.filename, null,
           ts_rank_cd(search_vec(regexp_replace(a.filename, '[._-]+', ' ', 'g'), concat_ws(' ', a.doc_type, regexp_replace(a.doc_ref, '[._-]+', ' ', 'g'), a.revision)), query.tsq)
    from message_attachments a join messages m on m.id = a.message_id, query
    where m.project_id = p and a.doc_ref is not null
      and search_vec(regexp_replace(a.filename, '[._-]+', ' ', 'g'), concat_ws(' ', a.doc_type, regexp_replace(a.doc_ref, '[._-]+', ' ', 'g'), a.revision)) @@ query.tsq
      and (since is null or m.received_at >= since) and (until is null or m.received_at < until + 1)
      and task is null
  ) r
  order by r.rank desc, r.kind, r.id
  offset greatest(skip, 0) limit 51;
$$;
