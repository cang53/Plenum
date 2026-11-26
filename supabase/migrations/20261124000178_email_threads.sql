-- Email joins a thread by subject: the first mail with a subject starts a thread in General, later mail with the same subject
-- (re:, fwd: and case ignored) joins it, in whichever chatroom the thread has been moved to.
alter table public.threads add column if not exists subject_key text;
create unique index if not exists threads_subject_key on public.threads (project_id, subject_key) where subject_key is not null;

create or replace function public.subject_key(s text) returns text
language sql immutable as $$
  select btrim(regexp_replace(lower(btrim(coalesce(s, ''))), '^((re|fwd?|aw|antw)\s*:\s*)+', ''));
$$;

-- Threads made by the CR-1 backfill came from email subjects too.
update public.threads t set subject_key = public.subject_key(t.title)
where t.subject_key is null and t.root_message_id is not null
  and exists (select 1 from public.messages m where m.id = t.root_message_id and m.source = 'email')
  and public.subject_key(t.title) <> ''
  and not exists (select 1 from public.threads o where o.project_id = t.project_id and o.subject_key = public.subject_key(t.title));

create or replace function public.email_joins_thread() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text := public.subject_key(new.subject); th uuid; tc uuid;
begin
  if new.source <> 'email' or k = '' or new.thread_id is not null then return null; end if;
  select id, chatroom_id into th, tc from threads where project_id = new.project_id and subject_key = k;
  if th is null then
    insert into threads (project_id, chatroom_id, title, root_message_id, subject_key)
    values (new.project_id, new.chatroom_id, left(btrim(regexp_replace(btrim(new.subject), '^((re|fwd?|aw|antw)\s*:\s*)+', '', 'i')), 120), new.id, k)
    on conflict (project_id, subject_key) where subject_key is not null do nothing
    returning id, chatroom_id into th, tc;
    if th is null then select id, chatroom_id into th, tc from threads where project_id = new.project_id and subject_key = k; end if;
  end if;
  update messages set thread_id = th, chatroom_id = tc where id = new.id;
  return null;
end;
$$;
drop trigger if exists email_joins_thread on public.messages;
create trigger email_joins_thread after insert on public.messages for each row execute function public.email_joins_thread();
revoke execute on function public.email_joins_thread() from public, anon, authenticated;
