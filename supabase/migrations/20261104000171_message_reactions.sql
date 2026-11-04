-- Emoji reactions on stream messages. People react as themselves; CobIA reacts on its own (agent = true, no person).
-- Writes go through two functions that check the project; the table is read-only for everyone else.
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '🎉', '👀', '✅', '😄')),
  user_id uuid references public.profiles (id) on delete cascade,
  agent boolean not null default false,
  created_at timestamptz not null default now(),
  check (agent = (user_id is null))
);
create unique index if not exists message_reactions_person_key on public.message_reactions (message_id, emoji, user_id) where user_id is not null;
create unique index if not exists message_reactions_agent_key on public.message_reactions (message_id, emoji) where agent;
create index if not exists message_reactions_project_idx on public.message_reactions (project_id, message_id);

alter table public.message_reactions enable row level security;
drop policy if exists "see reactions of your projects" on public.message_reactions;
create policy "see reactions of your projects" on public.message_reactions for select using (public.can_see_project(project_id));
revoke all on public.message_reactions from anon, authenticated;
grant select on public.message_reactions to authenticated;

-- A person's click: adds their reaction, or removes it when they already gave it.
create or replace function public.toggle_reaction(p_message uuid, p_emoji text) returns void
language plpgsql security definer set search_path = public as $$
declare m messages;
begin
  select * into m from messages where id = p_message;
  if m.id is null or not coalesce(public.can_see_project(m.project_id), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from message_reactions where message_id = p_message and emoji = p_emoji and user_id = auth.uid();
  if not found then
    insert into message_reactions (message_id, project_id, emoji, user_id) values (p_message, m.project_id, p_emoji, auth.uid());
  end if;
end;
$$;
revoke execute on function public.toggle_reaction from public, anon;
grant execute on function public.toggle_reaction to authenticated;

-- CobIA's own reaction, sent from the server after a person's message. Once per message and emoji.
create or replace function public.agent_react(p_message uuid, p_emoji text) returns void
language plpgsql security definer set search_path = public as $$
declare m messages;
begin
  select * into m from messages where id = p_message;
  if m.id is null or not coalesce(public.can_see_project(m.project_id), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into message_reactions (message_id, project_id, emoji, agent) values (p_message, m.project_id, p_emoji, true) on conflict do nothing;
end;
$$;
revoke execute on function public.agent_react from public, anon;
grant execute on function public.agent_react to authenticated;

-- CobIA's answer now remembers the message it answers, so the stream quotes it and a reply to it can be told apart.
create or replace function public.post_agent_reply(p_message uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  m messages;
  v_id uuid;
begin
  select * into m from messages where id = p_message;
  if m.id is null or not coalesce(public.can_see_project(m.project_id), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if btrim(coalesce(p_body, '')) = '' then
    raise exception 'reply is empty' using errcode = '22023';
  end if;
  insert into messages (project_id, source, external_id, from_name, from_address, subject, body_text, reply_to, sent_at)
  values (m.project_id, 'app', 'agent:' || gen_random_uuid(), 'Plenum agent', 'agent@plenum.app', '', left(btrim(p_body), 4000), p_message, now())
  returning id into v_id;
  return v_id;
end;
$$;
