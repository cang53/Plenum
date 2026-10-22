-- Daily model-call cap (S6-3): counts per workspace, stops at the cap, closed to signed-in users.
\set ON_ERROR_STOP on

do $$
declare p uuid := '20000000-0000-0000-0000-000000000001';
begin
  if not public.take_ai_call(p, 2) or not public.take_ai_call(p, 2) then raise exception 'calls under the cap refused'; end if;
  if public.take_ai_call(p, 2) then raise exception 'call over the cap allowed'; end if;
  if public.take_ai_call('99999999-0000-0000-0000-000000000000', 2) then raise exception 'unknown project allowed'; end if;
end $$;

begin;
set local role authenticated;
do $$
begin
  begin
    perform public.take_ai_call('20000000-0000-0000-0000-000000000001', 99);
    raise exception 'a signed-in user took a call';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.ai_usage;
    raise exception 'a signed-in user read ai_usage';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;
