-- Formatting (bold, italic, colour, lists) of messages written in Plenum. body_text stays the plain words; the app cleans the markup before saving and again before showing.
alter table public.messages add column if not exists body_html text;

drop function if exists public.post_message(uuid, text, text, boolean);
create function public.post_message(p_project uuid, p_body text, p_subject text default '', p_allow_empty boolean default false, p_html text default null) returns uuid
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
  insert into messages (project_id, source, external_id, from_name, from_address, subject, body_text, body_html, sent_at)
  values (
    p_project, 'app', 'app:' || gen_random_uuid(),
    (select display_name from profiles where id = auth.uid()),
    coalesce(auth.jwt() ->> 'email', ''), btrim(coalesce(p_subject, '')), v_body, nullif(btrim(coalesce(p_html, '')), ''), now()
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.post_message from public, anon;
grant execute on function public.post_message to authenticated;
