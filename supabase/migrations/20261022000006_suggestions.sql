-- AI triage (backlog task 10): at most one suggestion per message. The server writes it (service
-- role); a project manager accepts, edits or dismisses it. Nothing else changes without that click.

alter table public.messages add constraint messages_id_project_key unique (id, project_id);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  message_id uuid not null,
  kind text not null check (kind in ('task', 'decision', 'risk', 'change_request')),
  title text not null check (length(trim(title)) > 0),
  details text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id),
  -- The message must belong to the same project.
  foreign key (message_id, project_id) references public.messages (id, project_id) on delete cascade
);

create index on public.suggestions (project_id, status);

alter table public.suggestions enable row level security;

create policy "see suggestions of your projects" on public.suggestions
for select using (public.can_see_project(project_id));
create policy "managers resolve suggestions" on public.suggestions
for update using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

-- People can read suggestions and change only the wording and the decision; the AI output
-- (message, kind, project) is fixed once written.
grant select on public.suggestions to authenticated;
grant update (title, details, status) on public.suggestions to authenticated;

-- A suggestion is decided once, and the database records who decided and when.
create function public.stamp_suggestion_decision() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.status <> 'pending' then
    raise exception 'this suggestion was already decided';
  end if;
  if new.status <> 'pending' then
    new.resolved_by := auth.uid();
    new.resolved_at := now();
  end if;
  return new;
end;
$$;

create trigger suggestions_stamp_decision before update on public.suggestions
for each row execute function public.stamp_suggestion_decision();

revoke execute on function public.stamp_suggestion_decision() from public, anon, authenticated;
