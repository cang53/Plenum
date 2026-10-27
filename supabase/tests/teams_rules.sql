-- Rules for reading Teams channel messages. Runs last and uses any project left by the earlier tests.
\set ON_ERROR_STOP on

select set_config('teams.slug', email_slug, false) from public.projects where archived_at is null limit 1;
set role service_role;
do $$
declare a uuid; b uuid; slug text := current_setting('teams.slug');
begin
  a := public.ingest_teams(slug, 'teams:1', 'Jan', 'u1', null, 'Hello from Teams', now());
  b := public.ingest_teams(slug, 'teams:1', 'Jan', 'u1', null, 'Hello from Teams', now());
  if a is null or a is distinct from b then raise exception 'a message read twice must be stored once'; end if;
  if public.ingest_teams('no-such-project', 'teams:2', null, 'u1', null, 'x', null) is not null then raise exception 'unknown project stored a message'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.messages where source = 'teams') <> 1 then raise exception 'expected one stored Teams message'; end if;
end $$;

-- People cannot write Teams messages themselves.
set role authenticated;
do $$ begin
  begin
    perform public.ingest_teams('x', 'teams:3', null, 'u1', null, 'x', null);
    raise exception 'a signed-in person called ingest_teams';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
