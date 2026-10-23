-- Inbox snooze (S14-17): a person hides a suggestion from their own "Needs your click" tab until a time they pick.
-- It is private to that person and changes nothing about the suggestion itself.
create table public.suggestion_snoozes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  until timestamptz not null,
  primary key (user_id, suggestion_id)
);
alter table public.suggestion_snoozes enable row level security;
create policy "own snoozes" on public.suggestion_snoozes for all
using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from public.suggestions s where s.id = suggestion_id and public.can_see_project(s.project_id)));
revoke all on public.suggestion_snoozes from anon, authenticated;
grant select, insert, update, delete on public.suggestion_snoozes to authenticated;
