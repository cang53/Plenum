-- Stores one Teams channel message against the project mapped to that channel. Same shape as ingest_email; only the background job calls it.
-- Returns the message id (the existing one when the message was read before), or null when no open project has that slug.
create function public.ingest_teams(
  p_slug text, p_external_id text, p_from_name text, p_from_id text, p_subject text, p_body_text text, p_sent_at timestamptz
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_project uuid;
  v_message uuid;
begin
  select id into v_project from projects where email_slug = p_slug and archived_at is null;
  if v_project is null then
    return null;
  end if;
  insert into messages (project_id, source, external_id, from_name, from_address, subject, body_text, sent_at)
  values (v_project, 'teams', p_external_id, p_from_name, 'teams:' || p_from_id, coalesce(p_subject, ''), coalesce(p_body_text, ''), p_sent_at)
  on conflict (project_id, external_id) do nothing
  returning id into v_message;
  if v_message is null then
    select id into v_message from messages where project_id = v_project and external_id = p_external_id;
  end if;
  return v_message;
end;
$$;

revoke execute on function public.ingest_teams from public, anon, authenticated;
grant execute on function public.ingest_teams to service_role;
