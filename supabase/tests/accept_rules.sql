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

reset role;
\echo 'accept rules: all checks passed'
