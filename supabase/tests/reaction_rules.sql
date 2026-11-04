-- Reactions: members react as themselves and toggle; CobIA reacts once; outsiders cannot react or read.
\set ON_ERROR_STOP on
insert into public.messages (id, project_id, external_id, from_address)
values ('5b000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', '<react-src@mail.example>', 'x@mail.example');
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  perform public.toggle_reaction('5b000000-0000-0000-0000-0000000000a1', '👍');
  perform public.agent_react('5b000000-0000-0000-0000-0000000000a1', '👀');
  perform public.agent_react('5b000000-0000-0000-0000-0000000000a1', '👀');
  if (select count(*) from public.message_reactions where message_id = '5b000000-0000-0000-0000-0000000000a1') <> 2 then raise exception 'expected one person and one agent reaction'; end if;
  perform public.toggle_reaction('5b000000-0000-0000-0000-0000000000a1', '👍');
  if exists (select 1 from public.message_reactions where user_id is not null) then raise exception 'second click must remove the reaction'; end if;
  begin perform public.toggle_reaction('5b000000-0000-0000-0000-0000000000a1', '💩'); raise exception 'odd emoji accepted';
  exception when check_violation then null; end;
  begin insert into public.message_reactions (message_id, project_id, emoji, agent) values ('5b000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', '🎉', true); raise exception 'direct write allowed';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', true);
  if (select count(*) from public.message_reactions) <> 0 then raise exception 'outsider reads reactions'; end if;
  begin perform public.toggle_reaction('5b000000-0000-0000-0000-0000000000a1', '👍'); raise exception 'outsider reacted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
