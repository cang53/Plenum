#!/usr/bin/env bash
# Restore drill (docs/backup-restore.md): back up the LOCAL Supabase stack, wipe it, restore, verify.
# Only ever touches the local database container; never set it up against the hosted project.
set -euo pipefail
cd "$(dirname "$0")/.."

ID="$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' supabase/config.toml)"
C="${DRILL_DB_CONTAINER:-supabase_db_$ID}"
case "$C" in supabase_db_*) ;; *) echo "Refusing: $C is not a local Supabase db container" >&2; exit 1 ;; esac
sql() { docker exec -i "$C" psql -U supabase_admin -d postgres -qAt -v ON_ERROR_STOP=1 "$@"; }

# Row counts of every public table, plus RLS flags and policy count, as one comparable text.
snapshot() {
  sql <<'SQL'
select 'rls ' || c.relname || ' ' || c.relrowsecurity from pg_class c
  join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by 1;
select 'policies ' || count(*) from pg_policies where schemaname = 'public';
select 'rows ' || table_name || ' ' || (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', table_name), false, true, '')))[1]::text
  from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1;
SQL
}

# Two people in two workspaces, so the access check below has someone who must see nothing.
sql <<'SQL'
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000d0001', 'drill-a@example.test'),
  ('00000000-0000-0000-0000-0000000d0002', 'drill-b@example.test') on conflict do nothing;
insert into public.profiles (id, display_name, email) values
  ('00000000-0000-0000-0000-0000000d0001', 'Drill A', 'drill-a@example.test'),
  ('00000000-0000-0000-0000-0000000d0002', 'Drill B', 'drill-b@example.test') on conflict do nothing;
insert into public.workspaces (id, name) values
  ('10000000-0000-0000-0000-0000000d0001', 'Drill one'), ('10000000-0000-0000-0000-0000000d0002', 'Drill two') on conflict do nothing;
insert into public.workspace_members (workspace_id, user_id, kind, is_admin) values
  ('10000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0001', 'staff', true),
  ('10000000-0000-0000-0000-0000000d0002', '00000000-0000-0000-0000-0000000d0002', 'staff', true) on conflict do nothing;
insert into public.projects (id, workspace_id, name, email_slug, created_by) values
  ('20000000-0000-0000-0000-0000000d0001', '10000000-0000-0000-0000-0000000d0001', 'Drill project', 'drill-project', '00000000-0000-0000-0000-0000000d0001') on conflict do nothing;
SQL

# What a signed-in person can see in projects: A owns the project, B must not see it.
visible() {
  sql -v who="$1" <<'SQL'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'who', true) as c \gset
select count(*) from public.projects where name = 'Drill project';
rollback;
SQL
}
[ "$(visible 00000000-0000-0000-0000-0000000d0001)" = 1 ] || { echo "Before: owner cannot see the project" >&2; exit 1; }
[ "$(visible 00000000-0000-0000-0000-0000000d0002)" = 0 ] || { echo "Before: outsider can see the project" >&2; exit 1; }

before="$(snapshot)"
dump="$(mktemp)"; trap 'rm -f "$dump"' EXIT
docker exec "$C" pg_dump -U postgres -d postgres --schema=public --format=custom > "$dump"
echo "Backed up $(wc -c < "$dump") bytes"

# Wipe the schema, as a lost database would be; the dump recreates the schema and its grants.
sql -c "drop schema public cascade"
[ "$(sql -c "select count(*) from information_schema.tables where table_schema = 'public'")" = 0 ] || { echo "Wipe failed" >&2; exit 1; }

docker exec -i "$C" pg_restore -U supabase_admin -d postgres --exit-on-error < "$dump"

after="$(snapshot)"
if [ "$before" != "$after" ]; then
  echo "Restore differs from backup:" >&2
  diff <(echo "$before") <(echo "$after") >&2 || true
  exit 1
fi
[ "$(visible 00000000-0000-0000-0000-0000000d0001)" = 1 ] || { echo "After: owner cannot see the project" >&2; exit 1; }
[ "$(visible 00000000-0000-0000-0000-0000000d0002)" = 0 ] || { echo "After: outsider can see the project" >&2; exit 1; }
echo "Restore drill passed: $(echo "$after" | grep -c '^rows ') tables, row counts, row-level security and access all match."
