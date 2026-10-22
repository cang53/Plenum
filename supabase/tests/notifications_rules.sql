-- Notification rules (stage 4, S4-3). Runs last, reusing the earlier people: Pia manager (b), Mo member (c).
\set ON_ERROR_STOP on
set role authenticated;

do $$
declare n int; mo_before int; pia_id uuid;
begin
  -- Pia assigns the task to Mo: Mo is notified, Pia (the actor) is not.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  select count(*) into mo_before from notifications where kind = 'task_assigned';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  update tasks set owner_id = null where id = '40000000-0000-0000-0000-000000000001';
  update tasks set owner_id = '00000000-0000-0000-0000-00000000000c' where id = '40000000-0000-0000-0000-000000000001';
  -- Suggestions went to managers and the accepted invitation to Pia, who sent it.
  if not exists (select 1 from notifications where kind = 'suggestion_new')
     or not exists (select 1 from notifications where kind = 'invitation_accepted') then
    raise exception 'manager missing suggestion or invitation notification';
  end if;
  if exists (select 1 from notifications where kind = 'task_assigned') then
    raise exception 'actor notified about their own assignment';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  select count(*) into n from notifications where kind = 'task_assigned';
  if n <> mo_before + 1 then raise exception 'Mo not notified of assignment'; end if;
  -- Mo sees only their own rows, and can mark one read but not edit anything else.
  if exists (select 1 from notifications where user_id <> auth.uid()) then raise exception 'saw another person''s notification'; end if;
  update notifications set read_at = now() where kind = 'task_assigned';
  begin
    update notifications set subject = 'x';
    raise exception 'edited notification text';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into notifications (user_id, project_id, kind, subject)
    values (auth.uid(), '20000000-0000-0000-0000-000000000001', 'task_assigned', 'x');
    raise exception 'wrote a notification directly';
  exception when insufficient_privilege then null;
  end;

  -- An outsider (Eve) sees none.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', true);
  if exists (select 1 from notifications) then raise exception 'outsider saw notifications'; end if;
end $$;

reset role;
\echo 'notification rules: all checks passed'
