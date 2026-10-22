-- Audit log (backlog task 15): every approval (accepting or dismissing a suggestion) and every item
-- a person makes from a message is recorded by the database itself. Rows are append-only. Sends
-- (tasks 12 and 14) will add rows through public.write_audit when they exist.

create table public.audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  project_id uuid not null,
  actor_id uuid,
  action text not null check (length(trim(action)) > 0),
  entity_type text not null,
  entity_id uuid not null,
  source_message_id uuid,
  created_at timestamptz not null default now()
);
-- No foreign keys: the log outlives the things it describes.
create index on public.audit_log (workspace_id, created_at);
create index on public.audit_log (project_id, created_at);

alter table public.audit_log enable row level security;

-- Project managers read their project's log; workspace admins read the whole workspace (for export).
create policy "managers and admins read the audit log" on public.audit_log
for select using (public.can_manage_project(project_id) or public.is_workspace_admin(workspace_id));
grant select on public.audit_log to authenticated;

-- Written only by the database (and the service role); nobody can change or remove a row.
create function public.write_audit(p uuid, act text, etype text, eid uuid, msg uuid) returns void
language sql security definer set search_path = public as $$
  insert into audit_log (workspace_id, project_id, actor_id, action, entity_type, entity_id, source_message_id)
  select workspace_id, p, auth.uid(), act, etype, eid, msg from projects where id = p;
$$;

create function public.audit_item_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.write_audit(new.project_id, 'created', tg_table_name, new.id, new.source_message_id);
  return new;
end;
$$;

create function public.audit_suggestion_decided() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> old.status then
    perform public.write_audit(new.project_id, new.status, 'suggestions', new.id, new.message_id);
  end if;
  return new;
end;
$$;

create function public.audit_log_is_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'the audit log cannot be changed';
end;
$$;

create trigger tasks_audit after insert on public.tasks
for each row when (new.source_message_id is not null) execute function public.audit_item_created();
create trigger decisions_audit after insert on public.decisions
for each row execute function public.audit_item_created();
create trigger risks_audit after insert on public.risks
for each row execute function public.audit_item_created();
create trigger change_requests_audit after insert on public.change_requests
for each row execute function public.audit_item_created();
create trigger suggestions_audit after update on public.suggestions
for each row execute function public.audit_suggestion_decided();
create trigger audit_log_no_change before update or delete on public.audit_log
for each row execute function public.audit_log_is_append_only();
create trigger audit_log_no_truncate before truncate on public.audit_log
for each statement execute function public.audit_log_is_append_only();

-- Like the other helper functions (migration 4), none of these is an API call for anyone.
revoke execute on function public.write_audit(uuid, text, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.audit_item_created() from public, anon, authenticated;
revoke execute on function public.audit_suggestion_decided() from public, anon, authenticated;
revoke execute on function public.audit_log_is_append_only() from public, anon, authenticated;

-- The email-send code runs as the service role and logs through write_audit, so grant it explicitly.
grant execute on function public.write_audit(uuid, text, text, uuid, uuid) to service_role;
