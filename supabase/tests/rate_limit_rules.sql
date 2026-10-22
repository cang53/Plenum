-- Rate limit rules (stage 5, S5-2): the counter holds across callers, resets per window, and the table is private.
\set ON_ERROR_STOP on
set role anon;
do $$
begin
  if not (public.rate_limit_hit('t:a', 2, 60) and public.rate_limit_hit('t:a', 2, 60)) then
    raise exception 'refused within the limit';
  end if;
  if public.rate_limit_hit('t:a', 2, 60) then raise exception 'allowed past the limit'; end if;
  if not public.rate_limit_hit('t:b', 2, 60) then raise exception 'keys are not independent'; end if;
  begin
    perform count(*) from rate_limits;
    raise exception 'counters are readable';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
update rate_limits set window_start = now() - interval '2 minutes' where key = 't:a';
do $$
begin
  if not public.rate_limit_hit('t:a', 2, 60) then raise exception 'window did not reset'; end if;
end $$;
