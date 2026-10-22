-- Email digest rules (S5-6). Runs after the earlier people exist: Pia manager (b), Mo member (c).
\set ON_ERROR_STOP on

do $$
begin
  if exists (select 1 from public.daily_digests()) then raise exception 'digest built without opt-in'; end if;
end $$;

-- Earlier tests may have changed Mo's membership; make sure Mo is a member.
insert into public.project_members (project_id, user_id, role)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'member')
on conflict (project_id, user_id) do nothing;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
update public.profiles set digest_daily = true where id = '00000000-0000-0000-0000-00000000000c';
-- Mo cannot switch the digest on for someone else.
update public.profiles set digest_daily = true where id = '00000000-0000-0000-0000-00000000000b';
do $$
begin
  begin
    perform * from public.daily_digests();
    raise exception 'a signed-in user ran the digest';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

do $$
begin
  if not exists (select 1 from public.daily_digests() where user_id = '00000000-0000-0000-0000-00000000000c') then
    raise exception 'opted-in person missing from digest';
  end if;
  if exists (select 1 from public.daily_digests() where user_id <> '00000000-0000-0000-0000-00000000000c') then
    raise exception 'digest includes a person who did not opt in';
  end if;
end $$;
