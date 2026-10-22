-- Phases, tasks and finish-to-start dependencies (backlog task 5).

create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'done');
create type public.task_priority as enum ('low', 'normal', 'high');

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase_id uuid references public.phases (id) on delete set null,
  parent_id uuid references public.tasks (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  owner_id uuid references public.profiles (id) on delete set null,
  start_date date,
  due_date date,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'normal',
  cost_code text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or due_date is null or start_date <= due_date)
);

create table public.task_dependencies (
  predecessor_id uuid not null references public.tasks (id) on delete cascade,
  successor_id uuid not null references public.tasks (id) on delete cascade,
  primary key (predecessor_id, successor_id),
  check (predecessor_id <> successor_id)
);

create index on public.phases (project_id);
create index on public.tasks (project_id);
create index on public.tasks (owner_id);
create index on public.task_dependencies (successor_id);

-- Subtasks go one level deep and stay in their parent's project; a phase belongs to the same
-- project; the owner is on the project; a task never moves to another project.
-- Security definer so the checks see rows the caller cannot (a hidden parent must still be refused).
create function public.check_task_shape() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  parent tasks%rowtype;
begin
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    raise exception 'a task cannot move to another project';
  end if;
  if new.parent_id is not null then
    select * into parent from tasks where id = new.parent_id;
    if parent.project_id is distinct from new.project_id then
      raise exception 'a subtask must be in its parent''s project';
    end if;
    if parent.parent_id is not null then
      raise exception 'subtasks can only go one level deep';
    end if;
  end if;
  if new.phase_id is not null
     and not exists (select 1 from phases where id = new.phase_id and project_id = new.project_id) then
    raise exception 'the phase belongs to another project';
  end if;
  -- Checked only when the owner is set, so a task keeps working after its owner leaves the project.
  if new.owner_id is not null
     and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id)
     and not exists (select 1 from project_members where project_id = new.project_id and user_id = new.owner_id) then
    raise exception 'the task owner must be a member of the project';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_check_shape
before insert or update on public.tasks
for each row execute function public.check_task_shape();

-- People who are not plan editors may only change the status of tasks they own.
create function public.limit_task_edits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.can_manage_project(old.project_id) then
    return new;
  end if;
  if old.owner_id is distinct from auth.uid() then
    raise exception 'only the task owner or a project manager can change this task'
      using errcode = 'insufficient_privilege';
  end if;
  if (new.project_id, new.phase_id, new.parent_id, new.title, new.owner_id, new.start_date,
      new.due_date, new.priority, new.cost_code, new.position)
     is distinct from
     (old.project_id, old.phase_id, old.parent_id, old.title, old.owner_id, old.start_date,
      old.due_date, old.priority, old.cost_code, old.position) then
    raise exception 'task owners can change the status only; ask a project manager for other changes'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger tasks_limit_edits
before update on public.tasks
for each row execute function public.limit_task_edits();

-- Dependencies stay inside one project and never form a loop.
-- Security definer so a task in a project the caller cannot see still counts as "another project".
create function public.check_dependency() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select project_id from tasks where id = new.predecessor_id)
     is distinct from (select project_id from tasks where id = new.successor_id) then
    raise exception 'dependencies must link tasks in the same project';
  end if;
  if exists (
    with recursive downstream(id) as (
      select successor_id from task_dependencies where predecessor_id = new.successor_id
      union
      select d.successor_id from task_dependencies d join downstream on d.predecessor_id = downstream.id
    )
    select 1 from downstream where id = new.predecessor_id
  ) then
    raise exception 'this dependency would create a loop';
  end if;
  return new;
end;
$$;

create trigger task_dependencies_check
before insert or update on public.task_dependencies
for each row execute function public.check_dependency();

-- A phase never moves to another project (its tasks would be left pointing across projects).
create function public.lock_phase_project() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.project_id is distinct from old.project_id then
    raise exception 'a phase cannot move to another project';
  end if;
  return new;
end;
$$;

create trigger phases_lock_project
before update on public.phases
for each row execute function public.lock_phase_project();

alter table public.phases enable row level security;
alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;

create policy "see phases of your projects" on public.phases
for select using (public.can_see_project(project_id));
create policy "managers edit phases" on public.phases
for all using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "see tasks of your projects" on public.tasks
for select using (public.can_see_project(project_id));
create policy "managers create tasks" on public.tasks
for insert with check (public.can_manage_project(project_id));
create policy "managers and owners update tasks" on public.tasks
for update using (public.can_manage_project(project_id) or owner_id = auth.uid())
with check (public.can_see_project(project_id));
create policy "managers delete tasks" on public.tasks
for delete using (public.can_manage_project(project_id));

create policy "see dependencies of your projects" on public.task_dependencies
for select using (
  exists (select 1 from tasks t where t.id = predecessor_id and public.can_see_project(t.project_id))
);
create policy "managers edit dependencies" on public.task_dependencies
for all using (
  exists (select 1 from tasks t where t.id = predecessor_id and public.can_manage_project(t.project_id))
)
with check (
  exists (select 1 from tasks t where t.id = predecessor_id and public.can_manage_project(t.project_id))
);

grant select, insert, update, delete on public.phases, public.tasks, public.task_dependencies to authenticated;
