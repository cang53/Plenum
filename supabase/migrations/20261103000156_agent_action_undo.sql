-- Accepted proposals stay visible with who accepted and when, and a manager can undo them.
-- Undo restores the previous dates (update_task) or removes the created task (create_task).
alter table public.agent_actions
  add column resolved_by_name text,
  add column prev_start_date date,
  add column prev_due_date date,
  add column created_task_id uuid;
alter table public.agent_actions drop constraint agent_actions_status_check;
alter table public.agent_actions add constraint agent_actions_status_check check (status in ('pending', 'accepted', 'dismissed', 'undone'));

create or replace function public.resolve_agent_action(p_id uuid, p_accept boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a agent_actions;
  item uuid;
  ps date;
  pd date;
begin
  select * into a from agent_actions where id = p_id for update;
  if a.id is null or a.status <> 'pending' or not coalesce(public.can_manage_project(a.project_id), false) then
    raise exception 'proposal not found or not allowed' using errcode = '42501';
  end if;
  if p_accept then
    if a.kind = 'create_task' then
      insert into tasks (project_id, source_message_id, title, details, start_date, due_date)
      values (a.project_id, a.message_id, a.title, a.details, a.start_date, a.due_date) returning id into item;
    else
      select start_date, due_date into ps, pd from tasks where id = a.task_id and project_id = a.project_id;
      update tasks set start_date = coalesce(a.start_date, start_date), due_date = coalesce(a.due_date, due_date)
      where id = a.task_id and project_id = a.project_id returning id into item;
      if item is null then raise exception 'task not found'; end if;
    end if;
  end if;
  update agent_actions set status = case when p_accept then 'accepted' else 'dismissed' end, resolved_by = auth.uid(), resolved_at = now(),
    resolved_by_name = (select display_name from profiles where id = auth.uid()),
    prev_start_date = ps, prev_due_date = pd, created_task_id = case when a.kind = 'create_task' then item end
  where id = p_id;
  return item;
end;
$$;

create function public.undo_agent_action(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a agent_actions;
begin
  select * into a from agent_actions where id = p_id for update;
  if a.id is null or a.status <> 'accepted' or not coalesce(public.can_manage_project(a.project_id), false) then
    raise exception 'proposal not found or not allowed' using errcode = '42501';
  end if;
  if a.kind = 'create_task' then
    delete from tasks where id = a.created_task_id and project_id = a.project_id;
  else
    update tasks set start_date = a.prev_start_date, due_date = a.prev_due_date where id = a.task_id and project_id = a.project_id;
  end if;
  update agent_actions set status = 'undone', resolved_by = auth.uid(), resolved_at = now(),
    resolved_by_name = (select display_name from profiles where id = auth.uid()) where id = p_id;
end;
$$;
revoke execute on function public.undo_agent_action from public, anon;
grant execute on function public.undo_agent_action to authenticated;
