-- Persistent rate limits (stage 5, S5-2): one fixed-window counter per key, shared by every server instance.
create table rate_limits (
  key text primary key check (length(key) <= 200),
  window_start timestamptz not null,
  hits int not null
);
alter table rate_limits enable row level security;
revoke all on rate_limits from public, anon, authenticated;

-- Counts one hit; true while the key is within its limit for the current window.
create function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if length(p_key) > 200 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'bad rate limit arguments';
  end if;
  -- Keeps the table small without a scheduled job.
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;
  insert into rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into n;
  return n <= p_limit;
end;
$$;
revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated, service_role;
