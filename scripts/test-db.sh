#!/usr/bin/env bash
# Runs the database migrations and access-rule tests against a throwaway local Postgres.
# Uses DATABASE_URL when set (CI), otherwise starts a temporary cluster with initdb.
set -euo pipefail
cd "$(dirname "$0")/.."

run_tests() {
  local url="$1"
  psql "$url" -q -v ON_ERROR_STOP=1 -f supabase/tests/auth_stub.sql
  for f in supabase/migrations/*.sql; do
    psql "$url" -q -v ON_ERROR_STOP=1 -f "$f"
  done
  for f in supabase/tests/access_rules.sql supabase/tests/tasks_rules.sql supabase/tests/messages_rules.sql supabase/tests/linking_rules.sql supabase/tests/suggestions_rules.sql supabase/tests/audit_rules.sql supabase/tests/outbox_rules.sql supabase/tests/accept_rules.sql supabase/tests/invitation_rules.sql supabase/tests/task_details_rules.sql supabase/tests/notifications_rules.sql supabase/tests/search_rules.sql supabase/tests/settings_rules.sql supabase/tests/onboarding_rules.sql supabase/tests/hardening_rules.sql supabase/tests/rate_limit_rules.sql supabase/tests/export_rules.sql supabase/tests/delete_rules.sql supabase/tests/roles_rules.sql supabase/tests/digest_rules.sql supabase/tests/ai_cap_rules.sql supabase/tests/security_audit_rules.sql supabase/tests/paging_rules.sql; do
    psql "$url" -q -v ON_ERROR_STOP=1 -f "$f"
  done
}

if [[ -n "${DATABASE_URL:-}" ]]; then
  run_tests "$DATABASE_URL"
  exit 0
fi

PGBIN="${PGBIN:-$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")}"
DIR="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
if [[ "$(id -u)" == "0" ]]; then
  chown -R postgres "$DIR"
  SU=(su postgres -c)
else
  SU=(bash -c)
fi
trap '"${SU[@]}" "\"$PGBIN/pg_ctl\" -D \"$DIR/data\" stop -m immediate" >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
"${SU[@]}" "'$PGBIN/initdb' -D '$DIR/data' -A trust -U postgres >/dev/null"
"${SU[@]}" "'$PGBIN/pg_ctl' -D '$DIR/data' -o '-p $PORT -k $DIR' -l '$DIR/log' -w start >/dev/null"
run_tests "postgresql://postgres@localhost:$PORT/postgres?host=$DIR"
