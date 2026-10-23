-- S11-5: hours of approved weeks for payroll. Only a project manager may call it; entries stay own-only otherwise.
create function public.timesheet_export(p uuid, d_from date, d_to date)
returns table (person text, task text, work_date date, hours numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_manage_project(p) then
    raise exception 'only a project manager can export timesheets' using errcode = 'insufficient_privilege';
  end if;
  return query
    select pr.display_name, t.title, e.work_date, e.hours
    from timesheet_entries e
    join tasks t on t.id = e.task_id
    join profiles pr on pr.id = e.user_id
    where e.project_id = p and e.work_date between d_from and d_to
      and week_locked(p, e.user_id, e.work_date)
    order by pr.display_name, e.work_date, t.title;
end;
$$;
revoke execute on function public.timesheet_export(uuid, date, date) from public, anon;
grant execute on function public.timesheet_export(uuid, date, date) to authenticated;
