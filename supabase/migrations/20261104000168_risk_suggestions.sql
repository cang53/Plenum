-- CobIA can suggest a risk or an issue from the Stream with its type, likelihood and severity filled in.
-- Accepting still needs a manager's click (existing suggestion policies); the new risk keeps its source message link.
alter table public.suggestions
  add column if not exists risk_kind text not null default 'risk' check (risk_kind in ('risk', 'issue')),
  add column if not exists likelihood smallint not null default 3 check (likelihood between 1 and 5),
  add column if not exists severity smallint not null default 3 check (severity between 1 and 5);

drop function if exists public.accept_suggestion(uuid, text, text, text);

-- Same as before; for a risk, the person's (possibly edited) type, likelihood and severity are used, else the suggestion's.
create or replace function public.accept_suggestion(p_id uuid, p_kind text, p_title text, p_details text,
  p_risk_kind text default null, p_likelihood int default null, p_severity int default null)
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
      insert into public.risks (project_id, source_message_id, title, details, kind, likelihood, severity)
      values (s.project_id, s.message_id, p_title, s.details,
        coalesce(p_risk_kind, s.risk_kind), coalesce(p_likelihood, s.likelihood), coalesce(p_severity, s.severity)) returning id into item;
    when 'change_request' then
      insert into public.change_requests (project_id, source_message_id, title, details)
      values (s.project_id, s.message_id, p_title, s.details) returning id into item;
    else
      raise exception 'unknown kind';
  end case;
  return item;
end;
$$;
