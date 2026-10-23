-- S11-3: hours per task per day. Each person sees and writes only their own hours; managers get no read access here (approval and export come in later rows).
create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  work_date date not null,
  hours numeric(4, 2) not null check (hours > 0 and hours <= 24),
  unique (task_id, user_id, work_date)
);
create index timesheet_entries_user_idx on public.timesheet_entries (user_id, project_id, work_date);

alter table public.timesheet_entries enable row level security;
create policy "own hours" on public.timesheet_entries for select using (user_id = auth.uid() and public.can_see_project(project_id));
revoke all on public.timesheet_entries from anon, authenticated;
grant select on public.timesheet_entries to authenticated;

-- Sets the caller's hours for one task and day; 0 removes the entry. Returns nothing.
create function public.save_hours(p_task uuid, p_date date, p_hours numeric)
returns void language plpgsql security definer set search_path = public as $$
declare pr uuid;
begin
  select project_id into pr from tasks where id = p_task;
  if pr is null or public.project_role_of(pr) is null then raise exception 'not allowed'; end if;
  if p_hours = 0 then
    delete from timesheet_entries where task_id = p_task and user_id = auth.uid() and work_date = p_date;
    return;
  end if;
  insert into timesheet_entries (project_id, task_id, user_id, work_date, hours)
  values (pr, p_task, auth.uid(), p_date, p_hours)
  on conflict (task_id, user_id, work_date) do update set hours = excluded.hours;
end;
$$;
revoke execute on function public.save_hours(uuid, date, numeric) from public, anon;
grant execute on function public.save_hours(uuid, date, numeric) to authenticated;
