-- Chatroom and thread rules: General exists, messages land in a chatroom, threads start from a message, outsiders can do nothing.
\set ON_ERROR_STOP on
reset role;
insert into public.messages (id, project_id, external_id, from_address)
values ('5c000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', '<room-src@mail.example>', 'x@mail.example');

do $$
begin
  if (select count(*) from public.chatrooms where project_id = '20000000-0000-0000-0000-000000000001' and is_general) <> 1 then raise exception 'General missing'; end if;
  if (select chatroom_id from public.messages where id = '5c000000-0000-0000-0000-0000000000a1') <> (select id from public.chatrooms where project_id = '20000000-0000-0000-0000-000000000001' and is_general) then
    raise exception 'a message with no chatroom must land in General';
  end if;
end $$;

set role authenticated;
do $$
declare room uuid; th uuid; posted uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  room := public.create_chatroom('20000000-0000-0000-0000-000000000001', 'Gearbox delay', '⚙️');
  th := public.start_thread('5c000000-0000-0000-0000-0000000000a1', 'Order status');
  if (select thread_id from public.messages where id = '5c000000-0000-0000-0000-0000000000a1') <> th then raise exception 'root message not in its thread'; end if;
  begin perform public.start_thread('5c000000-0000-0000-0000-0000000000a1', 'Again'); raise exception 'second thread on one message';
  exception when invalid_parameter_value then null; end;
  -- A reply into the thread lands in the thread's chatroom, whatever chatroom was asked for.
  posted := public.post_message('20000000-0000-0000-0000-000000000001', 'Delivery is Friday', '', false, null, null, th, room);
  if (select thread_id from public.messages where id = posted) <> th then raise exception 'reply not in thread'; end if;
  if (select chatroom_id from public.messages where id = posted) <> (select chatroom_id from public.threads where id = th) then raise exception 'reply not in the thread chatroom'; end if;
  -- A message posted to a chatroom stays there; with no thread it has none.
  posted := public.post_message('20000000-0000-0000-0000-000000000001', 'Hello gearbox', '', false, null, null, null, room);
  if (select chatroom_id from public.messages where id = posted) <> room or (select thread_id from public.messages where id = posted) is not null then raise exception 'chatroom post wrong'; end if;
  -- Moving the thread is a click by a member; its messages follow.
  perform public.move_thread(th, room);
  if exists (select 1 from public.messages where thread_id = th and chatroom_id <> room) then raise exception 'thread messages did not move'; end if;
  -- A contributor reads but cannot create or start anything.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
  if (select count(*) from public.chatrooms where project_id = '20000000-0000-0000-0000-000000000001') < 2 then raise exception 'contributor cannot read chatrooms'; end if;
  begin perform public.create_chatroom('20000000-0000-0000-0000-000000000001', 'Nope'); raise exception 'contributor made a chatroom';
  exception when insufficient_privilege then null; end;
  begin perform public.move_thread(th, (select id from public.chatrooms where is_general and project_id = '20000000-0000-0000-0000-000000000001')); raise exception 'contributor moved a thread';
  exception when insufficient_privilege then null; end;
  -- An outsider sees nothing and can do nothing.
  perform set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
  if (select count(*) from public.chatrooms) <> 0 or (select count(*) from public.threads) <> 0 then raise exception 'outsider reads chatrooms or threads'; end if;
  begin perform public.create_chatroom('20000000-0000-0000-0000-000000000001', 'Nope'); raise exception 'outsider made a chatroom';
  exception when insufficient_privilege then null; end;
  begin perform public.post_message('20000000-0000-0000-0000-000000000001', 'x', '', false, null, null, th, null); raise exception 'outsider posted into a thread';
  exception when insufficient_privilege then null; end;
  begin insert into public.chatrooms (project_id, name) values ('20000000-0000-0000-0000-000000000001', 'Direct'); raise exception 'direct insert';
  exception when insufficient_privilege then null; end;
end $$;
-- A thread cannot be pointed at a chatroom of another project.
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  begin
    perform public.move_thread((select id from public.threads limit 1), (select id from public.chatrooms where project_id = '20000000-0000-0000-0000-000000000099'));
    raise exception 'thread moved across projects';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
