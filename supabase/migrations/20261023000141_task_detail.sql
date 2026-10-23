-- Task detail (S14-16): a checklist per task, and a task's history for anyone on the project.
-- Checklist: project members read; a project manager or the task's owner writes.
-- History: audit_log stays manager-only, so this one function returns just the rows of one task,
-- with the person's name and the source message, to anyone who can see the task's project.

create table public.task_checklist (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  text text not null check (length(trim(text)) > 0 and length(text) <= 300),
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.task_checklist (task_id, position);

alter table public.task_checklist enable row level security;
create policy "members read checklists" on public.task_checklist for select using (
  exists (select 1 from public.tasks t where t.id = task_id and public.can_see_project(t.project_id))
);
create policy "managers and owners write checklists" on public.task_checklist for all using (
  exists (select 1 from public.tasks t where t.id = task_id and (public.can_manage_project(t.project_id) or t.owner_id = auth.uid()))
) with check (
  exists (select 1 from public.tasks t where t.id = task_id and (public.can_manage_project(t.project_id) or t.owner_id = auth.uid()))
);
revoke all on public.task_checklist from anon, authenticated;
grant select, insert, update, delete on public.task_checklist to authenticated;

create function public.task_activity(p_task uuid)
returns table (at timestamptz, who text, action text, message_id uuid, subject text)
language sql stable security definer set search_path = public as $$
  select a.created_at, coalesce(nullif(p.display_name, ''), p.email), a.action, a.source_message_id, m.subject
  from audit_log a
  join tasks t on t.id = a.entity_id and t.project_id = a.project_id
  left join profiles p on p.id = a.actor_id
  left join messages m on m.id = a.source_message_id
  where a.entity_type = 'tasks' and a.entity_id = p_task and public.can_see_project(t.project_id)
  order by a.created_at desc, a.id desc
  limit 50;
$$;
revoke execute on function public.task_activity(uuid) from public, anon;
grant execute on function public.task_activity(uuid) to authenticated;
