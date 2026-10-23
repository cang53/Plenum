-- Weekly report (S10-3): adds one line per site from the last 7 days of site logs: days logged, headcount-days, delay days. Totals only, nothing per person.
create or replace function public.draft_status_reports() returns int
language sql security definer set search_path = public as $$
  with line as (
    select project_id, 1 as ord, title, source_message_id, null::date as due from tasks where status = 'done' and updated_at > now() - interval '7 days'
    union all
    select project_id, 2, title, source_message_id, null from tasks where status <> 'done' and due_date < current_date
    union all
    select project_id, case kind when 'issue' then 3 else 4 end, title, source_message_id, due_date from risks where status = 'open'
    union all
    select project_id, 5, 'Site ' || site || ': ' || count(*) || ' days logged, ' || sum(headcount) || ' headcount-days, ' || count(*) filter (where trim(delays) <> '') || ' delay days', null, null
      from site_logs where log_date > current_date - 7 and log_date <= current_date group by project_id, site
  ), ins as (
    insert into status_reports (project_id, week_start, body_text)
    select pr.id, date_trunc('week', current_date)::date,
      coalesce((select string_agg(
        (case l.ord when 1 then 'Done: ' when 2 then 'Overdue: ' when 3 then 'Open issue: ' when 4 then 'Open risk: ' else '' end) || l.title
          || coalesce(' (due ' || l.due || ')', '')
          || coalesce(' (source message ' || l.source_message_id || ')', ''), E'\n' order by l.ord, l.title)
        from line l where l.project_id = pr.id), 'Nothing to report this week.')
    from projects pr where pr.archived_at is null
    on conflict (project_id, week_start) do nothing
    returning 1
  ) select count(*)::int from ins;
$$;
revoke execute on function public.draft_status_reports() from public, anon, authenticated;
grant execute on function public.draft_status_reports() to service_role;
