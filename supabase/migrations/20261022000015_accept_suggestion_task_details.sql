-- A task made from a suggestion now keeps the suggestion's details (tasks have a details column since migration 14).

create or replace function public.accept_suggestion(p_id uuid, p_kind text, p_title text, p_details text)
returns uuid
language plpgsql set search_path = public as $$
declare
  s public.suggestions;
  item uuid;
begin
  update public.suggestions set title = p_title, details = coalesce(p_details, ''), status = 'accepted'
  where id = p_id returning * into s;
  if not found then
    raise exception 'suggestion not found or not allowed';
  end if;
  case p_kind
    when 'task' then
      insert into public.tasks (project_id, source_message_id, title, details)
      values (s.project_id, s.message_id, p_title, left(s.details, 5000)) returning id into item;
    when 'decision' then
      insert into public.decisions (project_id, source_message_id, title, details)
      values (s.project_id, s.message_id, p_title, s.details) returning id into item;
    when 'risk' then
      insert into public.risks (project_id, source_message_id, title, details)
      values (s.project_id, s.message_id, p_title, s.details) returning id into item;
    when 'change_request' then
      insert into public.change_requests (project_id, source_message_id, title, details)
      values (s.project_id, s.message_id, p_title, s.details) returning id into item;
    else
      raise exception 'unknown kind';
  end case;
  return item;
end;
$$;
