-- Email threading: mail with the same subject (re:/fwd:/case ignored) joins one thread; a new subject starts one; app messages do not.
\set ON_ERROR_STOP on
reset role;
insert into public.messages (id, project_id, external_id, from_address, subject, source, received_at) values
  ('5d000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', '<t1@x>', 'a@x', 'Crane booking', 'email', now()),
  ('5d000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-000000000001', '<t2@x>', 'b@x', 'RE: crane booking', 'email', now()),
  ('5d000000-0000-0000-0000-0000000000a3', '20000000-0000-0000-0000-000000000001', '<t3@x>', 'a@x', 'Fwd: Crane booking', 'email', now()),
  ('5d000000-0000-0000-0000-0000000000a4', '20000000-0000-0000-0000-000000000001', '<t4@x>', 'a@x', 'Permit', 'email', now()),
  ('5d000000-0000-0000-0000-0000000000a5', '20000000-0000-0000-0000-000000000001', '<t5@x>', 'a@x', '', 'email', now()),
  ('5d000000-0000-0000-0000-0000000000a6', '20000000-0000-0000-0000-000000000001', 'app:t6', 'a@x', 'Crane booking', 'app', now());
do $$
declare t1 uuid; t4 uuid; room uuid;
begin
  select thread_id into t1 from public.messages where id = '5d000000-0000-0000-0000-0000000000a1';
  if t1 is null then raise exception 'first mail started no thread'; end if;
  if (select count(*) from public.messages where thread_id = t1) <> 3 then raise exception 'replies did not join the thread'; end if;
  if (select title from public.threads where id = t1) <> 'Crane booking' then raise exception 'thread title wrong'; end if;
  if (select root_message_id from public.threads where id = t1) <> '5d000000-0000-0000-0000-0000000000a1' then raise exception 'wrong root'; end if;
  select thread_id into t4 from public.messages where id = '5d000000-0000-0000-0000-0000000000a4';
  if t4 is null or t4 = t1 then raise exception 'new subject must start its own thread'; end if;
  if (select thread_id from public.messages where id = '5d000000-0000-0000-0000-0000000000a5') is not null then raise exception 'mail without subject got a thread'; end if;
  if (select thread_id from public.messages where id = '5d000000-0000-0000-0000-0000000000a6') is not null then raise exception 'an app message was threaded by subject'; end if;
  -- A moved thread keeps receiving mail in its new chatroom.
  insert into public.chatrooms (project_id, name) values ('20000000-0000-0000-0000-000000000001', 'Cranes') returning id into room;
  update public.threads set chatroom_id = room where id = t1;
  update public.messages set chatroom_id = room where thread_id = t1;
  insert into public.messages (id, project_id, external_id, from_address, subject, source) values ('5d000000-0000-0000-0000-0000000000a7', '20000000-0000-0000-0000-000000000001', '<t7@x>', 'a@x', 'crane booking', 'email');
  if (select chatroom_id from public.messages where id = '5d000000-0000-0000-0000-0000000000a7') <> room then raise exception 'late mail did not follow the moved thread'; end if;
end $$;
-- Replies are flagged so the chatroom feed can fold them behind the thread's first message.
do $$
begin
  if (select thread_reply from public.messages where id = '5d000000-0000-0000-0000-0000000000a1') then raise exception 'the first mail is not a reply'; end if;
  if not (select thread_reply from public.messages where id = '5d000000-0000-0000-0000-0000000000a2') then raise exception 'a later mail is a reply'; end if;
  if (select thread_reply from public.messages where id = '5d000000-0000-0000-0000-0000000000a6') then raise exception 'an app message outside a thread is not a reply'; end if;
end $$;
