-- Task number rules (S-F1): numbers count up per project, are never reused and cannot be changed.
\set ON_ERROR_STOP on
do $$
declare
  p uuid := (select id from public.projects limit 1);
  a int; b int; c int;
begin
  insert into public.tasks (project_id, title) values (p, 'number test a') returning number into a;
  insert into public.tasks (project_id, title) values (p, 'number test b') returning number into b;
  if b <> a + 1 then raise exception 'numbers do not count up: % then %', a, b; end if;
  delete from public.tasks where project_id = p and title = 'number test b';
  insert into public.tasks (project_id, title) values (p, 'number test c') returning number into c;
  if c <= b then raise exception 'a number was reused: % after %', c, b; end if;
  update public.tasks set number = 1 where project_id = p and title = 'number test a';
  if (select number from public.tasks where project_id = p and title = 'number test a') <> a then
    raise exception 'a task number was changed';
  end if;
  if exists (select 1 from public.tasks group by project_id, number having count(*) > 1) then
    raise exception 'duplicate task number';
  end if;
  delete from public.tasks where project_id = p and title like 'number test %';
end $$;
\echo 'task number rules: all checks passed'
