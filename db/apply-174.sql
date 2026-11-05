-- Run once in the Supabase SQL editor; safe to re-run.
-- Gantt groups (the phases table) can sit inside other groups. A group can also be anchored below one task of its parent.
-- Accepting a remediation step puts the task in a "Remediation plan" group directly below the risk's linked activity.
alter table public.phases add column if not exists parent_id uuid references public.phases (id) on delete set null;
alter table public.phases add column if not exists after_task_id uuid references public.tasks (id) on delete set null;

-- A group's parent must be in the same project and the chain must not loop.
create or replace function public.check_phase_parent() returns trigger
language plpgsql set search_path = public as $$
declare cur uuid := new.parent_id; n int := 0;
begin
  if new.parent_id is null then return new; end if;
  if not exists (select 1 from phases where id = new.parent_id and project_id = new.project_id) then
    raise exception 'the parent group must be in the same project';
  end if;
  while cur is not null and n < 50 loop
    if cur = new.id then raise exception 'a group cannot sit inside itself'; end if;
    select parent_id into cur from phases where id = cur;
    n := n + 1;
  end loop;
  return new;
end;
$$;
drop trigger if exists phases_check_parent on public.phases;
create trigger phases_check_parent before insert or update on public.phases
for each row execute function public.check_phase_parent();

create or replace function public.accept_risk_step(p_step uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s risk_plan_steps;
  r risks;
  v_task uuid;
  v_parent uuid;
  v_group uuid;
begin
  select * into s from risk_plan_steps where id = p_step for update;
  if s.id is null or s.status <> 'proposed' or not coalesce(public.can_manage_project(s.project_id), false) then
    raise exception 'step not found or not allowed' using errcode = '42501';
  end if;
  select * into r from risks where id = s.risk_id;
  -- The "Remediation plan" group sits in the group of the affected activity, right after that activity.
  if r.linked_task_id is not null then
    select phase_id into v_parent from tasks where id = r.linked_task_id and project_id = s.project_id;
    if v_parent is not null then
      select id into v_group from phases
       where project_id = s.project_id and parent_id = v_parent and after_task_id = r.linked_task_id and name = 'Remediation plan' limit 1;
      if v_group is null then
        insert into phases (project_id, name, parent_id, after_task_id, position)
        values (s.project_id, 'Remediation plan', v_parent, r.linked_task_id, 0) returning id into v_group;
      end if;
    end if;
  end if;
  insert into tasks (project_id, phase_id, source_message_id, title, details, start_date, due_date, owner_id)
  values (s.project_id, v_group, r.source_message_id, s.title, 'Remediation for ' || r.kind || ': ' || r.title, s.start_date, s.due_date, s.owner_id)
  returning id into v_task;
  update risk_plan_steps set status = 'accepted', task_id = v_task, resolved_by = auth.uid() where id = p_step;
  return v_task;
end;
$$;
revoke execute on function public.accept_risk_step from public, anon;
grant execute on function public.accept_risk_step to authenticated;
