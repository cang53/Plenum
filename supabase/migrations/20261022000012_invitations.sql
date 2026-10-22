-- Invitations by email (stage 3, S3-8). A project manager invites an address with a role; when that
-- person signs in, accept_my_invitations() adds them to the workspace and project.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%_@_%'),
  role public.project_role not null,
  invited_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index on public.invitations (project_id, email) where accepted_at is null;

alter table public.invitations enable row level security;

create policy "managers see invitations" on public.invitations
for select using (public.can_manage_project(project_id));
create policy "managers invite" on public.invitations
for insert with check (public.can_manage_project(project_id) and invited_by = auth.uid());
create policy "managers withdraw invitations" on public.invitations
for delete using (public.can_manage_project(project_id) and accepted_at is null);

revoke all on public.invitations from authenticated;
grant select, insert, delete on public.invitations to authenticated;

-- Called after sign-in. Creates the person's profile if needed, then joins them to every project
-- they were invited to (as outside contributors when the role is contributor). Returns how many.
create function public.accept_my_invitations() returns int
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_email text;
  inv record;
  joined int := 0;
begin
  if me is null then return 0; end if;
  -- Only a verified address may claim invitations sent to it.
  select lower(email) into my_email from auth.users where id = me and email_confirmed_at is not null;
  if my_email is null then return 0; end if;
  insert into profiles (id, display_name, email) values (me, split_part(my_email, '@', 1), my_email)
  on conflict do nothing;

  for inv in
    select i.id, i.project_id, i.role, p.workspace_id from invitations i
    join projects p on p.id = i.project_id
    where i.email = my_email and i.accepted_at is null
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
      -- e.g. an existing outside contributor invited as a member: leave it pending.
      raise warning 'invite skipped: %', sqlerrm;
    end;
  end loop;
  return joined;
end;
$$;

revoke all on function public.accept_my_invitations() from public, anon;
grant execute on function public.accept_my_invitations() to authenticated;
