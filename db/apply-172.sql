-- A risk or issue can be linked to one activity (task) of its project. Safe to re-run.
alter table public.risks add column if not exists linked_task_id uuid references public.tasks (id) on delete set null;
alter table public.risks add column if not exists link_declined boolean not null default false;

-- The linked activity must belong to the same project.
create or replace function public.check_risk_task() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.linked_task_id is not null and not exists (select 1 from public.tasks where id = new.linked_task_id and project_id = new.project_id) then
    raise exception 'linked activity must be in the same project';
  end if;
  return new;
end;
$$;
drop trigger if exists risks_check_task on public.risks;
create trigger risks_check_task before insert or update on public.risks
for each row execute function public.check_risk_task();
