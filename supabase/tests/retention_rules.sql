-- Retention rules (S7-10): the purge empties only expired messages, audits it, and is server-only.
\set ON_ERROR_STOP on
do $$
declare ws uuid := gen_random_uuid(); pr uuid := gen_random_uuid(); old_m uuid := gen_random_uuid(); new_m uuid := gen_random_uuid(); n int;
begin
  insert into workspaces (id, name, retention_days) values (ws, 'Retention Co', 30);
  insert into projects (id, workspace_id, name, email_slug) values (pr, ws, 'P', 'retention-p');
  insert into messages (id, project_id, external_id, from_address, body_text, raw_location, received_at)
    values (old_m, pr, 'a', 'a@x.com', 'secret', 's3://b/a', now() - interval '40 days'),
           (new_m, pr, 'b', 'b@x.com', 'recent', 's3://b/b', now() - interval '5 days');
  insert into message_attachments (message_id, part_index, filename, content_type, size_bytes) values (old_m, 0, 'f.pdf', 'application/pdf', 1);
  if purge_expired_messages() <> 1 then raise exception 'wrong purge count'; end if;
  if (select body_text || coalesce(raw_location, '') from messages where id = old_m) <> '' then raise exception 'old message not emptied'; end if;
  if (select body_text from messages where id = new_m) <> 'recent' then raise exception 'recent message purged'; end if;
  select count(*) into n from message_attachments where message_id = old_m;
  if n <> 0 then raise exception 'attachments kept'; end if;
  select count(*) into n from audit_log where action = 'purged' and entity_id = old_m;
  if n <> 1 then raise exception 'purge not audited'; end if;
  if purge_expired_messages() <> 0 then raise exception 'purge not idempotent'; end if;
  begin
    update workspaces set retention_days = 7 where id = ws;
    raise exception 'accepted retention under 30 days';
  exception when check_violation then null;
  end;
end $$;

set role authenticated;
do $$ begin
  begin perform purge_expired_messages(); raise exception 'signed-in user ran the purge';
  exception when insufficient_privilege then null; end;
end $$;
