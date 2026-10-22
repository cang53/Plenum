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
