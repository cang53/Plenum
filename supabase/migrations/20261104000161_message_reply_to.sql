-- A reply remembers the message it answers, so the Stream can quote it and jump back to it.
alter table public.messages add column if not exists reply_to uuid references public.messages(id) on delete set null;

drop function if exists public.post_message(uuid, text, text, boolean, text);
create function public.post_message(p_project uuid, p_body text, p_subject text default '', p_allow_empty boolean default false, p_html text default null, p_reply_to uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if not coalesce(public.can_see_project(p_project), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_body = '' and not coalesce(p_allow_empty, false) then
    raise exception 'message is empty' using errcode = '22023';
  end if;
  insert into messages (project_id, source, external_id, from_name, from_address, subject, body_text, body_html, reply_to, sent_at)
  values (
    p_project, 'app', 'app:' || gen_random_uuid(),
    (select display_name from profiles where id = auth.uid()),
    coalesce(auth.jwt() ->> 'email', ''), btrim(coalesce(p_subject, '')), v_body, nullif(btrim(coalesce(p_html, '')), ''),
    (select id from messages where id = p_reply_to and project_id = p_project), now()
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.post_message from public, anon;
grant execute on function public.post_message to authenticated;
