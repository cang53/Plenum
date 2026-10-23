-- Document revision rules (S9-9). Pia manager (b) of project 2...01; Mo (c) is a member.
\set ON_ERROR_STOP on
reset role;
insert into public.messages (id, project_id, external_id, from_address, received_at) values
  ('50000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-000000000001', 'doc-1', 'a@example.com', '2026-10-01'),
  ('50000000-0000-0000-0000-0000000000d2', '20000000-0000-0000-0000-000000000001', 'doc-2', 'a@example.com', '2026-10-02');
insert into public.message_attachments (id, message_id, part_index, filename, content_type, size_bytes) values
  ('70000000-0000-0000-0000-0000000000d1', '50000000-0000-0000-0000-0000000000d1', 0, 'facade-a.pdf', 'application/pdf', 1),
  ('70000000-0000-0000-0000-0000000000d2', '50000000-0000-0000-0000-0000000000d2', 0, 'facade-b.pdf', 'application/pdf', 1);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.tag_attachment('70000000-0000-0000-0000-0000000000d1', 'drawing', 'A-101', 'A');
select public.tag_attachment('70000000-0000-0000-0000-0000000000d2', 'drawing', 'a-101', 'B');
do $$ begin
  if not (select superseded(a) from public.message_attachments a where id = '70000000-0000-0000-0000-0000000000d1') then raise exception 'rev A not superseded'; end if;
  if (select superseded(a) from public.message_attachments a where id = '70000000-0000-0000-0000-0000000000d2') then raise exception 'newest rev superseded'; end if;
  if not exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'facade') where kind = 'document') then raise exception 'tagged document not searchable'; end if;
  if not exists (select 1 from public.audit_log where action = 'attachment_tagged') then raise exception 'tagging not audited'; end if;
  begin
    perform public.tag_attachment('70000000-0000-0000-0000-0000000000d1', 'map', 'A-101', 'A');
    raise exception 'unknown type accepted';
  exception when check_violation then null;
  end;
end $$;

-- A plain member cannot tag.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  begin
    perform public.tag_attachment('70000000-0000-0000-0000-0000000000d1', 'drawing', 'X', 'Z');
    raise exception 'member tagged';
  exception when raise_exception then
    if sqlerrm = 'member tagged' then raise; end if;
  end;
end $$;
reset role;
