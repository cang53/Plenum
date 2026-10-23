-- Risks and issues register rules (S9-8). Pia manager (b), Mo member (c) of project 2...01.
\set ON_ERROR_STOP on
reset role;
insert into public.project_members (project_id, user_id, role)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'member')
on conflict (project_id, user_id) do update set role = 'member';
insert into public.risks (id, project_id, title, kind, owner_id, due_date)
values ('60000000-0000-0000-0000-0000000000a8', '20000000-0000-0000-0000-000000000001', 'Crane permit missing', 'issue', '00000000-0000-0000-0000-00000000000c', '2026-12-01');

do $$
begin
  begin
    insert into public.risks (project_id, title, kind) values ('20000000-0000-0000-0000-000000000001', 'x', 'worry');
    raise exception 'unknown kind accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.risks (project_id, title, owner_id) values ('20000000-0000-0000-0000-000000000001', 'x', '00000000-0000-0000-0000-0000000000ff');
    raise exception 'outsider owner accepted';
  exception when raise_exception or foreign_key_violation then
    if sqlerrm = 'outsider owner accepted' then raise; end if;
  end;
end $$;

-- A new week's draft lists the issue with its due date.
delete from public.status_reports;
select public.draft_status_reports();
do $$
begin
  if not exists (select 1 from public.status_reports where body_text like '%Open issue: Crane permit missing (due 2026-12-01)%') then
    raise exception 'issue missing from the weekly report';
  end if;
end $$;

-- Members read the register but only managers write it.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$
begin
  if not exists (select 1 from public.risks where title = 'Crane permit missing') then raise exception 'member cannot read the register'; end if;
  update public.risks set status = 'closed' where title = 'Crane permit missing';
  if exists (select 1 from public.risks where title = 'Crane permit missing' and status = 'closed') then raise exception 'a member closed an issue'; end if;
end $$;
commit;
