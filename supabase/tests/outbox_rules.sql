-- Rules for the fake email outbox (S3-4). Runs last; Pia (b) manages the project, Ann (a) is admin.
\set ON_ERROR_STOP on

insert into public.outbox (workspace_id, project_id, to_addresses, subject)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '{x@example.com}', 'Hello');

set role authenticated;

do $$
declare who text; want int; n int;
begin
  foreach who in array array['b', 'a', 'c', 'd', 'e'] loop
    perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || who, true);
    select count(*) into n from public.outbox;
    want := case when who in ('a', 'b') then 1 else 0 end;
    if n <> want then raise exception 'user % saw % outbox rows, expected %', who, n, want; end if;
  end loop;
  begin
    insert into public.outbox (workspace_id, to_addresses, subject)
    values ('10000000-0000-0000-0000-000000000001', '{x@example.com}', 'Nope');
    raise exception 'a signed-in user wrote to the outbox';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
