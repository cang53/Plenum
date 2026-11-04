-- Timelines: slide-ready timelines built by people on a project. The whole drawing (items and style) is one JSON document.
-- Everyone who sees the project reads them; members and managers (not outside contributors) create, edit and delete them.
create table if not exists public.timelines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  doc jsonb not null default '{}'::jsonb check (octet_length(doc::text) <= 500000),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists timelines_project_idx on public.timelines (project_id, updated_at desc);

-- The database stamps who saved and when; the project and the author cannot be changed.
create or replace function public.touch_timeline() returns trigger
language plpgsql set search_path = public as $$
begin
  new.project_id := old.project_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists timelines_touch on public.timelines;
create trigger timelines_touch before update on public.timelines
for each row execute function public.touch_timeline();

alter table public.timelines enable row level security;
drop policy if exists "read timelines" on public.timelines;
create policy "read timelines" on public.timelines for select using (public.can_see_project(project_id));
drop policy if exists "add timelines" on public.timelines;
create policy "add timelines" on public.timelines for insert with check (created_by = auth.uid() and (public.can_see_project(project_id) and coalesce(public.project_role_of(project_id)::text, '') <> 'contributor'));
drop policy if exists "change timelines" on public.timelines;
create policy "change timelines" on public.timelines for update using ((public.can_see_project(project_id) and coalesce(public.project_role_of(project_id)::text, '') <> 'contributor')) with check ((public.can_see_project(project_id) and coalesce(public.project_role_of(project_id)::text, '') <> 'contributor'));
drop policy if exists "remove timelines" on public.timelines;
create policy "remove timelines" on public.timelines for delete using ((public.can_see_project(project_id) and coalesce(public.project_role_of(project_id)::text, '') <> 'contributor'));
revoke all on public.timelines from anon, authenticated;
grant select, insert, update, delete on public.timelines to authenticated;
