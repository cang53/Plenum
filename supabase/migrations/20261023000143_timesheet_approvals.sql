-- S14-21: the approvals list. Managers read hours per person and week; everyone with a project role reads counts only.
-- Entries stay own-only for direct reads, like the export.
create function public.week_hours(p uuid, d_from date) returns table (user_id uuid, week_start date, hours numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_manage_project(p) then
    raise exception 'only a project manager can read weekly hours' using errcode = 'insufficient_privilege';
  end if;
  return query select e.user_id, date_trunc('week', e.work_date)::date, sum(e.hours) from timesheet_entries e
    where e.project_id = p and e.work_date >= d_from group by 1, 2;
end;
$$;

-- One person's week by task and day, for the Review panel. Managers only.
create function public.week_detail(p uuid, u uuid, w date) returns table (task text, work_date date, hours numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_manage_project(p) then
    raise exception 'only a project manager can read weekly hours' using errcode = 'insufficient_privilege';
  end if;
  return query select t.title, e.work_date, e.hours from timesheet_entries e join tasks t on t.id = e.task_id
    where e.project_id = p and e.user_id = u and e.work_date between w and w + 6 order by t.title, e.work_date;
end;
$$;

-- "9 of 12 timesheets in": submitted weeks and members for one week. No names, so members and managers see the same.
create function public.week_counts(p uuid, w date) returns table (submitted int, members int)
language sql stable security definer set search_path = public as $$
  select (select count(*) from timesheet_weeks t where t.project_id = p and t.week_start = w)::int,
         (select count(*) from project_members m where m.project_id = p)::int
  where public.project_role_of(p) is not null;
$$;
revoke execute on function public.week_hours(uuid, date), public.week_detail(uuid, uuid, date), public.week_counts(uuid, date) from public, anon;
grant execute on function public.week_hours(uuid, date), public.week_detail(uuid, uuid, date), public.week_counts(uuid, date) to authenticated;
