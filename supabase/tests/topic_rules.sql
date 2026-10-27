-- Topic rules: an outsider (signed in, no role in project 2...01) and anon cannot create topics or tag messages.
\set ON_ERROR_STOP on
reset role;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
do $$
begin
  begin
    perform public.create_topic('20000000-0000-0000-0000-000000000001', 'Sneaky');
    raise exception 'an outsider created a topic';
  exception when raise_exception then
    if sqlerrm = 'an outsider created a topic' then raise; end if;
  end;
  begin
    perform public.save_site_log('20000000-0000-0000-0000-000000000001', 'Sneaky', '2026-11-06', '', 1, '', '');
    raise exception 'an outsider saved a site log';
  exception when raise_exception then
    if sqlerrm = 'an outsider saved a site log' then raise; end if;
  end;
end $$;
commit;

begin;
set local role anon;
do $$
begin
  begin
    perform public.create_topic('20000000-0000-0000-0000-000000000001', 'Sneaky');
    raise exception 'anon created a topic';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;
