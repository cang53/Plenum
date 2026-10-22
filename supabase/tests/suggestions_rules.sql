-- Rules for AI triage suggestions (backlog task 10). Runs after linking_rules.sql, reusing its
-- people, project and message. Each block raises an error when a rule is broken.
\set ON_ERROR_STOP on

insert into public.suggestions (id, project_id, message_id, kind, title)
select '60000000-0000-0000-0000-000000000001', project_id, id, 'task', 'Resequence install'
from public.messages where project_id = '20000000-0000-0000-0000-000000000001';

-- A suggestion cannot point at a message of another project, or a second one for the same message.
do $$ begin
  begin
    insert into public.suggestions (project_id, message_id, kind, title)
    values ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000099', 'risk', 'Wrong project');
    raise exception 'suggested for a message of another project';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.suggestions (project_id, message_id, kind, title)
    select project_id, id, 'risk', 'Second' from public.messages where project_id = '20000000-0000-0000-0000-000000000001';
    raise exception 'two suggestions for one message';
  exception when unique_violation then null;
  end;
end $$;

set role authenticated;

-- People cannot write AI output themselves.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    insert into public.suggestions (project_id, message_id, kind, title)
    select project_id, id, 'risk', 'Mine' from public.messages where project_id = '20000000-0000-0000-0000-000000000099';
    raise exception 'a signed-in user wrote a suggestion';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.suggestions set kind = 'risk';
    raise exception 'changed the kind of a suggestion';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Members and contributors read it but cannot decide it; outsiders see nothing.
do $$
declare who uuid; n int;
begin
  foreach who in array array['00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d']::uuid[] loop
    perform set_config('request.jwt.claim.sub', who::text, true);
    select count(*) into n from public.suggestions;
    if n <> 1 then raise exception 'member % saw % suggestions, expected 1', who, n; end if;
    update public.suggestions set status = 'accepted';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'member % decided a suggestion', who; end if;
  end loop;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', true);
  select count(*) into n from public.suggestions;
  if n <> 0 then raise exception 'outsider saw % suggestions', n; end if;
end $$;

-- Pia edits and accepts it; the database stamps who decided; a decision is final.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  update public.suggestions set title = 'Resequence the gearbox install', status = 'accepted';
  if not exists (select 1 from public.suggestions
                 where status = 'accepted' and resolved_by = '00000000-0000-0000-0000-00000000000b' and resolved_at is not null) then
    raise exception 'decision not stamped';
  end if;
  begin
    update public.suggestions set status = 'dismissed';
    raise exception 'changed a decided suggestion';
  exception when raise_exception then
    if sqlerrm = 'changed a decided suggestion' then raise; end if;
  end;
end $$;

-- The trigger function is not callable through the API.
do $$ begin
  begin
    perform public.stamp_suggestion_decision();
    raise exception 'a signed-in user called stamp_suggestion_decision';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
\echo 'suggestion rules: all checks passed'
