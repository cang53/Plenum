-- Weekly status report (S8-10): a weekly job drafts one report per project from the week's finished
-- tasks, overdue tasks and open risks, each line with its source message. It is project-level only
-- (no per-person counts). A project manager's click sends it; the send is audited.
create table public.status_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  week_start date not null,
  body_text text not null,
  sent_at timestamptz,
  sent_by uuid references public.profiles (id) on delete set null,
  unique (project_id, week_start)
);
alter table public.status_reports enable row level security;
create policy "managers read status reports" on public.status_reports for select using (public.can_manage_project(project_id));
revoke all on public.status_reports from anon, authenticated;
grant select on public.status_reports to authenticated;

create function public.draft_status_reports() returns int
language sql security definer set search_path = public as $$
  with line as (
    select project_id, 1 as ord, title, source_message_id from tasks where status = 'done' and updated_at > now() - interval '7 days'
    union all
    select project_id, 2, title, source_message_id from tasks where status <> 'done' and due_date < current_date
    union all
    select project_id, 3, title, source_message_id from risks where status = 'open'
  ), ins as (
    insert into status_reports (project_id, week_start, body_text)
    select pr.id, date_trunc('week', current_date)::date,
      coalesce((select string_agg(
        (case l.ord when 1 then 'Done: ' when 2 then 'Overdue: ' else 'Open risk: ' end) || l.title
          || coalesce(' (source message ' || l.source_message_id || ')', ''), E'\n' order by l.ord, l.title)
        from line l where l.project_id = pr.id), 'Nothing to report this week.')
    from projects pr where pr.archived_at is null
    on conflict (project_id, week_start) do nothing
    returning 1
  ) select count(*)::int from ins;
$$;
revoke execute on function public.draft_status_reports() from public, anon, authenticated;
grant execute on function public.draft_status_reports() to service_role;

-- The click: a project manager marks the draft sent (once) and gets the manager emails to send it to.
create function public.send_status_report(p_id uuid) returns table (workspace_id uuid, project_id uuid, project_name text, body_text text, to_addresses text[])
language plpgsql security definer set search_path = public as $$
declare r status_reports; pr projects;
begin
  select * into r from status_reports where id = p_id;
  if not found or not can_manage_project(r.project_id) then raise exception 'not allowed'; end if;
  update status_reports set sent_at = now(), sent_by = auth.uid() where id = p_id and sent_at is null returning * into r;
  if not found then raise exception 'already sent'; end if;
  perform write_audit(r.project_id, 'status_report_sent', 'status_reports', r.id, null);
  select * into pr from projects where id = r.project_id;
  return query select pr.workspace_id, pr.id, pr.name, r.body_text,
    array(select p.email from project_members m join profiles p on p.id = m.user_id where m.project_id = pr.id and m.role = 'project_manager');
end;
$$;
revoke execute on function public.send_status_report(uuid) from public, anon;
grant execute on function public.send_status_report(uuid) to authenticated;
