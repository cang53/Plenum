-- Settings rules (stage 4, S4-5). Reuses earlier people: Pia manager (b), Mo member (c).
\set ON_ERROR_STOP on
set role authenticated;

do $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  update profiles set display_name = 'Mo B', locale = 'nl' where id = auth.uid();
  -- Mo cannot edit someone else's profile.
  update profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'edited another person''s profile'; end if;
  begin
    update profiles set display_name = '  ' where id = auth.uid();
    raise exception 'saved a blank name';
  exception when check_violation then null;
  end;
  -- A plain member cannot rename the project or change its address.
  update projects set name = 'Renamed', email_slug = 'renamed-by-mo' where id = '20000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'member edited project settings'; end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  update projects set name = 'Renamed', email_slug = 'renamed-by-pia' where id = '20000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'manager could not edit project settings'; end if;
  begin
    update projects set email_slug = 'Bad Slug' where id = '20000000-0000-0000-0000-000000000001';
    raise exception 'saved an invalid slug';
  exception when check_violation then null;
  end;
  raise notice 'settings rules: all checks passed';
end $$;

-- An old address stays reserved: another workspace cannot take it, and mail to it finds no project.
reset role;
do $$
begin
  if not exists (select 1 from public.retired_slugs where slug is not null) then
    raise exception 'old address was not reserved';
  end if;
  begin
    insert into public.projects (workspace_id, name, email_slug)
    select '10000000-0000-0000-0000-000000000001', 'Squatter', slug from public.retired_slugs limit 1;
    raise exception 'a retired address was reused';
  exception when unique_violation then null;
  end;
end $$;
\echo 'settings rules: retired address checks passed'
