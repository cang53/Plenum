-- Onboarding (stage 4, S4-6): a person with no workspace creates one, plus a first project and
-- optionally a small demo plan. Security definer because nobody may insert workspaces directly;
-- the person becomes workspace admin and (through the existing trigger) project manager.
create function public.onboard(workspace_name text, project_name text, slug text, with_demo boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  ws uuid := gen_random_uuid();
  proj uuid := gen_random_uuid();
  phase uuid := gen_random_uuid();
begin
  if me is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from workspace_members where user_id = me)
     or exists (select 1 from project_members where user_id = me) then
    raise exception 'you already belong to a workspace' using errcode = 'insufficient_privilege';
  end if;
  insert into profiles (id, display_name, email)
  select id, split_part(email, '@', 1), email from auth.users where id = me
  on conflict do nothing;
  insert into workspaces (id, name) values (ws, workspace_name);
  insert into workspace_members (workspace_id, user_id, kind, is_admin) values (ws, me, 'staff', true);
  insert into projects (id, workspace_id, name, email_slug, created_by) values (proj, ws, project_name, slug, me);
  if with_demo then
    insert into phases (id, project_id, name, position) values (phase, proj, 'Demo: getting started', 0);
    insert into tasks (project_id, phase_id, title, owner_id, start_date, due_date, status, position) values
      (proj, phase, 'Look around the board', me, current_date, current_date + 2, 'in_progress', 0),
      (proj, phase, 'Invite a colleague', me, current_date + 2, current_date + 4, 'todo', 1),
      (proj, phase, 'Delete the demo tasks', me, current_date + 4, current_date + 7, 'todo', 2);
  end if;
  return proj;
end;
$$;

revoke execute on function public.onboard(text, text, text, boolean) from public, anon;
grant execute on function public.onboard(text, text, text, boolean) to authenticated;
