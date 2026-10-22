-- Hosted Supabase exposes every public function as an API call. The helpers below only make sense
-- inside policies and triggers, so signed-out visitors get no access to them, and trigger
-- functions are not callable by anyone but the database itself.

revoke execute on function
  public.is_workspace_member(uuid),
  public.is_workspace_staff(uuid),
  public.is_workspace_admin(uuid),
  public.project_role_of(uuid),
  public.can_see_project(uuid),
  public.can_manage_project(uuid),
  public.create_project(uuid, text, text)
from public, anon;

grant execute on function
  public.is_workspace_member(uuid),
  public.is_workspace_staff(uuid),
  public.is_workspace_admin(uuid),
  public.project_role_of(uuid),
  public.can_see_project(uuid),
  public.can_manage_project(uuid),
  public.create_project(uuid, text, text)
to authenticated;

revoke execute on function
  public.add_creator_as_manager(),
  public.check_project_member(),
  public.lock_project_fields(),
  public.check_task_shape(),
  public.limit_task_edits(),
  public.check_dependency(),
  public.lock_phase_project()
from public, anon, authenticated;
