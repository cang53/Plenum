-- A site log can start from a message (S10-2): the log keeps a link to it. A person still reviews and saves; nothing is filed automatically.
alter table public.site_logs add column source_message_id uuid references public.messages (id) on delete set null;

drop function public.save_site_log(uuid, text, date, text, integer, text, text);
create function public.save_site_log(p_project uuid, p_site text, p_date date, p_weather text, p_headcount integer, p_work text, p_delays text, p_source uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare l uuid;
begin
  if public.project_role_of(p_project) is null or public.project_role_of(p_project) not in ('member', 'project_manager') then raise exception 'not allowed'; end if;
  if p_source is not null and not exists (select 1 from messages where id = p_source and project_id = p_project) then
    raise exception 'the source message is not in this project';
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
revoke execute on function public.save_site_log(uuid, text, date, text, integer, text, text, uuid) from public, anon;
grant execute on function public.save_site_log(uuid, text, date, text, integer, text, text, uuid) to authenticated;
