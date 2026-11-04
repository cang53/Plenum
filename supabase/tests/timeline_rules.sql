-- Timelines: project members read them, members and managers edit, outside contributors only read; the database stamps the author.
\set ON_ERROR_STOP on

set role authenticated;
do $$
begin
  -- Mo (member) saves a timeline; the author is the caller.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  insert into public.timelines (id, project_id, title, doc) values ('c1000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'Dock 3', '{"items":[]}');
  begin
    insert into public.timelines (project_id, title, created_by) values ('20000000-0000-0000-0000-000000000001', 'forged', '00000000-0000-0000-0000-00000000000b');
    raise exception 'forged author';
  exception when insufficient_privilege then null;
  end;
  -- Updating stamps the editor and cannot move the timeline or change its author.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  update public.timelines set title = 'Dock 3 refit', created_by = '00000000-0000-0000-0000-00000000000b' where id = 'c1000000-0000-0000-0000-0000000000a1';
  if (select created_by from public.timelines where id = 'c1000000-0000-0000-0000-0000000000a1') <> '00000000-0000-0000-0000-00000000000c' then raise exception 'author changed'; end if;
  if (select updated_by from public.timelines where id = 'c1000000-0000-0000-0000-0000000000a1') <> '00000000-0000-0000-0000-00000000000b' then raise exception 'editor not stamped'; end if;
  -- Cy (contributor) reads but cannot add, change or delete.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
  if (select count(*) from public.timelines) <> 1 then raise exception 'contributor cannot read'; end if;
  begin
    insert into public.timelines (project_id, title) values ('20000000-0000-0000-0000-000000000001', 'nope');
    raise exception 'contributor added';
  exception when insufficient_privilege then null;
  end;
  update public.timelines set title = 'hacked';
  if (select title from public.timelines) = 'hacked' then raise exception 'contributor changed'; end if;
  delete from public.timelines;
  if (select count(*) from public.timelines) <> 1 then raise exception 'contributor deleted'; end if;
  -- Someone outside the project sees nothing.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', true);
  if (select count(*) from public.timelines) <> 0 then raise exception 'outsider reads timelines'; end if;
end $$;
reset role;
