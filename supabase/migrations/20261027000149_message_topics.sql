-- Topics: a project's own labels for messages. Matches what is live (applied earlier as `message_topics`), so this file is safe to re-run.
-- Callers with no role in the project are rejected too: project_role_of is NULL for them, and NULL NOT IN (...) would not raise.
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (id, project_id)
);
create index if not exists topics_project_id_idx on public.topics (project_id);

alter table public.messages add column if not exists topic_id uuid;
do $$ begin
  alter table public.messages add constraint messages_topic_fk foreign key (topic_id, project_id)
    references public.topics (id, project_id) on delete set null (topic_id);
exception when duplicate_object then null; end $$;

alter table public.topics enable row level security;
drop policy if exists "see topics of your projects" on public.topics;
create policy "see topics of your projects" on public.topics for select using (public.can_see_project(project_id));
revoke all on public.topics from anon, authenticated;
grant select on public.topics to authenticated;

create or replace function public.create_topic(p_project uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if public.project_role_of(p_project) is null or public.project_role_of(p_project) not in ('member', 'project_manager') then raise exception 'not allowed'; end if;
  insert into topics (project_id, name) values (p_project, trim(p_name)) returning id into t;
  perform write_audit(p_project, 'topic_created', 'topics', t, null);
  return t;
end;
$$;

create or replace function public.set_message_topic(p_message uuid, p_topic uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p uuid;
begin
  select project_id into p from messages where id = p_message;
  if p is null or public.project_role_of(p) is null or public.project_role_of(p) not in ('member', 'project_manager') then raise exception 'not allowed'; end if;
  if p_topic is not null and not exists (select 1 from topics where id = p_topic and project_id = p) then
    raise exception 'the topic is not in this project';
  end if;
  update messages set topic_id = p_topic where id = p_message;
  perform write_audit(p, 'message_topic_set', 'messages', p_message, p_message);
end;
$$;

revoke execute on function public.create_topic(uuid, text), public.set_message_topic(uuid, uuid) from public, anon;
grant execute on function public.create_topic(uuid, text), public.set_message_topic(uuid, uuid) to authenticated;
