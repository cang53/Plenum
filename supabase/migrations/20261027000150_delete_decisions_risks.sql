-- Managers may delete decisions and risks, as they already can tasks. Same check as the other write policies.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'decisions' and policyname = 'managers delete decisions') then
    create policy "managers delete decisions" on public.decisions for delete using (public.can_manage_project(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'risks' and policyname = 'managers delete risks') then
    create policy "managers delete risks" on public.risks for delete using (public.can_manage_project(project_id));
  end if;
end $$;
