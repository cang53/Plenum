-- Seeded demo project (backlog task 16): one call fills a workspace with the example plan and emails
-- used by the demo screens, so a new pilot can be shown something real in minutes.
-- Run it as the service role (SQL editor or `select public.seed_demo_project(...)`); not an API call.
create function public.seed_demo_project(ws uuid, manager uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p uuid := gen_random_uuid();
  site uuid := gen_random_uuid();
  eng uuid := gen_random_uuid();
  proc uuid := gen_random_uuid();
  lifting uuid := gen_random_uuid();
  gearbox uuid := gen_random_uuid();
  install uuid := gen_random_uuid();
  tests uuid := gen_random_uuid();
begin
  insert into projects (id, workspace_id, name, email_slug, created_by)
  values (p, ws, 'Line 4 retrofit (demo)', 'demo-' || substr(p::text, 1, 8), manager);

  insert into phases (id, project_id, name, position) values
    (site, p, 'Site works', 1), (eng, p, 'Engineering', 2), (proc, p, 'Procurement', 3);

  insert into tasks (id, project_id, phase_id, title, owner_id, start_date, due_date, status, position) values
    (lifting, p, site, 'Lifting works', manager, current_date + 7, current_date + 21, 'in_progress', 1),
    (gearbox, p, proc, 'Gearbox delivery', manager, current_date + 1, current_date + 35, 'blocked', 1),
    (install, p, site, 'Install gearbox', manager, current_date + 36, current_date + 42, 'todo', 2),
    (tests, p, eng, 'Electrical tests', manager, current_date + 43, current_date + 50, 'todo', 1);
  insert into task_dependencies (predecessor_id, successor_id) values (lifting, install), (gearbox, install), (install, tests);

  insert into messages (project_id, external_id, from_name, from_address, subject, body_text, received_at) values
    (p, 'demo-1', 'Marta Silva', 'marta.silva@supplier.example', 'Gearbox delivery date',
     'The supplier confirms the gearbox delivery slips by two weeks. Can we resequence the install?', now() - interval '1 hour'),
    (p, 'demo-2', 'Jonas Peeters', 'jonas.peeters@plant.example', 'Vergunning hijswerk',
     'Vergunning voor hijswerk is goedgekeurd, we kunnen maandag starten.', now() - interval '3 hours'),
    (p, 'demo-3', 'Aylin Kaya', 'aylin.kaya@electrical.example', 'Cabinet drawings',
     'I need the updated cabinet drawings before Thursday to finish the wiring plans.', now() - interval '26 hours');
  return p;
end;
$$;

revoke execute on function public.seed_demo_project(uuid, uuid) from public, anon, authenticated;
grant execute on function public.seed_demo_project(uuid, uuid) to service_role;
