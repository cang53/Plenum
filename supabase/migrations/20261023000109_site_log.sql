-- Daily site log (S9-10): one row per site and day, filled by members and managers.
-- Headcount is a single total and there is no author column, so nothing is per person (the audit log records who saved).
create table public.site_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  site text not null check (length(trim(site)) between 1 and 100),
  log_date date not null,
  weather text not null default '' check (length(weather) <= 100),
  headcount integer not null default 0 check (headcount between 0 and 100000),
  work_done text not null default '' check (length(work_done) <= 4000),
  delays text not null default '' check (length(delays) <= 4000),
  unique (project_id, site, log_date)
);
create index site_logs_project_idx on public.site_logs (project_id, log_date desc);

alter table public.site_logs enable row level security;
create policy "members read site logs" on public.site_logs for select using (public.can_see_project(project_id));
revoke all on public.site_logs from anon, authenticated;
grant select on public.site_logs to authenticated;

-- Creates or replaces the log of one site and day; returns its id.
create function public.save_site_log(p_project uuid, p_site text, p_date date, p_weather text, p_headcount integer, p_work text, p_delays text)
returns uuid language plpgsql security definer set search_path = public as $$
declare l uuid;
begin
  if public.project_role_of(p_project) is null or public.project_role_of(p_project) not in ('member', 'project_manager') then raise exception 'not allowed'; end if;
  insert into site_logs (project_id, site, log_date, weather, headcount, work_done, delays)
  values (p_project, trim(p_site), p_date, coalesce(p_weather, ''), coalesce(p_headcount, 0), coalesce(p_work, ''), coalesce(p_delays, ''))
  on conflict (project_id, site, log_date) do update
    set weather = excluded.weather, headcount = excluded.headcount, work_done = excluded.work_done, delays = excluded.delays
  returning id into l;
  perform write_audit(p_project, 'site_log_saved', 'site_logs', l, null);
  return l;
end;
$$;
revoke execute on function public.save_site_log(uuid, text, date, text, integer, text, text) from public, anon;
grant execute on function public.save_site_log(uuid, text, date, text, integer, text, text) to authenticated;

-- The workspace export (S5-3) now also carries the site logs.
create or replace function public.export_workspace(ws uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[];
  result jsonb;
begin
  if not public.is_workspace_admin(ws) then
    raise exception 'only a workspace admin can export' using errcode = 'insufficient_privilege';
  end if;
  select array_agg(id) into ids from projects where workspace_id = ws;
  ids := coalesce(ids, '{}');
  select jsonb_build_object(
    'exported_at', now(),
    'projects', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from projects x where x.workspace_id = ws),
    'project_members', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from project_members x where x.project_id = any (ids)),
    'phases', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from phases x where x.project_id = any (ids)),
    'tasks', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from tasks x where x.project_id = any (ids)),
    'task_dependencies', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from task_dependencies x
      join tasks t on t.id = x.predecessor_id where t.project_id = any (ids)),
    'messages', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from messages x where x.project_id = any (ids)),
    'decisions', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from decisions x where x.project_id = any (ids)),
    'risks', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from risks x where x.project_id = any (ids)),
    'change_requests', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from change_requests x where x.project_id = any (ids)),
    'suggestions', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from suggestions x where x.project_id = any (ids)),
    'site_logs', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from site_logs x where x.project_id = any (ids)),
    'audit_log', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from audit_log x where x.workspace_id = ws)
  ) into result;
  insert into audit_log (workspace_id, project_id, actor_id, action, entity_type, entity_id)
  values (ws, ws, auth.uid(), 'exported', 'workspaces', ws);
  return result;
end;
$$;
