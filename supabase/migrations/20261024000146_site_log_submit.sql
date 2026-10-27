-- Submit a day (design: Site log sign-off). A submitted log is locked and shows who signed and when.
-- The sign-off is a record of the sign-off only: the log itself still has no author and no per-person fields.
alter table public.site_logs
  add column submitted_at timestamptz,
  add column submitted_by uuid references public.profiles (id) on delete set null;

-- Same as before, but a submitted day cannot be changed.
create or replace function public.save_site_log(p_project uuid, p_site text, p_date date, p_weather text, p_headcount integer, p_work text, p_delays text, p_source uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare l uuid;
begin
  if public.project_role_of(p_project) is null or public.project_role_of(p_project) not in ('member', 'project_manager') then raise exception 'not allowed'; end if;
  if p_source is not null and not exists (select 1 from messages where id = p_source and project_id = p_project) then
    raise exception 'the source message is not in this project';
  end if;
  if exists (select 1 from site_logs where project_id = p_project and site = trim(p_site) and log_date = p_date and submitted_at is not null) then
    raise exception 'this day is submitted and locked';
  end if;
  insert into site_logs (project_id, site, log_date, weather, headcount, work_done, delays, source_message_id)
  values (p_project, trim(p_site), p_date, coalesce(p_weather, ''), coalesce(p_headcount, 0), coalesce(p_work, ''), coalesce(p_delays, ''), p_source)
  on conflict (project_id, site, log_date) do update
    set weather = excluded.weather, headcount = excluded.headcount, work_done = excluded.work_done, delays = excluded.delays,
        source_message_id = coalesce(excluded.source_message_id, site_logs.source_message_id)
  returning id into l;
  perform write_audit(p_project, 'site_log_saved', 'site_logs', l, p_source);
  return l;
end;
$$;

create function public.submit_site_log(p_log uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p uuid;
begin
  select project_id into p from site_logs where id = p_log;
  if p is null or public.project_role_of(p) is null or public.project_role_of(p) not in ('member', 'project_manager') then raise exception 'not allowed'; end if;
  update site_logs set submitted_at = now(), submitted_by = auth.uid() where id = p_log and submitted_at is null;
  if not found then raise exception 'this day is already submitted'; end if;
  perform write_audit(p, 'site_log_submitted', 'site_logs', p_log, null);
end;
$$;
revoke execute on function public.submit_site_log(uuid) from public, anon;
grant execute on function public.submit_site_log(uuid) to authenticated;
