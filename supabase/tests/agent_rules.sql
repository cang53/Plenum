-- Rules for the project agent: it speaks in the stream, proposes, and only a manager's click changes a task.
\set ON_ERROR_STOP on

insert into public.messages (id, project_id, external_id, from_address)
values ('5a000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', '<agent-src@mail.example>', 'x@mail.example');
insert into public.tasks (id, project_id, title, start_date, due_date)
values ('7a000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'Pour slab', '2026-11-02', '2026-11-06');

set role authenticated;

do $$
declare a uuid; b uuid; item uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  -- A member may ask the agent and see proposals, but not accept them.
  perform public.post_agent_reply('5a000000-0000-0000-0000-0000000000a1', 'I found 2 actions.');
  if (select count(*) from public.messages where from_name = 'Plenum agent' and project_id = '20000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'agent reply missing';
  end if;
  perform public.propose_agent_actions('5a000000-0000-0000-0000-0000000000a1', jsonb_build_array(
    jsonb_build_object('kind', 'create_task', 'title', 'Order rebar', 'reason', 'Note says so', 'start_date', '2026-11-10', 'due_date', '2026-11-12'),
    jsonb_build_object('kind', 'update_task', 'task_id', '7a000000-0000-0000-0000-0000000000a1', 'title', 'Pour slab', 'reason', 'Note says move', 'start_date', '2026-11-09', 'due_date', '2026-11-13'),
    jsonb_build_object('kind', 'update_task', 'task_id', '7a000000-0000-0000-0000-0000000000ff', 'title', 'Unknown', 'reason', 'x')));
  if (select count(*) from public.agent_actions where status = 'pending') <> 2 then
    raise exception 'expected two proposals; an unknown task must be skipped';
  end if;
  select id into a from public.agent_actions where kind = 'create_task';
  select id into b from public.agent_actions where kind = 'update_task';
  begin
    perform public.resolve_agent_action(a, true);
    raise exception 'a member accepted a proposal';
  exception when insufficient_privilege then null;
  end;

  -- A manager accepts: the task appears linked to the message, and the other task moves.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  item := public.resolve_agent_action(a, true);
  if not exists (select 1 from public.tasks where id = item and title = 'Order rebar' and due_date = '2026-11-12' and source_message_id = '5a000000-0000-0000-0000-0000000000a1') then
    raise exception 'new task missing or not linked';
  end if;
  perform public.resolve_agent_action(b, true);
  if not exists (select 1 from public.tasks where id = '7a000000-0000-0000-0000-0000000000a1' and start_date = '2026-11-09' and due_date = '2026-11-13') then
    raise exception 'task did not move';
  end if;
  begin
    perform public.resolve_agent_action(b, true);
    raise exception 'accepted twice';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dismissing changes nothing.
reset role;
insert into public.agent_actions (id, project_id, message_id, kind, task_id, title, reason, due_date)
values ('8a000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-0000000000a1', 'update_task', '7a000000-0000-0000-0000-0000000000a1', 'Pour slab', 'x', '2026-12-01');
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  perform public.resolve_agent_action('8a000000-0000-0000-0000-0000000000a1', false);
  if not exists (select 1 from public.tasks where id = '7a000000-0000-0000-0000-0000000000a1' and due_date = '2026-11-13') then
    raise exception 'dismiss changed the task';
  end if;
end $$;
reset role;
