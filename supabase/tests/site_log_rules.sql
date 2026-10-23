-- Site log rules (S9-10). Pia manager (b), Mo member (c), Cy contributor (d) of project 2...01; Ann admin (a) of workspace 1.
\set ON_ERROR_STOP on
reset role;
insert into public.project_members (project_id, user_id, role) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'member'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'contributor')
on conflict (project_id, user_id) do update set role = excluded.role;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
do $$
begin
  begin
    perform public.save_site_log('20000000-0000-0000-0000-000000000001', 'Hall 2', '2026-11-03', 'Rain', 5, 'x', '');
    raise exception 'a contributor saved a log';
  exception when raise_exception then
    if sqlerrm = 'a contributor saved a log' then raise; end if;
  end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
select public.save_site_log('20000000-0000-0000-0000-000000000001', 'Hall 2', '2026-11-03', 'Rain', 12, 'Poured slab', '');
-- Same site and day again replaces the log.
select public.save_site_log('20000000-0000-0000-0000-000000000001', 'Hall 2', '2026-11-03', 'Dry', 14, 'Poured slab', 'Late concrete');
do $$
begin
  if (select count(*) from public.site_logs where site = 'Hall 2') <> 1 then raise exception 'second save did not replace'; end if;
  if not exists (select 1 from public.site_logs where site = 'Hall 2' and headcount = 14 and delays = 'Late concrete') then raise exception 'log not updated'; end if;
  begin
    insert into public.site_logs (project_id, site, log_date) values ('20000000-0000-0000-0000-000000000001', 'Direct', '2026-11-03');
    raise exception 'a member wrote a log directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_site_log('20000000-0000-0000-0000-000000000001', 'Hall 2', '2026-11-04', '', -1, '', '');
    raise exception 'negative headcount accepted';
  exception when check_violation then null;
  end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
do $$
begin
  if not exists (select 1 from public.site_logs where site = 'Hall 2') then raise exception 'a contributor cannot read the log'; end if;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$
begin
  if jsonb_array_length(public.export_workspace('10000000-0000-0000-0000-000000000001')->'site_logs') < 1 then raise exception 'export lacks site logs'; end if;
end $$;
commit;

do $$
begin
  if not exists (select 1 from public.audit_log where action = 'site_log_saved') then raise exception 'save not audited'; end if;
end $$;

-- Weekly report carries one site line with totals only (S10-3).
reset role;
delete from public.status_reports where project_id = '20000000-0000-0000-0000-000000000001';
insert into public.site_logs (project_id, site, log_date, headcount, delays) values
  ('20000000-0000-0000-0000-000000000001', 'Hall 9', current_date, 10, 'Rain'),
  ('20000000-0000-0000-0000-000000000001', 'Hall 9', current_date - 1, 6, ''),
  ('20000000-0000-0000-0000-000000000001', 'Hall 9', current_date - 30, 99, '');
select public.draft_status_reports();
do $$
begin
  if not exists (select 1 from public.status_reports where project_id = '20000000-0000-0000-0000-000000000001'
    and body_text like '%Site Hall 9: 2 days logged, 16 headcount-days, 1 delay days%') then raise exception 'site line missing or wrong'; end if;
end $$;
