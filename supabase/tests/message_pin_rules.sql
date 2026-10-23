-- Pinned decisions (S14-7). Project 2...01: Pia manager b, Mo member c, Cy contributor d; Eve e is not on it.
\set ON_ERROR_STOP on
reset role;
insert into public.projects (id, workspace_id, name, email_slug) values ('20000000-0000-0000-0000-0000000000f2', '10000000-0000-0000-0000-000000000001', 'Pins other', 'pins-other');
insert into public.messages (id, project_id, external_id, from_address, subject)
values ('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-000000000001', '<pin@mail.example>', 'jan@supplier.example', 'Use the 2 m gearbox'),
       ('30000000-0000-0000-0000-0000000000f2', '20000000-0000-0000-0000-0000000000f2', '<pin2@mail.example>', 'jan@supplier.example', 'Other project');

-- A member cannot pin.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  begin insert into public.message_pins (message_id, project_id) values ('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-000000000001'); raise exception 'member pinned';
  exception when insufficient_privilege then null; end;
end $$;

-- The manager pins; a message of another project cannot be pinned here; the pinner cannot be faked.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.message_pins (message_id, project_id) values ('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-000000000001');
do $$ begin
  begin insert into public.message_pins (message_id, project_id) values ('30000000-0000-0000-0000-0000000000f2', '20000000-0000-0000-0000-000000000001'); raise exception 'pinned a message of another project';
  exception when foreign_key_violation then null; end;
  begin insert into public.message_pins (message_id, project_id, pinned_by) values ('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c'); raise exception 'faked the pinner';
  exception when insufficient_privilege or unique_violation then null; end;
  if (select pinned_by from public.message_pins) <> '00000000-0000-0000-0000-00000000000b' then raise exception 'pinner not recorded'; end if;
end $$;

-- Members read; outsiders and anon see nothing; a member cannot unpin.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  if (select count(*) from public.message_pins) <> 1 then raise exception 'member cannot read the pin'; end if;
  delete from public.message_pins;
  if (select count(*) from public.message_pins) <> 1 then raise exception 'member unpinned'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin if exists (select 1 from public.message_pins) then raise exception 'outsider saw a pin'; end if; end $$;
reset role;
set role anon;
do $$ begin
  begin perform 1 from public.message_pins; raise exception 'anon read pins';
  exception when insufficient_privilege then null; end;
end $$;

-- The manager unpins.
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
delete from public.message_pins;
do $$ begin if exists (select 1 from public.message_pins) then raise exception 'manager could not unpin'; end if; end $$;
reset role;
