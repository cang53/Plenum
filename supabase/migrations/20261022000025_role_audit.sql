-- Roles screen (stage 5, S5-5): every role change is recorded by the database (entity_id is the person).
create function public.audit_role_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role then
    perform public.write_audit(new.project_id, 'role_changed', 'project_members', new.user_id, null);
  end if;
  return new;
end;
$$;
revoke execute on function public.audit_role_changed() from public, anon, authenticated;
create trigger project_members_audit after update on public.project_members
for each row execute function public.audit_role_changed();
