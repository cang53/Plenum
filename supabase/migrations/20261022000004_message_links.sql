-- Manual linking (backlog task 9): decisions, risks and change requests, and a link from every
-- item (including tasks) back to the message it was made from. A person creates each item.

alter table public.tasks add column source_message_id uuid references public.messages (id) on delete set null;

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_message_id uuid references public.messages (id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  details text not null default '',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_message_id uuid references public.messages (id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_message_id uuid references public.messages (id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  details text not null default '',
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index on public.tasks (source_message_id);
create index on public.decisions (project_id);
create index on public.decisions (source_message_id);
create index on public.risks (project_id);
create index on public.risks (source_message_id);
create index on public.change_requests (project_id);
create index on public.change_requests (source_message_id);

-- An item can only link to a message of its own project, and the link never moves to another one.
-- Security definer so a message the caller cannot see still counts as "another project".
create function public.check_source_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.source_message_id is not null
     and (tg_op = 'INSERT' or new.source_message_id is distinct from old.source_message_id)
     and not exists (select 1 from messages where id = new.source_message_id and project_id = new.project_id) then
    raise exception 'the source message belongs to another project';
  end if;
  return new;
end;
$$;

create trigger tasks_check_source before insert or update on public.tasks
for each row execute function public.check_source_message();
create trigger decisions_check_source before insert or update on public.decisions
for each row execute function public.check_source_message();
create trigger risks_check_source before insert or update on public.risks
for each row execute function public.check_source_message();
create trigger change_requests_check_source before insert or update on public.change_requests
for each row execute function public.check_source_message();

alter table public.decisions enable row level security;
alter table public.risks enable row level security;
alter table public.change_requests enable row level security;

create policy "see decisions of your projects" on public.decisions
for select using (public.can_see_project(project_id));
create policy "managers edit decisions" on public.decisions
for all using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "see risks of your projects" on public.risks
for select using (public.can_see_project(project_id));
create policy "managers edit risks" on public.risks
for all using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "see change requests of your projects" on public.change_requests
for select using (public.can_see_project(project_id));
create policy "managers edit change requests" on public.change_requests
for all using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

grant select, insert, update, delete on public.decisions, public.risks, public.change_requests to authenticated;
