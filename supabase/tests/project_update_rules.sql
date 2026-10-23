-- Project health updates (S14-9). Project 2...01 members: Pia manager b, Mo member c; ee is an outsider.
\set ON_ERROR_STOP on
set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  begin insert into public.project_updates (project_id, health, note) values ('20000000-0000-0000-0000-000000000001', 'at_risk', 'x'); raise exception 'member wrote an update';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

-- A manager writes as themselves only, and cannot edit or delete later.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.project_updates (project_id, health, note) values ('20000000-0000-0000-0000-000000000001', 'at_risk', 'Impeller slipped two weeks.');
do $$ begin
  begin insert into public.project_updates (project_id, health, note, author_id) values ('20000000-0000-0000-0000-000000000001', 'on_track', 'x', '00000000-0000-0000-0000-00000000000c'); raise exception 'wrote as someone else';
  exception when insufficient_privilege or check_violation then null; end;
  begin insert into public.project_updates (project_id, health, note) values ('20000000-0000-0000-0000-000000000001', 'on_track', '  '); raise exception 'blank note';
  exception when check_violation then null; end;
  begin update public.project_updates set note = 'changed'; raise exception 'edited an update';
  exception when insufficient_privilege then null; end;
  begin delete from public.project_updates; raise exception 'deleted an update';
  exception when insufficient_privilege then null; end;
end $$;

-- Members read it; outsiders and anon do not.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  if (select count(*) from public.project_updates) <> 1 then raise exception 'member cannot read the update'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ee';
do $$ begin
  if exists (select 1 from public.project_updates) then raise exception 'outsider read an update'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform 1 from public.project_updates; raise exception 'anon read updates';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
