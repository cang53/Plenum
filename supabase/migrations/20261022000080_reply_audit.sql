-- Reply from the timeline (S8-1): the app sends the email, then records who replied to which message.
create function public.audit_reply(p_message uuid) returns void
language plpgsql security definer set search_path = public as $$
declare proj uuid;
begin
  select project_id into proj from messages where id = p_message;
  if proj is null or public.project_role_of(proj) is null then raise exception 'not allowed'; end if;
  perform public.write_audit(proj, 'replied', 'messages', p_message, p_message);
end;
$$;
revoke execute on function public.audit_reply(uuid) from public, anon;
grant execute on function public.audit_reply(uuid) to authenticated;
