-- Email preferences (stage 6, S6-9): inside the daily digest each person can also switch the
-- suggestions part and the due-tasks part off. Per-person settings on the person's own profile row
-- (the "edit own profile" rule covers them); nothing is counted across people.
alter table public.profiles
  add column digest_suggestions boolean not null default true,
  add column digest_due boolean not null default true;

create or replace function public.daily_digests() returns table (
  user_id uuid, email text, workspace_id uuid, project_id uuid, project_name text,
  new_suggestions text[], due_tasks text[]
)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, pr.workspace_id, pr.id, pr.name,
    case when p.digest_suggestions then coalesce((select array_agg(n.subject order by n.created_at) from notifications n
      where n.user_id = p.id and n.project_id = pr.id and n.kind = 'suggestion_new'
        and n.created_at > now() - interval '1 day'), '{}') else '{}' end,
    case when p.digest_due then coalesce((select array_agg(t.title order by t.due_date) from tasks t
      where t.owner_id = p.id and t.project_id = pr.id and t.status <> 'done'
        and t.due_date <= current_date + 1), '{}') else '{}' end
  from profiles p
  join project_members pm on pm.user_id = p.id
  join projects pr on pr.id = pm.project_id
  where p.digest_daily and p.email is not null;
$$;
