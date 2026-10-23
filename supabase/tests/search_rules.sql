-- Search rules (stage 4, S4-4). Runs last. Pia is a manager of project 1; Eve is not a member.
\set ON_ERROR_STOP on
reset role;
insert into public.messages (id, project_id, external_id, from_address, subject, body_text)
values ('50000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'search-1', 'x@example.com', 'Scaffold delivery', 'The crane arrives Monday');
insert into public.decisions (project_id, title, details)
values ('20000000-0000-0000-0000-000000000001', 'Use tower crane', 'Cheaper than a mobile one');
insert into public.messages (id, project_id, external_id, from_address, subject, body_text, received_at)
values ('50000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-000000000001', 'search-2', 'y@example.com', 'Kranen besteld', 'De kraan komt maandag', '2020-01-15');
insert into public.tasks (id, project_id, title, source_message_id)
values ('60000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'Zoek-taak', '50000000-0000-0000-0000-0000000000a2');
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
  if exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'zzzznothing')) then
    raise exception 'search matched nothing-word';
  end if;
  -- English and Dutch stems: "cranes" finds "crane"; "kranen" finds "kraan".
  if not exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'cranes') where kind = 'decision') then
    raise exception 'english stemming failed';
  end if;
  if not exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'kranen') where id = '50000000-0000-0000-0000-0000000000a2') then
    raise exception 'dutch stemming failed';
  end if;
  -- A match in the title outranks one in the body.
  if (select id from public.search_project('20000000-0000-0000-0000-000000000001', 'crane') where kind <> 'task' limit 1) <> (select id from public.decisions where title = 'Use tower crane') then
    raise exception 'title match did not rank first';
  end if;
  -- Matches are marked for the page.
  if not exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'crane') where snippet like '%' || chr(2) || '%' || chr(3) || '%') then
    raise exception 'snippet has no highlight';
  end if;
  -- Date filter (inclusive days) and linked-task filter.
  if (select count(*) from public.search_project('20000000-0000-0000-0000-000000000001', 'kraan', 0, '2020-01-15', '2020-01-15')) <> 1
     or exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'kraan', 0, '2020-01-16')) then
    raise exception 'date filter wrong';
  end if;
  if (select count(*) from public.search_project('20000000-0000-0000-0000-000000000001', 'kraan', 0, null, null, '60000000-0000-0000-0000-0000000000a1')) <> 1
     or exists (select 1 from public.search_project('20000000-0000-0000-0000-000000000001', 'crane', 0, null, null, '60000000-0000-0000-0000-0000000000a1')) then
    raise exception 'linked-task filter wrong';
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
