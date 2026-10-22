-- Rules for accepting a suggestion (backlog S3-6). Runs last, reusing the earlier people and
-- project; it adds audit rows, so it must not run before audit_rules.sql.
\set ON_ERROR_STOP on

insert into public.messages (id, project_id, external_id, from_address)
values ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '<second@mail.example>', 'y@mail.example');
insert into public.suggestions (id, project_id, message_id, kind, title)
values ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'task', 'Book crane');

set role authenticated;

-- Accepting makes the item with its source message in one step; only a manager may, and only once.
do $$
declare item uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  begin
    perform public.accept_suggestion('60000000-0000-0000-0000-000000000002', 'task', 'Book crane', '');
    raise exception 'a member accepted a suggestion';
  exception when raise_exception then
    if sqlerrm = 'a member accepted a suggestion' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  item := public.accept_suggestion('60000000-0000-0000-0000-000000000002', 'risk', 'Crane slot lost', 'Slot ends 30 Nov');
  if not exists (select 1 from public.risks where id = item and title = 'Crane slot lost' and details = 'Slot ends 30 Nov'
                 and source_message_id = '50000000-0000-0000-0000-000000000002') then
    raise exception 'accepted item missing or not linked to its message';
  end if;
  if not exists (select 1 from public.suggestions where id = '60000000-0000-0000-0000-000000000002' and status = 'accepted') then
    raise exception 'suggestion not marked accepted';
  end if;
  begin
    perform public.accept_suggestion('60000000-0000-0000-0000-000000000002', 'risk', 'Again', '');
    raise exception 'accepted twice';
  exception when raise_exception then
    if sqlerrm = 'accepted twice' then raise; end if;
  end;
  if (select count(*) from public.risks where source_message_id = '50000000-0000-0000-0000-000000000002') <> 1 then
    raise exception 'second accept made a second item';
  end if;
end $$;

-- The decision and change request paths link to their message too.
reset role;
insert into public.messages (id, project_id, external_id, from_address)
values ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '<third@mail.example>', 'z@mail.example'),
       ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '<fourth@mail.example>', 'z@mail.example');
insert into public.suggestions (id, project_id, message_id, kind, title)
values ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'decision', 'Pick supplier'),
       ('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', 'change_request', 'Add rail');
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  perform public.accept_suggestion('60000000-0000-0000-0000-000000000003', 'decision', 'Pick supplier', 'Go with B');
  perform public.accept_suggestion('60000000-0000-0000-0000-000000000004', 'change_request', 'Add rail', 'Extra 40 m');
  if not exists (select 1 from public.decisions where title = 'Pick supplier' and details = 'Go with B' and source_message_id = '50000000-0000-0000-0000-000000000003')
     or not exists (select 1 from public.change_requests where title = 'Add rail' and details = 'Extra 40 m' and source_message_id = '50000000-0000-0000-0000-000000000004') then
    raise exception 'decision or change request missing or not linked to its message';
  end if;
end $$;

-- A task made from a suggestion keeps the details.
reset role;
insert into public.messages (id, project_id, external_id, from_address)
values ('50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '<fifth@mail.example>', 'z@mail.example');
insert into public.suggestions (id, project_id, message_id, kind, title)
values ('60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', 'task', 'Book hoist');
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  perform public.accept_suggestion('60000000-0000-0000-0000-000000000005', 'task', 'Book hoist', 'Week 46, two days');
  if not exists (select 1 from public.tasks where title = 'Book hoist' and details = 'Week 46, two days' and source_message_id = '50000000-0000-0000-0000-000000000005') then
    raise exception 'task from a suggestion lost its details';
  end if;
end $$;

reset role;
\echo 'accept rules: all checks passed'
