#!/usr/bin/env bash
# Starts the local Supabase stack for e2e. Anonymous image pulls are rate limited on shared runners,
# so when a pull fails, pull the images it names with the workflow's registry login and start again.
set -uo pipefail
services=studio,imgproxy,edge-runtime,vector,logflare,realtime,storage-api,postgres-meta,supavisor
log=$(mktemp)
for attempt in 1 2 3 4; do
  echo "::group::supabase start, attempt $attempt"
  timeout 240 supabase start -x "$services" 2>&1 | tee "$log"
  status=${PIPESTATUS[0]}
  echo "::endgroup::"
  [ "$status" = 0 ] && exit 0
  supabase stop --no-backup || true
  for image in $(grep -oE '(ghcr\.io|public\.ecr\.aws)/[A-Za-z0-9_./-]+:[A-Za-z0-9_.-]+' "$log" | sort -u); do
    echo "Pulling $image with the registry login"
    docker pull "$image" || true
  done
  sleep $((attempt * 15))
done
exit 1
