-- Data export (stage 5, S5-3): a workspace admin gets every project's data as one JSON document.
-- Each export is logged in the audit log (project_id holds the workspace id: the log has no foreign keys).
create function public.export_workspace(ws uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[];
  result jsonb;
begin
  if not public.is_workspace_admin(ws) then
    raise exception 'only a workspace admin can export' using errcode = 'insufficient_privilege';
  end if;
  select array_agg(id) into ids from projects where workspace_id = ws;
  ids := coalesce(ids, '{}');
  select jsonb_build_object(
    'exported_at', now(),
    'projects', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from projects x where x.workspace_id = ws),
    'project_members', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from project_members x where x.project_id = any (ids)),
    'phases', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from phases x where x.project_id = any (ids)),
    'tasks', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from tasks x where x.project_id = any (ids)),
    'task_dependencies', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from task_dependencies x
      join tasks t on t.id = x.predecessor_id where t.project_id = any (ids)),
    'messages', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from messages x where x.project_id = any (ids)),
    'decisions', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from decisions x where x.project_id = any (ids)),
    'risks', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from risks x where x.project_id = any (ids)),
    'change_requests', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from change_requests x where x.project_id = any (ids)),
    'suggestions', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from suggestions x where x.project_id = any (ids)),
    'audit_log', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from audit_log x where x.workspace_id = ws)
  ) into result;
  insert into audit_log (workspace_id, project_id, actor_id, action, entity_type, entity_id)
  values (ws, ws, auth.uid(), 'exported', 'workspaces', ws);
  return result;
end;
$$;
revoke execute on function public.export_workspace(uuid) from public, anon;
grant execute on function public.export_workspace(uuid) to authenticated;
