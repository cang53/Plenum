-- Rewards switch (S12-1): a row turns team rewards off for one site of a workspace; site '' turns them off everywhere.
create table public.reward_switches (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site text not null check (length(site) <= 80),
  primary key (workspace_id, site)
);
alter table public.reward_switches enable row level security;
create policy "members read reward switches" on public.reward_switches
for select using (exists (select 1 from workspace_members where workspace_id = reward_switches.workspace_id and user_id = auth.uid())
  or exists (select 1 from projects p join project_members pm on pm.project_id = p.id
             where p.workspace_id = reward_switches.workspace_id and pm.user_id = auth.uid()));
grant select on public.reward_switches to authenticated;

-- Replaces the whole list in one call; admin only. Audited with the workspace id as project_id (the log has no foreign keys).
create function public.set_reward_switches(ws uuid, sites text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_workspace_admin(ws) then
    raise exception 'only a workspace admin can switch rewards' using errcode = 'insufficient_privilege';
  end if;
  delete from reward_switches where workspace_id = ws;
  insert into reward_switches (workspace_id, site) select ws, trim(s) from unnest(sites) s on conflict do nothing;
  insert into audit_log (workspace_id, project_id, actor_id, action, entity_type, entity_id)
  values (ws, ws, auth.uid(), 'updated', 'reward_switches', ws);
end;
$$;
revoke execute on function public.set_reward_switches(uuid, text[]) from public, anon;
grant execute on function public.set_reward_switches(uuid, text[]) to authenticated;
