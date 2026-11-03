-- The project agent (MVP). A person tags the agent in the stream, optionally with a meeting note; the agent answers in the
-- stream and proposes changes to tasks. Nothing changes until a project manager accepts: apply_agent_action does the change,
-- records who decided, and the task keeps its link to the message the proposal came from.

create table public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  message_id uuid not null,
  kind text not null check (kind in ('create_task', 'update_task')),
  task_id uuid references public.tasks (id) on delete cascade,
  title text not null check (length(trim(title)) > 0 and length(title) <= 200),
  details text not null default '' check (length(details) <= 1000),
  start_date date,
  due_date date,
  reason text not null check (length(trim(reason)) > 0 and length(reason) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (message_id, project_id) references public.messages (id, project_id) on delete cascade,
  check (kind = 'create_task' or task_id is not null),
  check (start_date is null or due_date is null or start_date <= due_date)
);
create index on public.agent_actions (project_id, status);

alter table public.agent_actions enable row level security;
create policy "see agent actions of your projects" on public.agent_actions for select using (public.can_see_project(project_id));
revoke all on public.agent_actions from anon, authenticated;
grant select on public.agent_actions to authenticated;

-- The agent's answer, written into the stream as "Plenum agent". The caller must be on the project and the message answered must belong to it.
create function public.post_agent_reply(p_message uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  m messages;
  v_id uuid;
begin
  select * into m from messages where id = p_message;
  if m.id is null or not coalesce(public.can_see_project(m.project_id), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if btrim(coalesce(p_body, '')) = '' then
    raise exception 'reply is empty' using errcode = '22023';
  end if;
  insert into messages (project_id, source, external_id, from_name, from_address, subject, body_text, sent_at)
  values (m.project_id, 'app', 'agent:' || gen_random_uuid(), 'Plenum agent', 'agent@plenum.app', '', left(btrim(p_body), 4000), now())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.post_agent_reply from public, anon;
grant execute on function public.post_agent_reply to authenticated;

-- Stores the agent's proposals for one message, at most 10. An update must name a task of the same project.
create function public.propose_agent_actions(p_message uuid, p_actions jsonb) returns integer
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
    if a ->> 'kind' = 'update_task' and not exists (select 1 from tasks t where t.id = (a ->> 'task_id')::uuid and t.project_id = m.project_id) then
      continue;
    end if;
    insert into agent_actions (project_id, message_id, kind, task_id, title, details, start_date, due_date, reason)
    values (m.project_id, m.id, a ->> 'kind', nullif(a ->> 'task_id', '')::uuid, a ->> 'title', coalesce(a ->> 'details', ''),
            nullif(a ->> 'start_date', '')::date, nullif(a ->> 'due_date', '')::date, a ->> 'reason');
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.propose_agent_actions from public, anon;
grant execute on function public.propose_agent_actions to authenticated;

-- The person's click. Accept makes the change (a managers-only step); dismiss only closes the proposal. Decided once.
create function public.resolve_agent_action(p_id uuid, p_accept boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a agent_actions;
  item uuid;
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
      update tasks set start_date = coalesce(a.start_date, start_date), due_date = coalesce(a.due_date, due_date)
      where id = a.task_id and project_id = a.project_id returning id into item;
      if item is null then raise exception 'task not found'; end if;
    end if;
  end if;
  update agent_actions set status = case when p_accept then 'accepted' else 'dismissed' end, resolved_by = auth.uid(), resolved_at = now() where id = p_id;
  return item;
end;
$$;
revoke execute on function public.resolve_agent_action from public, anon;
grant execute on function public.resolve_agent_action to authenticated;
