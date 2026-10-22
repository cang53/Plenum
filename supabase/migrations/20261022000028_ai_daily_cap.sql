-- Daily cap on model calls per workspace (S6-3). One counter row per workspace and day; no person is
-- tracked. Only the server (service role) may call take_ai_call, which says whether a call may go ahead.
create table public.ai_usage (
  workspace_id uuid not null,
  day date not null default current_date,
  calls integer not null default 0,
  primary key (workspace_id, day)
);
alter table public.ai_usage enable row level security;
-- No policies: nobody reads or writes this table directly.

create function public.take_ai_call(p uuid, cap integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare ws uuid; used integer;
begin
  select workspace_id into ws from projects where id = p;
  if ws is null then return false; end if;
  insert into ai_usage (workspace_id, day, calls) values (ws, current_date, 1)
  on conflict (workspace_id, day) do update set calls = ai_usage.calls + 1
  where ai_usage.calls < cap
  returning calls into used;
  return used is not null;
end $$;
revoke execute on function public.take_ai_call(uuid, integer) from public, anon, authenticated;
grant execute on function public.take_ai_call(uuid, integer) to service_role;
