-- CobIA answers where it was asked: an answer to a message in a thread goes into that thread, and an answer elsewhere stays in the same chatroom.
create or replace function public.post_agent_reply(p_message uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  m messages;
  v_id uuid;
begin
  select * into m from messages where id = p_message;
  if m.id is null or not coalesce(public.can_see_project(m.project_id), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if btrim(coalesce(p_body, '')) = '' then
    raise exception 'reply is empty' using errcode = '22023';
  end if;
  insert into messages (project_id, chatroom_id, thread_id, source, external_id, from_name, from_address, subject, body_text, reply_to, sent_at)
  values (m.project_id, m.chatroom_id, m.thread_id, 'app', 'agent:' || gen_random_uuid(), 'Plenum agent', 'agent@plenum.app', '', left(btrim(p_body), 4000), p_message, now())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.post_agent_reply from public, anon;
grant execute on function public.post_agent_reply to authenticated;
