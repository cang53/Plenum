-- Rules for project email (backlog task 7). Runs after access_rules.sql and uses its people and project.
\set ON_ERROR_STOP on

-- The webhook stores an email CC'd to line4-ghent, with one attachment.
set role service_role;
do $$
declare first_id uuid; again_id uuid; unknown_id uuid;
begin
  first_id := public.ingest_email('line4-ghent', '<abc@mail.example>', 'Jan', 'jan@supplier.example',
    array['pia@example.com'], array['line4-ghent@in.plenum.example'], 'Gearbox delivery', 'Arrives Monday.',
    now(), 's3://inbound/abc', '[{"part_index":0,"filename":"note.pdf","content_type":"application/pdf","size_bytes":1200}]');
  if first_id is null then raise exception 'email was not stored'; end if;

  -- A redelivered email is stored once.
  again_id := public.ingest_email('line4-ghent', '<abc@mail.example>', 'Jan', 'jan@supplier.example',
    '{}', '{}', 'Gearbox delivery', 'Arrives Monday.', now(), null, '[]');
  if again_id is distinct from first_id then raise exception 'redelivery made a second message'; end if;

  -- An address with no project stores nothing.
  unknown_id := public.ingest_email('no-such-project', '<x@mail.example>', null, 'x@mail.example',
    '{}', '{}', '', '', null, null, '[]');
  if unknown_id is not null then raise exception 'email to an unknown address was stored'; end if;
end $$;
reset role;

do $$ begin
  if (select count(*) from public.messages) <> 1 or (select count(*) from public.message_attachments) <> 1 then
    raise exception 'expected 1 message and 1 attachment';
  end if;
end $$;

set role authenticated;

-- Mo (member) and Cy (contributor) see the message and its attachment.
do $$
declare who uuid; n int;
begin
  foreach who in array array['00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d']::uuid[] loop
    perform set_config('request.jwt.claim.sub', who::text, true);
    select (select count(*) from public.messages) + (select count(*) from public.message_attachments) into n;
    if n <> 2 then raise exception 'project member % saw % rows, expected 2', who, n; end if;
  end loop;
end $$;

-- Eve (not on the project) sees nothing.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$
declare n int;
begin
  select (select count(*) from public.messages) + (select count(*) from public.message_attachments) into n;
  if n <> 0 then raise exception 'outsider saw % message rows', n; end if;
end $$;

-- Even a project manager cannot write messages directly or call the webhook's function.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    update public.messages set subject = 'Edited';
    raise exception 'manager edited a message';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.ingest_email('line4-ghent', '<forged@mail.example>', null, 'x@mail.example',
      '{}', '{}', '', '', null, null, '[]');
    raise exception 'manager called ingest_email';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
\echo 'message rules: all checks passed'

-- App messages and their files. Project 2...01: Mo (c) is a member; Eve (e) is not on it.
\set ON_ERROR_STOP on
create temp table _m (id uuid);
grant all on _m to authenticated;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
set request.jwt.claim.email = 'mo@example.com';
do $$
declare v_project uuid := '20000000-0000-0000-0000-000000000001'; v_msg uuid;
begin
  perform public.post_message(v_project, '  Crane booked for Monday.  ', 'Re: Crane');
  begin perform public.post_message(v_project, '   '); raise exception 'empty message was stored';
  exception when sqlstate '22023' then null; end;
  v_msg := public.post_message(v_project, '', 'Photos', true);
  insert into _m values (v_msg);
  perform public.add_message_file(v_msg, v_project || '/' || v_msg || '/a.png', 'a.png', 'image/png', 1000);
  begin perform public.add_message_file(v_msg, v_project || '/other/a.png', 'a.png', 'image/png', 1000); raise exception 'wrong path accepted';
  exception when sqlstate '22023' then null; end;
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
set request.jwt.claim.email = 'eve@example.com';
do $$
declare v_project uuid := '20000000-0000-0000-0000-000000000001'; v_msg uuid := (select id from _m);
begin
  begin perform public.post_message(v_project, 'hi'); raise exception 'outsider posted';
  exception when sqlstate '42501' then null; end;
  begin perform public.add_message_file(v_msg, v_project || '/' || v_msg || '/b.png', 'b.png', 'image/png', 1000); raise exception 'outsider added a file';
  exception when sqlstate '42501' then null; end;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.message_attachments a join _m on _m.id = a.message_id) <> 1 then raise exception 'expected one file'; end if;
  if (select body_text || subject from public.messages where subject = 'Re: Crane') <> 'Crane booked for Monday.Re: Crane' then raise exception 'app message was not stored trimmed'; end if;
end $$;
delete from public.messages where source = 'app';
drop table _m;
