-- Accepting a suggestion (backlog S3-6): the wording a person settled on becomes a task, decision,
-- risk or change request linked to the source message, and the suggestion is marked accepted,
-- in one transaction. Runs as the caller, so row-level security still decides who may do it.

create function public.accept_suggestion(p_id uuid, p_kind text, p_title text, p_details text)
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
      insert into public.tasks (project_id, source_message_id, title)
      values (s.project_id, s.message_id, p_title) returning id into item;
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

revoke execute on function public.accept_suggestion(uuid, text, text, text) from public, anon;
grant execute on function public.accept_suggestion(uuid, text, text, text) to authenticated;
