-- Invitation expiry and resend (stage 4, S4-1). An invitation stops working 14 days after it was sent;
-- a manager can resend it (new expiry) or withdraw it (delete, already allowed).

alter table public.invitations add column expires_at timestamptz not null default now() + interval '14 days';

create policy "managers resend invitations" on public.invitations
for update using (public.can_manage_project(project_id) and accepted_at is null)
with check (public.can_manage_project(project_id) and accepted_at is null);
grant update (expires_at) on public.invitations to authenticated;

-- Same as before, but expired invitations are skipped.
create or replace function public.accept_my_invitations() returns int
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_email text;
  inv record;
  joined int := 0;
begin
  if me is null then return 0; end if;
  select lower(email) into my_email from auth.users where id = me and email_confirmed_at is not null;
  if my_email is null then return 0; end if;
  insert into profiles (id, display_name, email) values (me, split_part(my_email, '@', 1), my_email)
  on conflict do nothing;

  for inv in
    select i.id, i.project_id, i.role, p.workspace_id from invitations i
    join projects p on p.id = i.project_id
    where i.email = my_email and i.accepted_at is null and i.expires_at > now()
  loop
    begin
      insert into workspace_members (workspace_id, user_id, kind)
      values (inv.workspace_id, me, (case when inv.role = 'contributor' then 'contributor' else 'staff' end)::member_kind)
      on conflict do nothing;
      insert into project_members (project_id, user_id, role) values (inv.project_id, me, inv.role)
      on conflict (project_id, user_id) do update set role = excluded.role;
      update invitations set accepted_at = now() where id = inv.id;
      joined := joined + 1;
    exception when others then
      raise warning 'invite skipped: %', sqlerrm;
    end;
  end loop;
  return joined;
end;
$$;
