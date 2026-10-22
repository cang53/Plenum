-- Rules for manual linking (backlog task 9). Runs after messages_rules.sql, reusing its people,
-- project and message. Each block raises an error when a rule is broken.
\set ON_ERROR_STOP on

-- A message in the other workspace's project (from access_rules.sql).
insert into public.messages (id, project_id, external_id, from_address)
values ('50000000-0000-0000-0000-000000000099', '20000000-0000-0000-0000-000000000099', '<other@mail.example>', 'x@other.example');

set role authenticated;

-- Pia (project manager) turns the gearbox email into one item of each kind.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare msg uuid := (select id from public.messages where project_id = '20000000-0000-0000-0000-000000000001');
begin
  insert into public.tasks (project_id, title, source_message_id)
  values ('20000000-0000-0000-0000-000000000001', 'Resequence install', msg);
  insert into public.decisions (project_id, title, source_message_id)
  values ('20000000-0000-0000-0000-000000000001', 'Accept 28 Nov delivery', msg);
  insert into public.risks (project_id, title, source_message_id)
  values ('20000000-0000-0000-0000-000000000001', 'Gearbox arrives late', msg);
  insert into public.change_requests (project_id, title, source_message_id)
  values ('20000000-0000-0000-0000-000000000001', 'Move install to December', msg);

  -- A message from another project cannot be linked, on any kind of item.
  begin
    insert into public.risks (project_id, title, source_message_id)
    values ('20000000-0000-0000-0000-000000000001', 'Wrong project', '50000000-0000-0000-0000-000000000099');
    raise exception 'linked a message of another project';
  exception when raise_exception then
    if sqlerrm = 'linked a message of another project' then raise; end if;
  end;
  begin
    update public.tasks set source_message_id = '50000000-0000-0000-0000-000000000099' where title = 'Resequence install';
    raise exception 'relinked a task to another project';
  exception when raise_exception then
    if sqlerrm = 'relinked a task to another project' then raise; end if;
  end;
end $$;

-- A blank title is refused.
do $$ begin
  insert into public.decisions (project_id, title) values ('20000000-0000-0000-0000-000000000001', '  ');
  raise exception 'blank title accepted';
exception when check_violation then null;
end $$;

-- Members and contributors read the items but cannot create them.
do $$
declare who uuid; n int;
begin
  foreach who in array array['00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d']::uuid[] loop
    perform set_config('request.jwt.claim.sub', who::text, true);
    select (select count(*) from public.decisions) + (select count(*) from public.risks)
         + (select count(*) from public.change_requests) into n;
    if n <> 3 then raise exception 'member % saw % items, expected 3', who, n; end if;
    begin
      insert into public.risks (project_id, title) values ('20000000-0000-0000-0000-000000000001', 'Nope');
      raise exception 'member created a risk';
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- Eve (not on the project) sees none of them.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$
declare n int;
begin
  select (select count(*) from public.decisions) + (select count(*) from public.risks)
       + (select count(*) from public.change_requests) into n;
  if n <> 0 then raise exception 'outsider saw % items', n; end if;
end $$;

reset role;
\echo 'linking rules: all checks passed'
