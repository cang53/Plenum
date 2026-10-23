-- Retention (S7-10): a workspace can keep raw email content for a set number of days (null = keep).
-- The purge empties the message text, forgets the raw email location and drops attachment records;
-- the message row stays so items and the audit log still link to their source. Each purge is audited.
alter table public.workspaces add column retention_days int check (retention_days is null or retention_days >= 30);
alter table public.messages add column purged_at timestamptz;

create function public.purge_expired_messages() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select m.id, m.project_id from messages m
    join projects p on p.id = m.project_id
    join workspaces w on w.id = p.workspace_id
    where m.purged_at is null and w.retention_days is not null
      and m.received_at < now() - make_interval(days => w.retention_days)
    for update of m skip locked
  loop
    delete from message_attachments where message_id = r.id;
    update messages set body_text = '', raw_location = null, purged_at = now() where id = r.id;
    perform write_audit(r.project_id, 'purged', 'messages', r.id, r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.purge_expired_messages() from public, anon, authenticated;
grant execute on function public.purge_expired_messages() to service_role;
