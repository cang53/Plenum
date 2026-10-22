-- Hardening rules (stage 4, S4-9): every public table has row-level security, limits are
-- unreadable to signed-in people, and onboard() stops at the workspace cap.
\set ON_ERROR_STOP on
do $$
declare t text;
begin
  select string_agg(c.relname, ', ') into t from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if t is not null then raise exception 'tables without row-level security: %', t; end if;
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f2', 'late@example.test');
update platform_limits set value = (select count(*) from workspaces) where key = 'max_workspaces';
set role authenticated;
do $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
  begin
    select count(*) into n from platform_limits;
    raise exception 'limits are readable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.onboard('Late Co', 'Late', 'late-test', false);
    raise exception 'onboarded past the cap';
  exception when insufficient_privilege then null;
  end;
end $$;
