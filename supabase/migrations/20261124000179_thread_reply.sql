-- The chatroom feed shows a thread as its first message plus a chip; replies are read in the thread. This flag marks the replies.
alter table public.messages add column if not exists thread_reply boolean not null default false;

update public.messages m set thread_reply = true
from public.threads t where m.thread_id = t.id and t.root_message_id is distinct from m.id and not m.thread_reply;

create or replace function public.message_place() returns trigger
language plpgsql security definer set search_path = public as $$
declare tc uuid;
begin
  if new.thread_id is not null then
    select chatroom_id into tc from threads where id = new.thread_id and project_id = new.project_id;
    if tc is null then new.thread_id := null; else new.chatroom_id := tc; new.thread_reply := true; end if;
  end if;
  if new.chatroom_id is null then new.chatroom_id := public.chatroom_general(new.project_id); end if;
  return new;
end;
$$;

create or replace function public.email_joins_thread() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text := public.subject_key(new.subject); th uuid; tc uuid; made boolean := false;
begin
  if new.source <> 'email' or k = '' or new.thread_id is not null then return null; end if;
  select id, chatroom_id into th, tc from threads where project_id = new.project_id and subject_key = k;
  if th is null then
    insert into threads (project_id, chatroom_id, title, root_message_id, subject_key)
    values (new.project_id, new.chatroom_id, left(btrim(regexp_replace(btrim(new.subject), '^((re|fwd?|aw|antw)\s*:\s*)+', '', 'i')), 120), new.id, k)
    on conflict (project_id, subject_key) where subject_key is not null do nothing
    returning id, chatroom_id into th, tc;
    made := th is not null;
    if th is null then select id, chatroom_id into th, tc from threads where project_id = new.project_id and subject_key = k; end if;
  end if;
  update messages set thread_id = th, chatroom_id = tc, thread_reply = not made where id = new.id;
  return null;
end;
$$;
