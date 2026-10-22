-- Audit log, part 2: record who changed a task's status, dates or owner (the spec's "who changed each task").
create function public.audit_task_edited() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public.write_audit(new.project_id, 'status_changed', 'tasks', new.id, null);
  end if;
  if (new.start_date, new.due_date) is distinct from (old.start_date, old.due_date) then
    perform public.write_audit(new.project_id, 'dates_changed', 'tasks', new.id, null);
  end if;
  if new.owner_id is distinct from old.owner_id then
    perform public.write_audit(new.project_id, 'owner_changed', 'tasks', new.id, null);
  end if;
  return new;
end;
$$;

create trigger tasks_audit_edit after update on public.tasks
for each row execute function public.audit_task_edited();

revoke execute on function public.audit_task_edited() from public, anon, authenticated;

-- Security Advisor: pin the search path of the append-only guard too.
alter function public.audit_log_is_append_only() set search_path = '';
