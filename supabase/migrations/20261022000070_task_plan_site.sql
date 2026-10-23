-- Stage 8 S8-2: a site on each task; phase, parent, site and dependency changes are audited.
alter table public.tasks add column site text not null default '' check (length(site) <= 80);

-- Task owners may still change the status only, so the site joins the managers-only columns.
create or replace function public.limit_task_edits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.can_manage_project(old.project_id) then
    return new;
  end if;
  if old.owner_id is distinct from auth.uid() then
    raise exception 'only the task owner or a project manager can change this task'
      using errcode = 'insufficient_privilege';
  end if;
  if (new.project_id, new.phase_id, new.parent_id, new.title, new.owner_id, new.start_date,
      new.due_date, new.priority, new.cost_code, new.position, new.details, new.site)
     is distinct from
     (old.project_id, old.phase_id, old.parent_id, old.title, old.owner_id, old.start_date,
      old.due_date, old.priority, old.cost_code, old.position, old.details, old.site) then
    raise exception 'task owners can change the status only; ask a project manager for other changes'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create or replace function public.audit_task_edited() returns trigger
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
  if new.details is distinct from old.details then
    perform public.write_audit(new.project_id, 'details_changed', 'tasks', new.id, null);
  end if;
  if new.phase_id is distinct from old.phase_id then
    perform public.write_audit(new.project_id, 'phase_changed', 'tasks', new.id, null);
  end if;
  if new.parent_id is distinct from old.parent_id then
    perform public.write_audit(new.project_id, 'parent_changed', 'tasks', new.id, null);
  end if;
  if new.site is distinct from old.site then
    perform public.write_audit(new.project_id, 'site_changed', 'tasks', new.id, null);
  end if;
  return new;
end;
$$;

-- Adding or removing a dependency is logged against the successor task.
create function public.audit_dependency() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  succ uuid := coalesce(new.successor_id, old.successor_id);
begin
  -- A task that is being deleted takes its dependencies with it; nothing to log then.
  perform public.write_audit(t.project_id, case when tg_op = 'INSERT' then 'dependency_added' else 'dependency_removed' end, 'tasks', t.id, null)
  from tasks t where t.id = succ;
  return null;
end;
$$;

create trigger task_dependencies_audit
after insert or delete on public.task_dependencies
for each row execute function public.audit_dependency();

revoke execute on function public.audit_dependency() from public, anon, authenticated;
