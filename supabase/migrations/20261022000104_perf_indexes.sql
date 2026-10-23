-- Stage 9 (S9-5): the timeline sender filter (ilike '%text%') scanned every message of the project.
-- Trigram indexes let it use an index at 10k+ messages. supabase/tests/perf_rules.sql holds the budget.
create extension if not exists pg_trgm with schema public;
create index messages_from_address_trgm on public.messages using gin (from_address public.gin_trgm_ops);
create index messages_from_name_trgm on public.messages using gin (from_name public.gin_trgm_ops);

-- can_see_project() ran once per message row, so filtering 10k messages cost ~220 ms. The policy now asks
-- once per query for the projects the person can see; the rule itself is the same function.
create function public.visible_project_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from projects where public.can_see_project(id);
$$;
revoke execute on function public.visible_project_ids() from public, anon;
grant execute on function public.visible_project_ids() to authenticated;

drop policy "see messages of your projects" on public.messages;
create policy "see messages of your projects" on public.messages
for select using (project_id in (select public.visible_project_ids()));
