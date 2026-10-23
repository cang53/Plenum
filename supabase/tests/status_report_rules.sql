-- Weekly status report rules (S8-10). Runs after the earlier people exist: Pia manager (b), Mo member (c).
\set ON_ERROR_STOP on

select public.draft_status_reports();
do $$
begin
  if not exists (select 1 from public.status_reports where project_id = '20000000-0000-0000-0000-000000000001') then raise exception 'no draft made'; end if;
  if public.draft_status_reports() <> 0 then raise exception 'a second run drafted again'; end if;
end $$;

insert into public.project_members (project_id, user_id, role)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'member')
on conflict (project_id, user_id) do update set role = 'member';

select set_config('app.rid', (select id::text from public.status_reports where project_id = '20000000-0000-0000-0000-000000000001'), false);

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$
begin
  if exists (select 1 from public.status_reports) then raise exception 'a member read a status report'; end if;
  begin
    perform public.draft_status_reports();
    raise exception 'a signed-in user ran the drafting';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.send_status_report(current_setting('app.rid')::uuid);
    raise exception 'a member sent a report';
  exception when raise_exception then
    if sqlerrm = 'a member sent a report' then raise; end if;
  end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
do $$
begin
  if not exists (select 1 from public.send_status_report(current_setting('app.rid')::uuid)) then raise exception 'manager could not send'; end if;
  begin
    perform * from public.send_status_report(current_setting('app.rid')::uuid);
    raise exception 'sent twice';
  exception when raise_exception then
    if sqlerrm = 'sent twice' then raise; end if;
  end;
end $$;
commit;

do $$
begin
  if not exists (select 1 from public.audit_log where action = 'status_report_sent') then raise exception 'send not audited'; end if;
end $$;
