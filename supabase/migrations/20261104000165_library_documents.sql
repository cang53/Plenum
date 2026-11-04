-- Library: documents kept by the workspace. The "lessons" folder is shared by every project of the workspace and is read by
-- staff only; "project" documents belong to one project. The text of each file is stored so the risk analysis can read it.
create table public.library_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  folder text not null check (folder in ('lessons', 'project')),
  title text not null check (length(trim(title)) between 1 and 200),
  body_text text not null default '' check (length(body_text) <= 20000),
  filename text,
  content_type text,
  size_bytes integer check (size_bytes is null or size_bytes between 0 and 10485760),
  storage_path text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check ((folder = 'lessons' and project_id is null) or (folder = 'project' and project_id is not null))
);
create index on public.library_documents (workspace_id, folder, created_at desc);
create index on public.library_documents (project_id);

-- A project document must name the workspace its project is in.
create function public.check_library_document() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.project_id is not null and not exists (select 1 from projects where id = new.project_id and workspace_id = new.workspace_id) then
    raise exception 'the project is not in this workspace';
  end if;
  return new;
end;
$$;
create trigger library_documents_check before insert or update on public.library_documents
for each row execute function public.check_library_document();
revoke execute on function public.check_library_document() from public, anon, authenticated;

alter table public.library_documents enable row level security;
create policy "read library documents" on public.library_documents for select using (
  case when folder = 'lessons' then public.is_workspace_staff(workspace_id) else public.can_see_project(project_id) end);
create policy "add library documents" on public.library_documents for insert with check (
  created_by = auth.uid() and case when folder = 'lessons' then public.is_workspace_staff(workspace_id) else public.can_manage_project(project_id) end);
create policy "remove library documents" on public.library_documents for delete using (
  case when folder = 'lessons' then public.is_workspace_staff(workspace_id) else public.can_manage_project(project_id) end);
revoke all on public.library_documents from anon, authenticated;
grant select, insert, delete on public.library_documents to authenticated;

-- The private bucket for the files. Skipped where there is no storage schema (the local test database).
-- Path: <workspace id>/<document id>/<file>.
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('library', 'library', false, 10485760) on conflict (id) do nothing;
  drop policy if exists "staff read library files" on storage.objects;
  create policy "staff read library files" on storage.objects for select to authenticated
    using (bucket_id = 'library' and public.is_workspace_staff(((storage.foldername(name))[1])::uuid));
  drop policy if exists "staff add library files" on storage.objects;
  create policy "staff add library files" on storage.objects for insert to authenticated
    with check (bucket_id = 'library' and public.is_workspace_staff(((storage.foldername(name))[1])::uuid));
  drop policy if exists "staff remove library files" on storage.objects;
  create policy "staff remove library files" on storage.objects for delete to authenticated
    using (bucket_id = 'library' and public.is_workspace_staff(((storage.foldername(name))[1])::uuid));
end $$;
