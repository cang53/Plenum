-- Remediation plan steps for a risk or issue. A step is only a proposal until a project manager accepts it;
-- accepting creates a task on the timeline in one go and keeps the link back to the risk and its source message.
create table public.risk_plan_steps (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references public.risks (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (length(trim(title)) > 0 and length(title) <= 200),
  start_date date,
  due_date date,
  owner_id uuid references public.profiles (id) on delete set null,
  gap_note text not null default '' check (length(gap_note) <= 300),
  reason text not null default '' check (length(reason) <= 500),
  origin text not null default 'ai' check (origin in ('ai', 'manual')),
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'dismissed')),
  task_id uuid references public.tasks (id) on delete set null,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (start_date is null or due_date is null or start_date <= due_date)
);
create index on public.risk_plan_steps (risk_id);
create index on public.risk_plan_steps (project_id);

alter table public.risk_plan_steps enable row level security;
create policy "see plan steps of your projects" on public.risk_plan_steps for select using (public.can_see_project(project_id));
create policy "managers add plan steps" on public.risk_plan_steps for insert with check (
  public.can_manage_project(project_id) and exists (select 1 from public.risks r where r.id = risk_id and r.project_id = risk_plan_steps.project_id));
create policy "managers dismiss plan steps" on public.risk_plan_steps for update using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));
create policy "managers delete plan steps" on public.risk_plan_steps for delete using (public.can_manage_project(project_id));
revoke all on public.risk_plan_steps from anon, authenticated;
grant select, insert, update, delete on public.risk_plan_steps to authenticated;

-- Accept one proposed step: creates the task (with its owner and dates) and marks the step accepted.
create function public.accept_risk_step(p_step uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s risk_plan_steps;
  r risks;
  v_task uuid;
begin
  select * into s from risk_plan_steps where id = p_step for update;
  if s.id is null or s.status <> 'proposed' or not coalesce(public.can_manage_project(s.project_id), false) then
    raise exception 'step not found or not allowed' using errcode = '42501';
  end if;
  select * into r from risks where id = s.risk_id;
  insert into tasks (project_id, source_message_id, title, details, start_date, due_date, owner_id)
  values (s.project_id, r.source_message_id, s.title, 'Remediation for ' || r.kind || ': ' || r.title, s.start_date, s.due_date, s.owner_id)
  returning id into v_task;
  update risk_plan_steps set status = 'accepted', task_id = v_task, resolved_by = auth.uid() where id = p_step;
  return v_task;
end;
$$;
revoke execute on function public.accept_risk_step from public, anon;
grant execute on function public.accept_risk_step to authenticated;
