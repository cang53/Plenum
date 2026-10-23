-- S11-6: the caller's own task activity in a date range, the base for the AI timesheet draft. Runs as the caller, so row-level security applies and only the caller's own tasks come back.
create function public.my_week_activity(p_project uuid, p_from date, p_to date)
returns table (task_id uuid, title text, source_message_id uuid, active_on date)
language sql stable security invoker set search_path = public as $$
  select t.id, t.title, t.source_message_id, t.updated_at::date
  from tasks t
  where t.project_id = p_project and t.owner_id = auth.uid()
    and t.updated_at::date between p_from and p_to
  order by t.updated_at, t.title
  limit 200;
$$;
revoke execute on function public.my_week_activity(uuid, date, date) from public, anon;
grant execute on function public.my_week_activity(uuid, date, date) to authenticated;
