-- Stable task numbers per project for card IDs such as "P-204-21". A counter on the project hands out the next number,
-- so a number is never reused or shifted when a task is deleted, and nobody can change it afterwards.
alter table public.projects add column task_counter integer not null default 0;
alter table public.tasks add column number integer;

with numbered as (
  select id, row_number() over (partition by project_id order by created_at, id) as n from public.tasks
)
update public.tasks t set number = numbered.n from numbered where numbered.id = t.id;
update public.projects p set task_counter = coalesce((select max(number) from public.tasks t where t.project_id = p.id), 0);

alter table public.tasks alter column number set not null;
create unique index tasks_project_number on public.tasks (project_id, number);

create function public.set_task_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update projects set task_counter = task_counter + 1 where id = new.project_id returning task_counter into new.number;
  else
    new.number := old.number;
  end if;
  return new;
end;
$$;
revoke execute on function public.set_task_number() from public, anon, authenticated;
create trigger tasks_number before insert or update on public.tasks for each row execute function public.set_task_number();
