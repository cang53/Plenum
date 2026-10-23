-- S11-4: hours in an approved week can no longer be changed or cleared through save_hours.
create or replace function public.save_hours(p_task uuid, p_date date, p_hours numeric)
returns void language plpgsql security definer set search_path = public as $$
declare pr uuid;
begin
  select project_id into pr from tasks where id = p_task;
  if pr is null or public.project_role_of(pr) is null then raise exception 'not allowed'; end if;
  if public.week_locked(pr, auth.uid(), p_date) then
    raise exception 'an approved week is locked' using errcode = 'insufficient_privilege';
  end if;
  if p_hours = 0 then
    delete from timesheet_entries where task_id = p_task and user_id = auth.uid() and work_date = p_date;
    return;
  end if;
  insert into timesheet_entries (project_id, task_id, user_id, work_date, hours)
  values (pr, p_task, auth.uid(), p_date, p_hours)
  on conflict (task_id, user_id, work_date) do update set hours = excluded.hours;
end;
$$;
