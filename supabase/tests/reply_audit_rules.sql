-- Reply from the timeline (S8-1): a project member can log a reply to a project message; outsiders cannot.
\set ON_ERROR_STOP on
select id as msg, project_id as proj from public.messages where project_id = '20000000-0000-0000-0000-000000000001' limit 1 \gset

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.audit_reply(:'msg');
reset role;
do $$ begin
  if not exists (select 1 from public.audit_log where action = 'replied' and entity_type = 'messages' and actor_id = '00000000-0000-0000-0000-00000000000b') then
    raise exception 'reply not audited with its author';
  end if;
end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  begin
    perform public.audit_reply((select id from public.messages where project_id = '20000000-0000-0000-0000-000000000001' limit 1));
    raise exception 'an outsider logged a reply';
  exception when others then
    if sqlerrm = 'an outsider logged a reply' then raise; end if;
  end;
end $$;
reset role;
