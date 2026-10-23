-- Inbox snooze (S14-17): snoozes are private to the person who set them.
\set ON_ERROR_STOP on

insert into public.messages (id, project_id, external_id, from_address)
values ('50000000-0000-0000-0000-0000000000a9', '20000000-0000-0000-0000-000000000001', '<snooze@mail.example>', 's@mail.example');
insert into public.suggestions (id, project_id, message_id, kind, title)
values ('60000000-0000-0000-0000-0000000000a9', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-0000000000a9', 'task', 'Snooze me');

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
insert into public.suggestion_snoozes (suggestion_id, until) values ('60000000-0000-0000-0000-0000000000a9', now() + interval '1 day');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$
begin
  if exists (select 1 from public.suggestion_snoozes) then raise exception 'a person saw someone else''s snooze'; end if;
  begin
    insert into public.suggestion_snoozes (user_id, suggestion_id, until) values ('00000000-0000-0000-0000-00000000000b', '60000000-0000-0000-0000-0000000000a9', now());
    raise exception 'a person snoozed for someone else';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;
