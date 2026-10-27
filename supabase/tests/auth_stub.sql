-- Minimal stand-in for Supabase's auth schema, so migrations run on plain Postgres in tests.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now());
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select jsonb_build_object('sub', current_setting('request.jwt.claim.sub', true), 'email', nullif(current_setting('request.jwt.claim.email', true), ''));
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;
grant usage on schema auth to authenticated;
