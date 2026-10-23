-- Project health (S14-9): a person writes a health word and a short update. Entries are never edited, so the history stays honest.
create type public.project_health as enum ('on_track', 'at_risk', 'off_track');

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  health public.project_health not null,
  note text not null check (length(trim(note)) between 1 and 1000),
  author_id uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index project_updates_project_idx on public.project_updates (project_id, created_at desc);
alter table public.project_updates enable row level security;
create policy "members read updates" on public.project_updates for select using (public.can_see_project(project_id));
create policy "managers write updates" on public.project_updates for insert with check (public.can_manage_project(project_id) and author_id = auth.uid());
revoke all on public.project_updates from anon, authenticated;
grant select, insert on public.project_updates to authenticated;
