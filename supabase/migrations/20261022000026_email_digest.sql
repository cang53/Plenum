-- Email digest (stage 5, S5-6): optional, per person. Each person turns it on for themselves (the
-- existing "edit own profile" rule covers that). The function lists, for each opted-in person and
-- project they belong to, their own new suggestion notices of the last day and their open tasks due
-- by tomorrow. Nothing is counted across people. Only the server (service role) may call it.
alter table public.profiles add column digest_daily boolean not null default false;

create function public.daily_digests() returns table (
  user_id uuid, email text, workspace_id uuid, project_id uuid, project_name text,
  new_suggestions text[], due_tasks text[]
)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, pr.workspace_id, pr.id, pr.name,
    coalesce((select array_agg(n.subject order by n.created_at) from notifications n
      where n.user_id = p.id and n.project_id = pr.id and n.kind = 'suggestion_new'
        and n.created_at > now() - interval '1 day'), '{}'),
    coalesce((select array_agg(t.title order by t.due_date) from tasks t
      where t.owner_id = p.id and t.project_id = pr.id and t.status <> 'done'
        and t.due_date <= current_date + 1), '{}')
  from profiles p
  join project_members pm on pm.user_id = p.id
  join projects pr on pr.id = pm.project_id
  where p.digest_daily and p.email is not null;
$$;
revoke execute on function public.daily_digests() from public, anon, authenticated;
grant execute on function public.daily_digests() to service_role;
