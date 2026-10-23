-- Baseline rules (S9-7). Pia manager (b), Mo member (c) of project 2...01.
\set ON_ERROR_STOP on
reset role;
insert into public.tasks (id, project_id, title, start_date, due_date, position)
values ('30000000-0000-0000-0000-0000000000a7', '20000000-0000-0000-0000-000000000001', 'Baseline task', '2026-11-02', '2026-11-06', 900);
insert into public.project_members (project_id, user_id, role)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'member')
on conflict (project_id, user_id) do update set role = 'member';

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$
begin
  begin
    perform public.save_baseline('20000000-0000-0000-0000-000000000001');
    raise exception 'a member saved a baseline';
  exception when raise_exception then
    if sqlerrm = 'a member saved a baseline' then raise; end if;
  end;
  begin
    insert into public.baselines (project_id) values ('20000000-0000-0000-0000-000000000001');
    raise exception 'a member wrote a baseline directly';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select set_config('app.bid', public.save_baseline('20000000-0000-0000-0000-000000000001')::text, false);
do $$
begin
  if not exists (select 1 from public.baseline_tasks where baseline_id = current_setting('app.bid')::uuid
    and task_id = '30000000-0000-0000-0000-0000000000a7' and due_date = '2026-11-06') then raise exception 'dates not copied'; end if;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$
begin
  if not exists (select 1 from public.baseline_tasks where baseline_id = current_setting('app.bid')::uuid) then raise exception 'a member cannot read the baseline'; end if;
end $$;
commit;

do $$
begin
  if not exists (select 1 from public.audit_log where action = 'baseline_saved') then raise exception 'save not audited'; end if;
end $$;
