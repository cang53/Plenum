-- Chatrooms and threads. A project has chatrooms (General always exists); a chatroom has titled threads started from a message.
-- Every message sits in a chatroom, and may sit in a thread. The old `topics` table is left alone and unused.

create table if not exists public.chatrooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  emoji text not null default '' check (length(emoji) <= 16),
  is_general boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, project_id)
);
create index if not exists chatrooms_project_id_idx on public.chatrooms (project_id);
create unique index if not exists chatrooms_one_general on public.chatrooms (project_id) where is_general;

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  chatroom_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 120),
  root_message_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  foreign key (chatroom_id, project_id) references public.chatrooms (id, project_id) on delete cascade,
  foreign key (root_message_id, project_id) references public.messages (id, project_id) on delete set null (root_message_id)
);
create index if not exists threads_chatroom_idx on public.threads (chatroom_id, created_at desc);
create unique index if not exists threads_one_per_root on public.threads (root_message_id) where root_message_id is not null;

alter table public.messages add column if not exists chatroom_id uuid;
alter table public.messages add column if not exists thread_id uuid;
do $$ begin
  alter table public.messages add constraint messages_chatroom_fk foreign key (chatroom_id, project_id)
    references public.chatrooms (id, project_id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.messages add constraint messages_thread_fk foreign key (thread_id, project_id)
    references public.threads (id, project_id) on delete set null (thread_id);
exception when duplicate_object then null; end $$;
create index if not exists messages_thread_idx on public.messages (thread_id, received_at) where thread_id is not null;
create index if not exists messages_chatroom_idx on public.messages (chatroom_id, received_at desc, id desc);

-- Every project has a General chatroom.
create or replace function public.chatroom_general(p uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  select id into g from chatrooms where project_id = p and is_general;
  if g is null then
    insert into chatrooms (project_id, name, emoji, is_general) values (p, 'General', '', true)
    on conflict (project_id) where is_general do nothing;
    select id into g from chatrooms where project_id = p and is_general;
  end if;
  return g;
end;
$$;

create or replace function public.project_gets_general() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.chatroom_general(new.id);
  return new;
end;
$$;
drop trigger if exists project_gets_general on public.projects;
create trigger project_gets_general after insert on public.projects for each row execute function public.project_gets_general();

-- A message with no chatroom goes to General; a message in a thread takes the thread's chatroom.
create or replace function public.message_place() returns trigger
language plpgsql security definer set search_path = public as $$
declare tc uuid;
begin
  if new.thread_id is not null then
    select chatroom_id into tc from threads where id = new.thread_id and project_id = new.project_id;
    if tc is null then new.thread_id := null; else new.chatroom_id := tc; end if;
  end if;
  if new.chatroom_id is null then new.chatroom_id := public.chatroom_general(new.project_id); end if;
  return new;
end;
$$;
drop trigger if exists message_place on public.messages;
create trigger message_place before insert on public.messages for each row execute function public.message_place();

-- Backfill: every project gets General, every message goes there, and email is grouped by subject into threads (re:/fwd: ignored).
insert into public.chatrooms (project_id, name, is_general)
select id, 'General', true from public.projects p
where not exists (select 1 from public.chatrooms c where c.project_id = p.id and c.is_general);
update public.messages m set chatroom_id = c.id from public.chatrooms c where c.project_id = m.project_id and c.is_general and m.chatroom_id is null;

with norm as (
  select id, project_id, chatroom_id, subject, received_at,
         btrim(regexp_replace(lower(btrim(subject)), '^((re|fwd?|aw|antw)\s*:\s*)+', '')) as key
  from public.messages where source = 'email' and btrim(subject) <> '' and thread_id is null
), first_of as (
  select distinct on (project_id, key) project_id, key, id as root, chatroom_id, subject
  from norm where key <> '' order by project_id, key, received_at, id
), made as (
  insert into public.threads (project_id, chatroom_id, title, root_message_id)
  select project_id, chatroom_id, left(btrim(regexp_replace(subject, '^((re|fwd?|aw|antw)\s*:\s*)+', '', 'i')), 120), root from first_of
  where length(btrim(regexp_replace(subject, '^((re|fwd?|aw|antw)\s*:\s*)+', '', 'i'))) > 0
  returning id, project_id, root_message_id
)
update public.messages m set thread_id = t.id
from norm n join first_of f on f.project_id = n.project_id and f.key = n.key join made t on t.root_message_id = f.root
where m.id = n.id;

alter table public.messages alter column chatroom_id set not null;

-- Access: anyone who can see the project reads; writes go through the functions below.
alter table public.chatrooms enable row level security;
alter table public.threads enable row level security;
drop policy if exists "see chatrooms of your projects" on public.chatrooms;
create policy "see chatrooms of your projects" on public.chatrooms for select using (public.can_see_project(project_id));
drop policy if exists "see threads of your projects" on public.threads;
create policy "see threads of your projects" on public.threads for select using (public.can_see_project(project_id));
revoke all on public.chatrooms, public.threads from anon, authenticated;
grant select on public.chatrooms, public.threads to authenticated;

create or replace function public.create_chatroom(p_project uuid, p_name text, p_emoji text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if public.project_role_of(p_project) is null or public.project_role_of(p_project) not in ('member', 'project_manager') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into chatrooms (project_id, name, emoji, created_by) values (p_project, trim(p_name), coalesce(p_emoji, ''), auth.uid()) returning id into c;
  perform write_audit(p_project, 'chatroom_created', 'chatrooms', c, null);
  return c;
end;
$$;

-- A thread starts from a message and lives in that message's chatroom. The message becomes its first message.
create or replace function public.start_thread(p_message uuid, p_title text) returns uuid
language plpgsql security definer set search_path = public as $$
declare m record; t uuid;
begin
  select id, project_id, chatroom_id, thread_id into m from messages where id = p_message;
  if m.id is null or public.project_role_of(m.project_id) is null or public.project_role_of(m.project_id) not in ('member', 'project_manager') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if m.thread_id is not null then raise exception 'the message is already in a thread' using errcode = '22023'; end if;
  insert into threads (project_id, chatroom_id, title, root_message_id, created_by) values (m.project_id, m.chatroom_id, trim(p_title), m.id, auth.uid()) returning id into t;
  update messages set thread_id = t where id = m.id;
  perform write_audit(m.project_id, 'thread_started', 'threads', t, m.id);
  return t;
end;
$$;

-- Moving a thread to another chatroom is always a person's click. Its messages go with it.
create or replace function public.move_thread(p_thread uuid, p_chatroom uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select id, project_id, root_message_id into t from threads where id = p_thread;
  if t.id is null or public.project_role_of(t.project_id) is null or public.project_role_of(t.project_id) not in ('member', 'project_manager') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from chatrooms where id = p_chatroom and project_id = t.project_id) then
    raise exception 'the chatroom is not in this project' using errcode = '22023';
  end if;
  update threads set chatroom_id = p_chatroom where id = p_thread;
  update messages set chatroom_id = p_chatroom where thread_id = p_thread;
  perform write_audit(t.project_id, 'thread_moved', 'threads', p_thread, t.root_message_id);
end;
$$;

-- post_message may name a thread (the reply goes into it) or a chatroom; with neither it goes to General.
drop function if exists public.post_message(uuid, text, text, boolean, text, uuid);
drop function if exists public.post_message(uuid, text, text, boolean, text, uuid, uuid, uuid);
create function public.post_message(p_project uuid, p_body text, p_subject text default '', p_allow_empty boolean default false, p_html text default null, p_reply_to uuid default null, p_thread uuid default null, p_chatroom uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if not coalesce(public.can_see_project(p_project), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_body = '' and not coalesce(p_allow_empty, false) then
    raise exception 'message is empty' using errcode = '22023';
  end if;
  if p_thread is not null and not exists (select 1 from threads where id = p_thread and project_id = p_project) then
    raise exception 'the thread is not in this project' using errcode = '22023';
  end if;
  if p_chatroom is not null and not exists (select 1 from chatrooms where id = p_chatroom and project_id = p_project) then
    raise exception 'the chatroom is not in this project' using errcode = '22023';
  end if;
  insert into messages (project_id, source, external_id, from_name, from_address, subject, body_text, body_html, reply_to, thread_id, chatroom_id, sent_at)
  values (
    p_project, 'app', 'app:' || gen_random_uuid(),
    (select display_name from profiles where id = auth.uid()),
    coalesce(auth.jwt() ->> 'email', ''), btrim(coalesce(p_subject, '')), v_body, nullif(btrim(coalesce(p_html, '')), ''),
    (select id from messages where id = p_reply_to and project_id = p_project), p_thread, p_chatroom, now()
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.create_chatroom(uuid, text, text), public.start_thread(uuid, text), public.move_thread(uuid, uuid), public.post_message(uuid, text, text, boolean, text, uuid, uuid, uuid) from public, anon;
grant execute on function public.create_chatroom(uuid, text, text), public.start_thread(uuid, text), public.move_thread(uuid, uuid), public.post_message(uuid, text, text, boolean, text, uuid, uuid, uuid) to authenticated;
revoke execute on function public.chatroom_general(uuid), public.project_gets_general(), public.message_place() from public, anon, authenticated;
