-- Risks and issues register (S9-8): a risk row can be an issue, and gets an owner and a due date.
-- Suggested from messages as before (a human click, source link kept); the weekly report shows both.
alter table public.risks
  add column kind text not null default 'risk' check (kind in ('risk', 'issue')),
  add column owner_id uuid references public.profiles (id) on delete set null,
  add column due_date date;
create index on public.risks (owner_id);

-- Like tasks (migration 2): the owner is on the project; checked only when the owner is set or changes.
create function public.check_risk_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null
     and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id)
     and not exists (select 1 from project_members where project_id = new.project_id and user_id = new.owner_id) then
    raise exception 'the owner must be a member of the project';
  end if;
  return new;
end;
$$;
create trigger risks_check_owner before insert or update on public.risks
for each row execute function public.check_risk_owner();
revoke execute on function public.check_risk_owner() from public, anon, authenticated;

-- Weekly report: open risks and issues with their due date (project-level lines, no per-person counts).
create or replace function public.draft_status_reports() returns int
language sql security definer set search_path = public as $$
  with line as (
    select project_id, 1 as ord, title, source_message_id, null::date as due from tasks where status = 'done' and updated_at > now() - interval '7 days'
    union all
    select project_id, 2, title, source_message_id, null from tasks where status <> 'done' and due_date < current_date
    union all
    select project_id, case kind when 'issue' then 3 else 4 end, title, source_message_id, due_date from risks where status = 'open'
  ), ins as (
    insert into status_reports (project_id, week_start, body_text)
    select pr.id, date_trunc('week', current_date)::date,
      coalesce((select string_agg(
        (case l.ord when 1 then 'Done: ' when 2 then 'Overdue: ' when 3 then 'Open issue: ' else 'Open risk: ' end) || l.title
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
