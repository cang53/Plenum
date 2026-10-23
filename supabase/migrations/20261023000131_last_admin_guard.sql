-- Last admin protection: a workspace always keeps at least one admin.
create function public.keep_last_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and exists (select 1 from workspaces where id = old.workspace_id)
     and not exists (
       select 1 from workspace_members
       where workspace_id = old.workspace_id and role = 'admin' and user_id <> old.user_id
     ) then
    raise exception 'last_admin: a workspace needs at least one admin' using errcode = 'check_violation';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger workspace_members_keep_last_admin
before update of role or delete on public.workspace_members
for each row execute function public.keep_last_admin();
