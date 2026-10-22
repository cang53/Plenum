-- Onboarding rules (stage 4, S4-6). A brand-new person (…f1) onboards once; existing members cannot.
\set ON_ERROR_STOP on
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'newbie@example.test');
insert into profiles (id, display_name, email) values ('00000000-0000-0000-0000-0000000000f1', 'Nia', 'newbie@example.test');
set role authenticated;

do $$
declare p uuid; n int;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
  p := public.onboard('Nia Works', 'Line 9', 'line-9-test', true);
  if public.project_role_of(p) <> 'project_manager' then raise exception 'creator is not manager'; end if;
  select count(*) into n from tasks where project_id = p;
  if n <> 3 then raise exception 'demo tasks missing: %', n; end if;
  begin
    perform public.onboard('Second', 'Again', 'line-9-again', false);
    raise exception 'onboarded twice';
  exception when insufficient_privilege then null;
  end;
  -- Someone who already belongs to a project (Mo) cannot onboard either.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  begin
    perform public.onboard('Mo Inc', 'Mo project', 'mo-project', false);
    raise exception 'member onboarded';
  exception when insufficient_privilege then null;
  end;
  -- Signed-out callers are refused.
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.onboard('X', 'Y', 'xy-test', false);
    raise exception 'anonymous onboarded';
  exception when insufficient_privilege then null;
  end;
end $$;
