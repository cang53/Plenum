-- Pinned decisions (S14-7): a project manager pins a message as a decision; the stream shows who pinned it and when.
-- Plain row-level rules, no function: anyone on the project reads, only a project manager writes.

create table public.message_pins (
  message_id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  pinned_by uuid not null default auth.uid() references public.profiles (id),
  pinned_at timestamptz not null default now(),
  foreign key (message_id, project_id) references public.messages (id, project_id) on delete cascade
);
create index on public.message_pins (project_id, pinned_at desc);

alter table public.message_pins enable row level security;
create policy "members read pins" on public.message_pins for select using (public.can_see_project(project_id));
create policy "managers pin" on public.message_pins for insert with check (public.can_manage_project(project_id) and pinned_by = auth.uid());
create policy "managers unpin" on public.message_pins for delete using (public.can_manage_project(project_id));
revoke all on public.message_pins from anon, authenticated;
grant select, insert, delete on public.message_pins to authenticated;
