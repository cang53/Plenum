-- Files and pictures on messages written in Plenum. They live in a private storage bucket; message_attachments points at them.
-- Email attachments keep storage_path null and are read back from the raw email.
alter table public.message_attachments add column if not exists storage_path text;

-- post_message may now be sent with files and no text.
drop function if exists public.post_message(uuid, text, text);
create function public.post_message(p_project uuid, p_body text, p_subject text default '', p_allow_empty boolean default false) returns uuid
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
  insert into messages (project_id, source, external_id, from_name, from_address, subject, body_text, sent_at)
  values (
    p_project, 'app', 'app:' || gen_random_uuid(),
    (select display_name from profiles where id = auth.uid()),
    coalesce(auth.jwt() ->> 'email', ''), btrim(coalesce(p_subject, '')), v_body, now()
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.post_message from public, anon;
grant execute on function public.post_message to authenticated;

-- Records one uploaded file on the caller's own, just-written app message. The path must be <project>/<message>/<file>.
create function public.add_message_file(p_message uuid, p_path text, p_filename text, p_type text, p_size integer) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  m messages;
  v_id uuid;
begin
  select * into m from messages where id = p_message;
  if m.id is null or m.source <> 'app' or not coalesce(public.can_see_project(m.project_id), false)
     or m.from_address is distinct from coalesce(auth.jwt() ->> 'email', '') or m.received_at < now() - interval '10 minutes' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_path is null or p_path not like m.project_id::text || '/' || m.id::text || '/%' or coalesce(p_size, -1) < 0 or p_size > 10485760
     or btrim(coalesce(p_filename, '')) = '' then
    raise exception 'bad file' using errcode = '22023';
  end if;
  insert into message_attachments (message_id, part_index, filename, content_type, size_bytes, storage_path)
  values (m.id, coalesce((select max(part_index) + 1 from message_attachments where message_id = m.id), 0), p_filename, p_type, p_size, p_path)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.add_message_file from public, anon;
grant execute on function public.add_message_file to authenticated;

-- The bucket and its access rules. Skipped where there is no storage schema (the local test database).
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('message-files', 'message-files', false, 10485760) on conflict (id) do nothing;

  drop policy if exists "read message files of your projects" on storage.objects;
  create policy "read message files of your projects" on storage.objects for select to authenticated
    using (bucket_id = 'message-files' and public.can_see_project(((storage.foldername(name))[1])::uuid));
  drop policy if exists "add message files to your projects" on storage.objects;
  create policy "add message files to your projects" on storage.objects for insert to authenticated
    with check (bucket_id = 'message-files' and public.can_see_project(((storage.foldername(name))[1])::uuid));
end $$;
