-- Task detail (S14-16). Pia manager b, Mo member c owns task ...01, Cy contributor d, Eve e outside. Runs after task_details_rules.sql.
\set ON_ERROR_STOP on
set role authenticated;

-- Mo owns the task and can build its checklist; Cy (contributor, not owner) can read but not write.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into public.task_checklist (task_id, text, position) values ('40000000-0000-0000-0000-000000000001', 'Book crane', 1);
update public.task_checklist set done = true;
do $$ begin
  if not (select done from public.task_checklist) then raise exception 'owner could not tick an item'; end if;
  begin insert into public.task_checklist (task_id, text) values ('40000000-0000-0000-0000-000000000001', '  '); raise exception 'blank item accepted';
  exception when check_violation then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  if (select count(*) from public.task_checklist) <> 1 then raise exception 'member cannot read the checklist'; end if;
  begin insert into public.task_checklist (task_id, text) values ('40000000-0000-0000-0000-000000000001', 'sneaky'); raise exception 'non-owner wrote';
  exception when insufficient_privilege then null; end;
  delete from public.task_checklist;
  if (select count(*) from public.task_checklist) <> 1 then raise exception 'non-owner deleted'; end if;
end $$;

-- Eve is outside the project: no checklist, no history. Anyone on the project sees the history, with names.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  if exists (select 1 from public.task_checklist) then raise exception 'outsider saw a checklist'; end if;
  if exists (select 1 from public.task_activity('40000000-0000-0000-0000-000000000001')) then raise exception 'outsider saw history'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  if not exists (select 1 from public.task_activity('40000000-0000-0000-0000-000000000001') where action = 'details_changed' and who is not null) then
    raise exception 'member cannot see the task history';
  end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform 1 from public.task_activity('40000000-0000-0000-0000-000000000001'); raise exception 'anon read history';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'task detail rules: all checks passed'
