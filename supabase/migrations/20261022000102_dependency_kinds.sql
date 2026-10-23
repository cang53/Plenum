-- Dependency import (S9-3): links keep their type and lag; a schedule import is logged once per project.
alter table public.task_dependencies
  add column kind text not null default 'FS' check (kind in ('FS', 'SS', 'FF', 'SF')),
  add column lag_days integer not null default 0 check (lag_days between -3650 and 3650);

create function public.audit_dependency_import(p_project uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_project(p_project) then raise exception 'not allowed'; end if;
  perform public.write_audit(p_project, 'imported dependencies', 'task_dependencies', p_project, null);
end;
$$;
revoke execute on function public.audit_dependency_import(uuid) from public, anon;
grant execute on function public.audit_dependency_import(uuid) to authenticated;
