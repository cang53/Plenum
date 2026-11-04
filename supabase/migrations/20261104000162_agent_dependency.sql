-- The agent can propose a finish-to-start dependency between two existing tasks. Accepting the card writes it to
-- task_dependencies (so the timeline shows it); undo removes it again. task_id is the task that waits (successor).
alter table public.agent_actions
  add column predecessor_id uuid references public.tasks (id) on delete cascade,
  add column created_dependency boolean not null default false;
alter table public.agent_actions drop constraint agent_actions_kind_check;
alter table public.agent_actions add constraint agent_actions_kind_check check (kind in ('create_task', 'update_task', 'add_dependency'));
alter table public.agent_actions add constraint agent_actions_dependency_check
  check (kind <> 'add_dependency' or (predecessor_id is not null and task_id is not null and predecessor_id <> task_id));

create or replace function public.propose_agent_actions(p_message uuid, p_actions jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare
  m messages;
  a jsonb;
  n integer := 0;
begin
  select * into m from messages where id = p_message;
  if m.id is null or not coalesce(public.can_see_project(m.project_id), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  for a in select * from jsonb_array_elements(p_actions) limit 10 loop
    if a ->> 'kind' in ('update_task', 'add_dependency') and not exists (select 1 from tasks t where t.id = (a ->> 'task_id')::uuid and t.project_id = m.project_id) then
      continue;
    end if;
    if a ->> 'kind' = 'add_dependency' and (a ->> 'predecessor_id' is null or a ->> 'predecessor_id' = a ->> 'task_id'
       or not exists (select 1 from tasks t where t.id = (a ->> 'predecessor_id')::uuid and t.project_id = m.project_id)) then
      continue;
    end if;
    insert into agent_actions (project_id, message_id, kind, task_id, predecessor_id, title, details, start_date, due_date, reason)
    values (m.project_id, m.id, a ->> 'kind', nullif(a ->> 'task_id', '')::uuid, nullif(a ->> 'predecessor_id', '')::uuid, a ->> 'title', coalesce(a ->> 'details', ''),
            nullif(a ->> 'start_date', '')::date, nullif(a ->> 'due_date', '')::date, a ->> 'reason');
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.resolve_agent_action(p_id uuid, p_accept boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a agent_actions;
  item uuid;
  ps date;
  pd date;
  added integer := 0;
begin
  select * into a from agent_actions where id = p_id for update;
  if a.id is null or a.status <> 'pending' or not coalesce(public.can_manage_project(a.project_id), false) then
    raise exception 'proposal not found or not allowed' using errcode = '42501';
  end if;
  if p_accept then
    if a.kind = 'create_task' then
      insert into tasks (project_id, source_message_id, title, details, start_date, due_date)
      values (a.project_id, a.message_id, a.title, a.details, a.start_date, a.due_date) returning id into item;
    elsif a.kind = 'add_dependency' then
      if not exists (select 1 from tasks where id = a.predecessor_id and project_id = a.project_id)
         or not exists (select 1 from tasks where id = a.task_id and project_id = a.project_id) then
        raise exception 'task not found';
      end if;
      insert into task_dependencies (predecessor_id, successor_id, kind) values (a.predecessor_id, a.task_id, 'FS') on conflict do nothing;
      get diagnostics added = row_count; -- 0 when the link already existed: undo must not remove someone else's link
      item := a.task_id;
    else
      select start_date, due_date into ps, pd from tasks where id = a.task_id and project_id = a.project_id;
      update tasks set start_date = coalesce(a.start_date, start_date), due_date = coalesce(a.due_date, due_date)
      where id = a.task_id and project_id = a.project_id returning id into item;
      if item is null then raise exception 'task not found'; end if;
    end if;
  end if;
  update agent_actions set status = case when p_accept then 'accepted' else 'dismissed' end, resolved_by = auth.uid(), resolved_at = now(),
    resolved_by_name = (select display_name from profiles where id = auth.uid()),
    prev_start_date = ps, prev_due_date = pd, created_task_id = case when a.kind = 'create_task' then item end,
    created_dependency = (added > 0)
  where id = p_id;
  return item;
end;
$$;

create or replace function public.undo_agent_action(p_id uuid) returns void
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
  elsif a.kind = 'add_dependency' then
    if a.created_dependency then delete from task_dependencies where predecessor_id = a.predecessor_id and successor_id = a.task_id; end if;
  else
    update tasks set start_date = a.prev_start_date, due_date = a.prev_due_date where id = a.task_id and project_id = a.project_id;
  end if;
  update agent_actions set status = 'undone', resolved_by = auth.uid(), resolved_at = now(),
    resolved_by_name = (select display_name from profiles where id = auth.uid()) where id = p_id;
end;
$$;
