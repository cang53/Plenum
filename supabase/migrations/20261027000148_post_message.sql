-- A person on the project writes a message into its stream; the subject puts it in a conversation. Only this function writes app messages, so the sender
-- is always the caller and the project is checked here; people still cannot insert into messages directly.
create function public.post_message(p_project uuid, p_body text, p_subject text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if not public.can_see_project(p_project) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_body = '' then
    raise exception 'message is empty' using errcode = '22023';
  end if;
  insert into messages (project_id, source, external_id, from_name, from_address, subject, body_text, sent_at)
  values (
    p_project, 'app', 'app:' || gen_random_uuid(),
    (select display_name from profiles where id = auth.uid()),
    coalesce(auth.jwt() ->> 'email', ''), btrim(coalesce(p_subject, '')), v_body, now()
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.post_message from public, anon;
grant execute on function public.post_message to authenticated;
