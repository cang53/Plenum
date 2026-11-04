-- Library explorer: project folders, and project documents inside them. A document's folder_path is "" for the project's top
-- level, or a path like "Contracts/2026". The shared lessons folder stays flat. Reading a stored file follows the document's own
-- row-level security, so whoever may see the document may open its file.
create table if not exists public.library_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null check (path ~ '^[^/]+(/[^/]+){0,3}$' and length(path) <= 160),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (project_id, path)
);
alter table public.library_folders enable row level security;
drop policy if exists "see folders of your projects" on public.library_folders;
create policy "see folders of your projects" on public.library_folders for select using (public.can_see_project(project_id));
drop policy if exists "managers add folders" on public.library_folders;
create policy "managers add folders" on public.library_folders for insert with check (public.can_manage_project(project_id) and created_by = auth.uid());
drop policy if exists "managers remove folders" on public.library_folders;
create policy "managers remove folders" on public.library_folders for delete using (public.can_manage_project(project_id));
revoke all on public.library_folders from anon, authenticated;
grant select, insert, delete on public.library_folders to authenticated;

alter table public.library_documents
  add column if not exists folder_path text not null default '' check (folder_path = '' or folder_path ~ '^[^/]+(/[^/]+){0,3}$');
alter table public.library_documents drop constraint if exists library_lessons_flat;
alter table public.library_documents add constraint library_lessons_flat check (folder = 'project' or folder_path = '');
create index if not exists library_documents_project_folder_idx on public.library_documents (project_id, folder_path);

-- Storage: lessons files <workspace>/<doc>/<file> are staff-only; project files <workspace>/<project>/<doc>/<file>
-- are added and removed by that project's managers and read by whoever can see the document.
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  drop policy if exists "staff read library files" on storage.objects;
  drop policy if exists "staff add library files" on storage.objects;
  drop policy if exists "staff remove library files" on storage.objects;
  drop policy if exists "read library files" on storage.objects;
  drop policy if exists "add library files" on storage.objects;
  drop policy if exists "remove library files" on storage.objects;
  create policy "read library files" on storage.objects for select to authenticated
    using (bucket_id = 'library' and exists (select 1 from public.library_documents d where d.storage_path = storage.objects.name));
  create policy "add library files" on storage.objects for insert to authenticated
    with check (bucket_id = 'library' and (
      (array_length(storage.foldername(name), 1) = 2 and public.is_workspace_staff(((storage.foldername(name))[1])::uuid))
      or (array_length(storage.foldername(name), 1) = 3 and public.can_manage_project(((storage.foldername(name))[2])::uuid))));
  create policy "remove library files" on storage.objects for delete to authenticated
    using (bucket_id = 'library' and (
      (array_length(storage.foldername(name), 1) = 2 and public.is_workspace_staff(((storage.foldername(name))[1])::uuid))
      or (array_length(storage.foldername(name), 1) = 3 and public.can_manage_project(((storage.foldername(name))[2])::uuid))));
end $$;
