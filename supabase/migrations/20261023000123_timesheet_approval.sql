-- S11-4: a member submits a week; a project manager approves or sends it back. An approved week is
-- locked for good, and every decision is audited. The hours grid (S11-3) calls public.week_locked.
create table public.timesheet_weeks (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'sent_back')),
  note text check (length(note) <= 500),
  decided_by uuid,
  decided_at timestamptz,
  primary key (project_id, user_id, week_start)
);
alter table public.timesheet_weeks enable row level security;

create policy "own weeks and managers read" on public.timesheet_weeks
for select using (user_id = auth.uid() or public.can_manage_project(project_id));
-- Anyone with a project role (they all have hours.log) submits their own week only.
create policy "submit own week" on public.timesheet_weeks
for insert with check (user_id = auth.uid() and status = 'submitted'
  and public.project_role_of(project_id) is not null);
-- Managers decide; the owner may resubmit a sent-back week (the trigger enforces the transitions).
create policy "decide or resubmit" on public.timesheet_weeks
for update using (user_id = auth.uid() or public.can_manage_project(project_id));
grant select, insert, update on public.timesheet_weeks to authenticated;

create function public.check_timesheet_week() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.project_id, new.user_id, new.week_start) is distinct from (old.project_id, old.user_id, old.week_start) then
    raise exception 'a week cannot be moved' using errcode = 'insufficient_privilege';
  end if;
  if old.status = 'approved' then
    raise exception 'an approved week is locked' using errcode = 'insufficient_privilege';
  end if;
  if new.status = old.status then
    return new;
  end if;
  if new.status in ('approved', 'sent_back') then
    if not public.can_manage_project(old.project_id) then
      raise exception 'only a project manager can decide a week' using errcode = 'insufficient_privilege';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
  elsif old.user_id is distinct from auth.uid() then
    raise exception 'only the owner can resubmit a week' using errcode = 'insufficient_privilege';
  else
    new.decided_by := null;
    new.decided_at := null;
  end if;
  perform public.write_audit(old.project_id, 'timesheet_' || new.status, 'timesheet_weeks', gen_random_uuid(), null);
  return new;
end;
$$;
create trigger timesheet_weeks_check before update on public.timesheet_weeks
for each row execute function public.check_timesheet_week();

-- True once the week is approved: hours for that person and week must no longer change.
create function public.week_locked(p uuid, u uuid, d date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from timesheet_weeks
    where project_id = p and user_id = u and week_start = date_trunc('week', d)::date and status = 'approved');
$$;
revoke execute on function public.check_timesheet_week() from public, anon, authenticated;
revoke execute on function public.week_locked(uuid, uuid, date) from public, anon, authenticated;
