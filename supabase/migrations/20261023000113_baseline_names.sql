-- Baselines get a name (S10-4) so a manager can pick which one the Gantt compares against.
alter table public.baselines add column name text;
update public.baselines set name = 'Baseline ' || to_char(created_at, 'YYYY-MM-DD HH24:MI') where name is null;
alter table public.baselines alter column name set not null;
alter table public.baselines add constraint baselines_name_len check (char_length(btrim(name)) between 1 and 80);

drop function public.save_baseline(uuid);
create function public.save_baseline(p_project uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if not public.can_manage_project(p_project) then raise exception 'not allowed'; end if;
  insert into baselines (project_id, name) values (p_project, btrim(p_name)) returning id into b;
  insert into baseline_tasks (baseline_id, task_id, start_date, due_date)
    select b, id, start_date, due_date from tasks where project_id = p_project and start_date is not null and due_date is not null;
  perform write_audit(p_project, 'baseline_saved', 'baselines', b, null);
  return b;
end;
$$;
revoke execute on function public.save_baseline(uuid, text) from public, anon;
grant execute on function public.save_baseline(uuid, text) to authenticated;
