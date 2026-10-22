-- Rules for the audit log (backlog task 15). Runs after suggestions_rules.sql, reusing what the
-- earlier tests did: Pia made four items from the gearbox message and accepted a suggestion.
\set ON_ERROR_STOP on

do $$ declare n int; begin
  select count(*) into n from public.audit_log
  where project_id = '20000000-0000-0000-0000-000000000001' and actor_id = '00000000-0000-0000-0000-00000000000b';
  if n <> 5 then raise exception 'expected 5 audit rows for Pia, found %', n; end if;
  if not exists (select 1 from public.audit_log where action = 'accepted' and entity_type = 'suggestions' and source_message_id is not null)
     or not exists (select 1 from public.audit_log where action = 'created' and entity_type = 'risks' and source_message_id is not null) then
    raise exception 'approval or item creation not logged with its source message';
  end if;
end $$;

set role authenticated;

-- The manager and the workspace admin read it; members, contributors and outsiders do not.
do $$
declare who text; want int; n int;
begin
  foreach who in array array['b', 'a', 'c', 'd', 'e'] loop
    perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || who, true);
    select count(*) into n from public.audit_log;
    want := case when who in ('a', 'b') then 5 else 0 end;
    if n <> want then raise exception 'user % saw % audit rows, expected %', who, n, want; end if;
  end loop;
end $$;

-- Nobody can write, change or remove rows through the API, and the helpers are not callable.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    insert into public.audit_log (workspace_id, project_id, action, entity_type, entity_id)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'x', 'x', gen_random_uuid());
    raise exception 'a signed-in user wrote an audit row';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.audit_log;
    raise exception 'a signed-in user deleted audit rows';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.write_audit('20000000-0000-0000-0000-000000000001', 'x', 'x', gen_random_uuid(), null);
    raise exception 'a signed-in user called write_audit';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Even the database owner cannot edit or truncate it.
do $$ begin
  begin
    update public.audit_log set action = 'edited';
    raise exception 'edited the audit log';
  exception when raise_exception then
    if sqlerrm = 'edited the audit log' then raise; end if;
  end;
  begin
    truncate public.audit_log;
    raise exception 'truncated the audit log';
  exception when raise_exception then
    if sqlerrm = 'truncated the audit log' then raise; end if;
  end;
end $$;

\echo 'audit rules: all checks passed'
