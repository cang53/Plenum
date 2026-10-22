-- In-app notifications (stage 4, S4-3). Each row belongs to one person and is written by database
-- triggers only: a task assigned to you, a new AI suggestion (to project managers) and an accepted
-- invitation (to the person who sent it). Nothing is counted or reported across people.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('task_assigned', 'suggestion_new', 'invitation_accepted')),
  subject text not null,
  -- The task, or the source message of a suggestion, so the list can link to it.
  ref_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "read your notifications" on public.notifications
for select using (user_id = auth.uid());
create policy "mark your notifications read" on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create function public.notify_task_assigned() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null and new.owner_id is distinct from auth.uid()
     and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id) then
    insert into notifications (user_id, project_id, kind, subject, ref_id)
    values (new.owner_id, new.project_id, 'task_assigned', new.title, new.id);
  end if;
  return null;
end;
$$;
create trigger tasks_notify_assigned after insert or update of owner_id on public.tasks
for each row execute function public.notify_task_assigned();

create function public.notify_suggestion_new() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, project_id, kind, subject, ref_id)
  select pm.user_id, new.project_id, 'suggestion_new', new.title, new.message_id
  from project_members pm where pm.project_id = new.project_id and pm.role = 'project_manager';
  return null;
end;
$$;
create trigger suggestions_notify_new after insert on public.suggestions
for each row execute function public.notify_suggestion_new();

create function public.notify_invitation_accepted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.accepted_at is null and new.accepted_at is not null and new.invited_by is not null then
    insert into notifications (user_id, project_id, kind, subject)
    values (new.invited_by, new.project_id, 'invitation_accepted', new.email);
  end if;
  return null;
end;
$$;
create trigger invitations_notify_accepted after update of accepted_at on public.invitations
for each row execute function public.notify_invitation_accepted();

revoke execute on function public.notify_task_assigned(), public.notify_suggestion_new(),
  public.notify_invitation_accepted() from public, anon, authenticated;
