-- Dependency import (S9-3): links keep type and lag; only a manager can log an import.
\set ON_ERROR_STOP on
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.task_dependencies (predecessor_id, successor_id, kind, lag_days)
values ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'SS', 3)
on conflict (predecessor_id, successor_id) do update set kind = excluded.kind, lag_days = excluded.lag_days;
select public.audit_dependency_import('20000000-0000-0000-0000-000000000001');
reset role;
do $$ begin
  if not exists (select 1 from public.task_dependencies where kind = 'SS' and lag_days = 3) then raise exception 'type and lag not kept'; end if;
  if not exists (select 1 from public.audit_log where action = 'imported dependencies' and actor_id = '00000000-0000-0000-0000-00000000000b') then
    raise exception 'import not audited';
  end if;
  begin
    insert into public.task_dependencies (predecessor_id, successor_id, kind) values ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'XX');
    raise exception 'bad type accepted';
  exception when check_violation then null; end;
end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  begin
    perform public.audit_dependency_import('20000000-0000-0000-0000-000000000001');
    raise exception 'an outsider logged an import';
  exception when others then
    if sqlerrm = 'an outsider logged an import' then raise; end if;
  end;
end $$;
reset role;
