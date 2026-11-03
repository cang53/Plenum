-- Dummy project for testing the @agent flow: "Dock 3 conveyor upgrade (agent demo)". Safe to re-run (it replaces itself).
-- Needs the demo project and demo roles first (npm run seed, then db/apply-demo-roles.sql). Run in the Supabase SQL editor.
-- All dates are fixed, so the test notes in this folder always match. The demo project manager owns the plan.
do $$
declare
  ws uuid; pm uuid; mem uuid; p uuid := gen_random_uuid();
  ph_design uuid := gen_random_uuid(); ph_proc uuid := gen_random_uuid(); ph_inst uuid := gen_random_uuid(); ph_comm uuid := gen_random_uuid();
  t_layout uuid := gen_random_uuid(); t_order uuid := gen_random_uuid(); t_deliv uuid := gen_random_uuid(); t_floor uuid := gen_random_uuid();
  t_plc uuid := gen_random_uuid(); t_install uuid := gen_random_uuid(); t_cab uuid := gen_random_uuid(); t_safety uuid := gen_random_uuid();
  t_sat uuid := gen_random_uuid(); t_live uuid := gen_random_uuid();
  m1 uuid := gen_random_uuid(); m2 uuid := gen_random_uuid(); m3 uuid := gen_random_uuid(); m4 uuid := gen_random_uuid();
begin
  select workspace_id into ws from projects where name = 'Line 4 retrofit (demo)' order by created_at limit 1;
  select id into pm from auth.users where email = 'demo.pm@plenum.test';
  select id into mem from auth.users where email = 'demo.member@plenum.test';
  if ws is null or pm is null or mem is null then raise exception 'Run the demo seed and apply-demo-roles.sql first'; end if;

  delete from projects where name = 'Dock 3 conveyor upgrade (agent demo)' and workspace_id = ws;
  insert into projects (id, workspace_id, name, email_slug, created_by) values (p, ws, 'Dock 3 conveyor upgrade (agent demo)', 'dock3-' || substr(p::text, 1, 8), pm);
  insert into project_members (project_id, user_id, role) values
    (p, mem, 'member'),
    (p, (select id from auth.users where email = 'demo.viewer@plenum.test'), 'contributor') on conflict do nothing;

  insert into phases (id, project_id, name, position) values
    (ph_design, p, 'Design', 1), (ph_proc, p, 'Procurement', 2), (ph_inst, p, 'Installation', 3), (ph_comm, p, 'Commissioning', 4);

  insert into tasks (id, project_id, phase_id, title, owner_id, start_date, due_date, status, priority, position, is_milestone) values
    (t_layout,  p, ph_design, 'Finalise layout drawings',    pm,  '2026-11-02', '2026-11-06', 'done',        'normal', 1, false),
    (t_order,   p, ph_proc,   'Order conveyor modules',      mem, '2026-11-09', '2026-11-20', 'in_progress', 'high',   1, false),
    (t_deliv,   p, ph_proc,   'Conveyor delivery',           mem, '2026-11-23', '2026-12-18', 'todo',        'high',   2, false),
    (t_floor,   p, ph_inst,   'Prepare floor and anchors',   pm,  '2026-11-30', '2026-12-11', 'todo',        'normal', 1, false),
    (t_plc,     p, ph_comm,   'PLC programming',             mem, '2026-11-30', '2027-01-08', 'todo',        'normal', 1, false),
    (t_install, p, ph_inst,   'Install conveyor modules',    pm,  '2026-12-21', '2027-01-15', 'todo',        'high',   2, false),
    (t_cab,     p, ph_inst,   'Install control cabinet',     mem, '2027-01-04', '2027-01-15', 'todo',        'normal', 3, false),
    (t_safety,  p, ph_comm,   'Safety inspection',           pm,  '2027-01-18', '2027-01-22', 'todo',        'high',   2, false),
    (t_sat,     p, ph_comm,   'Site acceptance test',        pm,  '2027-01-25', '2027-01-29', 'todo',        'high',   3, false),
    (t_live,    p, ph_comm,   'Go-live',                     pm,  '2027-02-01', '2027-02-01', 'todo',        'high',   4, true);
  insert into task_dependencies (predecessor_id, successor_id) values
    (t_layout, t_order), (t_order, t_deliv), (t_deliv, t_install), (t_floor, t_install), (t_install, t_safety),
    (t_safety, t_sat), (t_cab, t_sat), (t_plc, t_sat), (t_sat, t_live);

  insert into messages (id, project_id, external_id, from_name, from_address, subject, body_text, received_at) values
    (m1, p, 'dock3-1', 'Pieter de Vries', 'pieter@conveyors.example', 'Delivery slot', 'Our factory is fully booked in December. The earliest we can ship all modules is the first week of January.', now() - interval '2 days'),
    (m2, p, 'dock3-2', 'Lena Hoffmann', 'lena.hoffmann@plant.example', 'Floor survey', 'The survey shows the slab at bay 3 is 12 mm out of level. Anchors there need a levelling screed first.', now() - interval '3 days'),
    (m3, p, 'dock3-3', 'Sofia Rossi', 'sofia.rossi@plant.example', 'Safety inspector', 'The notified body can only visit on 18 Jan. There is no other slot before February.', now() - interval '1 day'),
    (m4, p, 'dock3-4', 'Pieter de Vries', 'pieter@conveyors.example', 'Module count', 'Two of the 14 modules are still on the old drawing revision. We need your confirmation on the final length.', now() - interval '5 hours');

  insert into risks (project_id, source_message_id, kind, title, details, status, owner_id, due_date) values
    (p, m1, 'risk',  'Conveyor delivery may slip into January', 'Supplier is fully booked in December.', 'open', mem, '2026-11-20'),
    (p, m3, 'risk',  'Only one safety inspection slot before February', 'Any slip in installation misses the 18 Jan slot.', 'open', pm, '2027-01-08'),
    (p, m2, 'issue', 'Slab at bay 3 is out of level', 'Needs a levelling screed before anchors go in.', 'open', pm, '2026-12-04'),
    (p, m4, 'issue', 'Two modules on old drawing revision', 'Supplier needs a confirmed length.', 'open', mem, '2026-11-13');

  insert into decisions (project_id, source_message_id, title, details) values
    (p, null, 'Go-live target stays at 1 Feb 2027', 'Agreed at the kick-off; revisit if delivery moves past 8 Jan.');
end $$;
