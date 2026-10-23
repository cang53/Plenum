-- S10-7: a task can be marked as a milestone; the Gantt draws it as a diamond. Managers only, audited.
alter table public.tasks add column is_milestone boolean not null default false;

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
      new.due_date, new.priority, new.cost_code, new.position, new.details, new.site, new.is_milestone)
     is distinct from
     (old.project_id, old.phase_id, old.parent_id, old.title, old.owner_id, old.start_date,
      old.due_date, old.priority, old.cost_code, old.position, old.details, old.site, old.is_milestone) then
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
  if new.is_milestone is distinct from old.is_milestone then
    perform public.write_audit(new.project_id, 'milestone_changed', 'tasks', new.id, null);
  end if;
  return new;
end;
$$;
