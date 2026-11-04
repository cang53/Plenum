-- Library: lessons are read by staff only, added and removed by staff; project documents follow the project.
\set ON_ERROR_STOP on

insert into public.library_documents (id, workspace_id, folder, title, body_text, created_by)
values ('b1000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', 'lessons', 'Late supplier delivery', 'Order long-lead items before design freeze.', null);

set role authenticated;
do $$
begin
  -- Staff of the workspace read the shared lessons and may add one.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  if (select count(*) from public.library_documents where folder = 'lessons') <> 1 then raise exception 'staff cannot read lessons'; end if;
  insert into public.library_documents (workspace_id, folder, title, body_text) values ('10000000-0000-0000-0000-000000000001', 'lessons', 'Second', 'x');
  -- A lessons row cannot name a project, and created_by must be the caller.
  begin
    insert into public.library_documents (workspace_id, project_id, folder, title) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'lessons', 'bad');
    raise exception 'lessons row with a project';
  exception when check_violation then null;
  end;
  begin
    insert into public.library_documents (workspace_id, folder, title, created_by) values ('10000000-0000-0000-0000-000000000001', 'lessons', 'forged', '00000000-0000-0000-0000-00000000000c');
    raise exception 'forged author';
  exception when insufficient_privilege then null;
  end;
  -- A contributor (outside partner) sees nothing.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
  if (select count(*) from public.library_documents) <> 0 then raise exception 'an outsider reads the library'; end if;
  begin
    insert into public.library_documents (workspace_id, folder, title) values ('10000000-0000-0000-0000-000000000001', 'lessons', 'nope');
    raise exception 'an outsider added a lesson';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
