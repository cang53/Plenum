-- Reward history (S13-3): past months that had a team challenge, newest first, with the counts from team_goal_progress.
-- A month where every week was on time earns the "challenge met" badge. Team level only; no names.
create function public.team_goal_history(p uuid) returns table (month date, weeks_done int, weeks_total int)
language sql stable security definer set search_path = public as $$
  select g.month, r.weeks_done, r.weeks_total
  from team_goals g, lateral public.team_goal_progress(p, g.month) r
  where g.project_id = p and g.month < date_trunc('month', current_date)::date and public.can_see_project(p)
  order by g.month desc
  limit 24;
$$;
revoke execute on function public.team_goal_history(uuid) from public, anon;
grant execute on function public.team_goal_history(uuid) to authenticated;
