-- Security audit (S6-10): whole-schema checks, so a new table or function cannot slip past the rules.
\set ON_ERROR_STOP on

-- Functions that signed-in people may call directly. Each one checks who is asking itself.
-- A new function must be added here on purpose, after review.
do $$
declare
  allowed text[] := array['is_workspace_member','is_workspace_staff','is_workspace_admin','project_role_of',
    'can_see_project','can_manage_project','accept_my_invitations','onboard','export_workspace','delete_project',
    'remove_person','accept_suggestion','search_project','create_project_from','send_status_report'];
  bad text;
begin
  select string_agg(p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute')
    and p.proname <> all (allowed);
  if bad is not null then raise exception 'unreviewed functions callable by signed-in people: %', bad; end if;

  select string_agg(p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and not coalesce(p.proconfig::text, '') like '%search_path%';
  if bad is not null then raise exception 'definer functions without a fixed search_path: %', bad; end if;

  select string_agg(p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute');
  if bad is not null then raise exception 'definer functions callable without signing in: %', bad; end if;

  select string_agg(table_name, ', ') into bad from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon';
  if bad is not null then raise exception 'tables open to anonymous visitors: %', bad; end if;
end $$;

-- Someone signed in who belongs to no workspace sees no row of any table.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'outsider@example.test');
do $$
declare t record; n bigint; seen bigint := 0; total bigint;
begin
  for t in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname = 'public' and c.relkind = 'r' loop
    execute format('select count(*) from public.%I', t.relname) into n;
    seen := seen + n;
  end loop;
  if seen < 10 then raise exception 'audit has too little data to prove anything (%)', seen; end if;
end $$;
set role authenticated;
do $$
declare t record; n bigint;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
  for t in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname = 'public' and c.relkind = 'r' loop
    begin
      execute format('select count(*) from public.%I', t.relname) into n;
      -- Their own profile is the one row they may see.
      if n > (case when t.relname = 'profiles' then 1 else 0 end) then
        raise exception 'outsider reads % rows of %', n, t.relname;
      end if;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    delete from public.audit_log;
    raise exception 'audit log can be deleted by a signed-in person';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo security audit rules: all checks passed
