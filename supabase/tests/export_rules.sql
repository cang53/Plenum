-- Export rules (stage 5, S5-3): only a workspace admin can export, and the export is audited.
\set ON_ERROR_STOP on
set role authenticated;
do $$
declare doc jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  begin
    perform public.export_workspace('10000000-0000-0000-0000-000000000001');
    raise exception 'a non-admin exported';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
  begin
    perform public.export_workspace('10000000-0000-0000-0000-000000000002');
    raise exception 'an admin of another workspace exported';
  exception when insufficient_privilege then null;
  end;
  doc := public.export_workspace('10000000-0000-0000-0000-000000000001');
  if jsonb_array_length(doc->'projects') < 1 or jsonb_array_length(doc->'tasks') < 1 then
    raise exception 'export is missing projects or tasks';
  end if;
  if exists (select 1 from jsonb_array_elements(doc->'projects') p where p->>'workspace_id' <> '10000000-0000-0000-0000-000000000001') then
    raise exception 'export holds another workspace''s project';
  end if;
  if (select count(*) from public.audit_log where action = 'exported' and actor_id = '00000000-0000-0000-0000-00000000000a') <> 1 then
    raise exception 'export not audited';
  end if;
end $$;
