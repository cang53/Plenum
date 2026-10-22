-- Messages received at a project's email address (backlog task 7).
-- Only the inbound webhook writes here, through ingest_email(); people can only read.

create type public.message_source as enum ('email');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source public.message_source not null default 'email',
  -- The email's Message-ID header, so a redelivered email is stored once per project.
  external_id text not null,
  from_name text,
  from_address text not null,
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  subject text not null default '',
  body_text text not null default '',
  sent_at timestamptz,
  received_at timestamptz not null default now(),
  -- Where the raw email is kept (s3://bucket/key), so attachments can be served from it.
  raw_location text,
  unique (project_id, external_id)
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  -- Position among the email's attachments, used to read it back from the raw email.
  part_index integer not null,
  filename text not null,
  content_type text not null,
  size_bytes integer not null check (size_bytes >= 0),
  unique (message_id, part_index)
);

create index on public.messages (project_id, received_at desc);

alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;

create policy "see messages of your projects" on public.messages
for select using (public.can_see_project(project_id));

create policy "see attachments of your projects" on public.message_attachments
for select using (
  exists (select 1 from messages m where m.id = message_id and public.can_see_project(m.project_id))
);

revoke all on public.messages, public.message_attachments from authenticated;
grant select on public.messages, public.message_attachments to authenticated;

-- Stores one email against the project whose address it was sent to.
-- Returns the message id, or null when no open project has that address.
create function public.ingest_email(
  p_email_slug text,
  p_external_id text,
  p_from_name text,
  p_from_address text,
  p_to text[],
  p_cc text[],
  p_subject text,
  p_body_text text,
  p_sent_at timestamptz,
  p_raw_location text,
  p_attachments jsonb default '[]'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_project uuid;
  v_message uuid;
begin
  select id into v_project from projects where email_slug = p_email_slug and archived_at is null;
  if v_project is null then
    return null;
  end if;

  insert into messages (project_id, external_id, from_name, from_address, to_addresses, cc_addresses,
                        subject, body_text, sent_at, raw_location)
  values (v_project, p_external_id, p_from_name, p_from_address, coalesce(p_to, '{}'), coalesce(p_cc, '{}'),
          coalesce(p_subject, ''), coalesce(p_body_text, ''), p_sent_at, p_raw_location)
  on conflict (project_id, external_id) do nothing
  returning id into v_message;

  if v_message is null then
    select id into v_message from messages where project_id = v_project and external_id = p_external_id;
    return v_message;
  end if;

  insert into message_attachments (message_id, part_index, filename, content_type, size_bytes)
  select v_message, a.part_index, a.filename, a.content_type, a.size_bytes
  from jsonb_to_recordset(p_attachments) as a(part_index int, filename text, content_type text, size_bytes int);

  return v_message;
end;
$$;

-- Supabase grants new functions to anon and authenticated by default; only the webhook may call this.
revoke execute on function public.ingest_email from public, anon, authenticated;
grant execute on function public.ingest_email to service_role;
