-- Baselines (S9-7): a manager saves the current task dates; the Gantt shows slip against the latest save.
-- Per task only: no author column, no per-person view (the audit log records who saved).
create table public.baselines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index baselines_project_idx on public.baselines (project_id, created_at desc);

create table public.baseline_tasks (
  baseline_id uuid not null references public.baselines (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  start_date date not null,
  due_date date not null,
  primary key (baseline_id, task_id)
);

alter table public.baselines enable row level security;
alter table public.baseline_tasks enable row level security;
create policy "members read baselines" on public.baselines for select using (public.can_see_project(project_id));
create policy "members read baseline tasks" on public.baseline_tasks for select
  using (exists (select 1 from public.baselines b where b.id = baseline_id and public.can_see_project(b.project_id)));
revoke all on public.baselines, public.baseline_tasks from anon, authenticated;
grant select on public.baselines, public.baseline_tasks to authenticated;

-- Copies the dates of every dated task; returns the new baseline id.
create function public.save_baseline(p_project uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if not public.can_manage_project(p_project) then raise exception 'not allowed'; end if;
  insert into baselines (project_id) values (p_project) returning id into b;
  insert into baseline_tasks (baseline_id, task_id, start_date, due_date)
    select b, id, start_date, due_date from tasks where project_id = p_project and start_date is not null and due_date is not null;
  perform write_audit(p_project, 'baseline_saved', 'baselines', b, null);
  return b;
end;
$$;
revoke execute on function public.save_baseline(uuid) from public, anon;
grant execute on function public.save_baseline(uuid) to authenticated;
