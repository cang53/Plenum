-- Delete a project or remove a person (stage 5, S5-4). Workspace admins only; the audit entry is
-- written first and survives, because the log has no foreign keys.

-- Removing a person is not about one project.
alter table public.audit_log alter column project_id drop not null;

create function public.delete_project(p uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  select workspace_id into ws from projects where id = p;
  if ws is null or not public.is_workspace_admin(ws) then
    raise exception 'only a workspace admin can delete a project' using errcode = 'insufficient_privilege';
  end if;
  insert into audit_log (workspace_id, project_id, actor_id, action, entity_type, entity_id)
  values (ws, p, auth.uid(), 'deleted', 'projects', p);
  -- Everything inside the project goes with it (foreign keys cascade).
  delete from projects where id = p;
end;
$$;

-- Takes the person out of the workspace and all its projects and deletes their notifications.
-- Tasks they owned stay, unassigned. Their profile stays: it may belong to other workspaces.
create function public.remove_person(ws uuid, person uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_workspace_admin(ws) then
    raise exception 'only a workspace admin can remove a person' using errcode = 'insufficient_privilege';
  end if;
  if person = auth.uid() then
    raise exception 'you cannot remove yourself' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from workspace_members where workspace_id = ws and user_id = person)
     and not exists (select 1 from project_members pm join projects pr on pr.id = pm.project_id
                     where pr.workspace_id = ws and pm.user_id = person) then
    raise exception 'that person is not in this workspace';
  end if;
  insert into audit_log (workspace_id, actor_id, action, entity_type, entity_id)
  values (ws, auth.uid(), 'removed', 'people', person);
  update tasks set owner_id = null
  where owner_id = person and project_id in (select id from projects where workspace_id = ws);
  delete from notifications where user_id = person and project_id in (select id from projects where workspace_id = ws);
  delete from project_members where user_id = person and project_id in (select id from projects where workspace_id = ws);
  delete from workspace_members where workspace_id = ws and user_id = person;
end;
$$;

revoke execute on function public.delete_project(uuid), public.remove_person(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_project(uuid), public.remove_person(uuid, uuid) to authenticated;
