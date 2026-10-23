-- Search rules (stage 4, S4-4). Runs last. Pia is a manager of project 1; Eve is not a member.
\set ON_ERROR_STOP on
reset role;
insert into public.messages (id, project_id, external_id, from_address, subject, body_text)
values ('50000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'search-1', 'x@example.com', 'Scaffold delivery', 'The crane arrives Monday');
insert into public.decisions (project_id, title, details)
values ('20000000-0000-0000-0000-000000000001', 'Use tower crane', 'Cheaper than a mobile one');
set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  -- "crane" is in a task description, a message body and a decision title.
  if (select count(distinct kind) from public.search_project('20000000-0000-0000-0000-000000000001', 'crane')) <> 3 then
    raise exception 'search missed a kind of item';
  end if;
  -- The sender's name or address finds their message, even if the word is not in the text.
  if not exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'x@example.com')) then
    raise exception 'search missed a message by sender';
  end if;
  -- A date range in the past or the future finds nothing; today's range finds the message.
  if exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'crane', 0, '2000-01-01', '2000-01-02')) then
    raise exception 'date range ignored';
  end if;
  if not exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'crane', 0, current_date, current_date)) then
    raise exception 'date range missed today';
  end if;
  -- A linked task that does not exist leaves no message or decision.
  if exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'crane', 0, null, null, gen_random_uuid())) then
    raise exception 'linked task filter ignored';
  end if;
  if exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'zzzznothing')) then
    raise exception 'search matched nothing-word';
  end if;
end $$;

-- An outsider finds nothing, even in a project they ask for by id.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  if exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'crane')) then
    raise exception 'outsider found project items';
  end if;
end $$;
do $$ begin raise notice 'search rules: all checks passed'; end $$;
