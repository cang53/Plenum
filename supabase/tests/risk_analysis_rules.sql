-- Risk analyses: everyone on the project reads them; only a manager adds a manual one; the weekly one is written by the service key.
\set ON_ERROR_STOP on

insert into public.risk_analyses (project_id, source, summary) values ('20000000-0000-0000-0000-000000000001', 'weekly', '2 open, 1 high.');

set role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  if (select count(*) from public.risk_analyses) <> 1 then raise exception 'a member cannot read the analysis'; end if;
  begin
    insert into public.risk_analyses (project_id, source, summary) values ('20000000-0000-0000-0000-000000000001', 'manual', 'x');
    raise exception 'a member added an analysis';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  insert into public.risk_analyses (project_id, source, summary) values ('20000000-0000-0000-0000-000000000001', 'manual', 'refreshed');
  if not exists (select 1 from public.risk_analyses where summary = 'refreshed' and created_by = '00000000-0000-0000-0000-00000000000b') then raise exception 'manual analysis missing or without author'; end if;
  begin
    insert into public.risk_analyses (project_id, source, summary) values ('20000000-0000-0000-0000-000000000001', 'weekly', 'forged weekly');
    raise exception 'a person wrote a weekly analysis';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ee', true);
  if (select count(*) from public.risk_analyses) <> 0 then raise exception 'an outsider reads analyses'; end if;
end $$;
reset role;
