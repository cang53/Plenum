-- Team challenge (S12-6): a project manager sets a monthly goal, "all timesheets in by Friday".
-- Progress is a count of weeks for the whole team; nobody can read who was late.
alter table public.timesheet_weeks add column submitted_at timestamptz not null default now();

create table public.team_goals (
  project_id uuid not null references public.projects (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  primary key (project_id, month)
);
alter table public.team_goals enable row level security;
create policy "members read goals" on public.team_goals for select using (public.can_see_project(project_id));
revoke all on public.team_goals from anon, authenticated;
grant select on public.team_goals to authenticated;

-- Sets (on = true) or clears the goal for the month of p_day; project managers only. Audited.
create function public.set_team_goal(p uuid, p_day date, on_ boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m date := date_trunc('month', p_day)::date;
begin
  if not public.can_manage_project(p) then
    raise exception 'only a project manager can set a team goal' using errcode = 'insufficient_privilege';
  end if;
  if on_ then insert into team_goals (project_id, month) values (p, m) on conflict do nothing;
  else delete from team_goals where project_id = p and month = m;
  end if;
  insert into audit_log (workspace_id, project_id, actor_id, action, entity_type, entity_id)
  select workspace_id, p, auth.uid(), 'updated', 'team_goal', p from projects where id = p;
end;
$$;
revoke execute on function public.set_team_goal(uuid, date, boolean) from public, anon;
grant execute on function public.set_team_goal(uuid, date, boolean) to authenticated;

-- Weeks of the month (Monday starts) in which every member submitted before Saturday, out of the weeks begun so far.
-- Counts only; one row, no names. Empty when no goal is set for the month.
create function public.team_goal_progress(p uuid, p_day date) returns table (weeks_done int, weeks_total int)
language sql stable security definer set search_path = public as $$
  with m as (select date_trunc('month', p_day)::date as first),
  mondays as (
    select d::date as w from m, generate_series(m.first - ((extract(isodow from m.first)::int + 6) % 7), least(current_date, (m.first + interval '1 month - 1 day')::date), interval '7 days') d
    where d::date + 6 >= m.first
  ),
  team as (select count(*) as n from project_members where project_id = p)
  select (select count(*) from mondays x where (select n from team) > 0 and
           (select count(*) from timesheet_weeks t where t.project_id = p and t.week_start = x.w and t.submitted_at < x.w + 5) >= (select n from team))::int,
         (select count(*) from mondays)::int
  where public.can_see_project(p) and exists (select 1 from team_goals g, m where g.project_id = p and g.month = m.first);
$$;
revoke execute on function public.team_goal_progress(uuid, date) from public, anon;
grant execute on function public.team_goal_progress(uuid, date) to authenticated;
