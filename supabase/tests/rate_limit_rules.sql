-- Rate limit rules (stage 5, S5-2): the counter holds across callers, resets per window, and the table is private.
\set ON_ERROR_STOP on
-- People cannot count, read or write anything.
set role authenticated;
do $$
begin
  begin
    perform public.rate_limit_hit('t:x', 1, 60);
    raise exception 'a signed-in person called rate_limit_hit';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from rate_limits;
    raise exception 'counters are readable';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into rate_limits values ('t:x', now(), 1);
    raise exception 'counters are writable';
  exception when insufficient_privilege then null;
  end;
end $$;
set role anon;
do $$
begin
  begin
    perform public.rate_limit_hit('t:x', 1, 60);
    raise exception 'an anonymous caller called rate_limit_hit';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The server (service role) counts.
set role service_role;
do $$
begin
  if not (public.rate_limit_hit('t:a', 2, 60) and public.rate_limit_hit('t:a', 2, 60)) then
    raise exception 'refused within the limit';
  end if;
  if public.rate_limit_hit('t:a', 2, 60) then raise exception 'allowed past the limit'; end if;
  if not public.rate_limit_hit('t:b', 2, 60) then raise exception 'keys are not independent'; end if;
end $$;
reset role;
update rate_limits set window_start = now() - interval '2 minutes' where key = 't:a';
do $$
begin
  if not public.rate_limit_hit('t:a', 2, 60) then raise exception 'window did not reset'; end if;
end $$;
