-- Stage 8 S8-4: a manager creates a project from a past one. Phases, tasks and dependencies are
-- copied; messages, owners, dates and progress are not. Security definer (it writes the audit log), so it checks the caller itself.
create function public.create_project_from(source uuid, project_name text, slug text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  dest uuid := gen_random_uuid();
  ws uuid;
begin
  if not public.can_manage_project(source) then
    raise exception 'only a manager of the source project can use it as a template'
      using errcode = 'insufficient_privilege';
  end if;
  select workspace_id into ws from projects where id = source;
  if not public.is_workspace_staff(ws) then
    raise exception 'only workspace staff can create a project' using errcode = 'insufficient_privilege';
  end if;
  insert into projects (id, workspace_id, name, email_slug, created_by)
  values (dest, ws, project_name, slug, auth.uid());

  create temp table phase_map as
    select id as old_id, gen_random_uuid() as new_id from phases where project_id = source;
  insert into phases (id, project_id, name, position)
  select m.new_id, dest, p.name, p.position from phases p join phase_map m on m.old_id = p.id;

  create temp table task_map as
    select id as old_id, gen_random_uuid() as new_id from tasks where project_id = source;
  -- Parents first: subtasks point at a task that must already exist.
  insert into tasks (id, project_id, phase_id, parent_id, title, priority, cost_code, site, details, position)
  select m.new_id, dest, pm.new_id, null, t.title, t.priority, t.cost_code, t.site, t.details, t.position
  from tasks t join task_map m on m.old_id = t.id left join phase_map pm on pm.old_id = t.phase_id
  where t.parent_id is null;
  insert into tasks (id, project_id, phase_id, parent_id, title, priority, cost_code, site, details, position)
  select m.new_id, dest, pm.new_id, par.new_id, t.title, t.priority, t.cost_code, t.site, t.details, t.position
  from tasks t join task_map m on m.old_id = t.id join task_map par on par.old_id = t.parent_id
  left join phase_map pm on pm.old_id = t.phase_id
  where t.parent_id is not null;
  insert into task_dependencies (predecessor_id, successor_id)
  select a.new_id, b.new_id from task_dependencies d
  join task_map a on a.old_id = d.predecessor_id join task_map b on b.old_id = d.successor_id;

  perform public.write_audit(dest, 'created_from_template', 'projects', source, null);
  drop table phase_map, task_map;
  return dest;
end;
$$;
revoke execute on function public.create_project_from(uuid, text, text) from public, anon;
grant execute on function public.create_project_from(uuid, text, text) to authenticated;
