#!/usr/bin/env bash
# Starts the local Supabase stack for e2e. Anonymous image pulls are rate limited on shared runners,
# so when a pull fails, pull that image with the workflow's registry login and start again.
set -uo pipefail
services=studio,imgproxy,edge-runtime,vector,logflare,realtime,storage-api,postgres-meta,supavisor
log=$(mktemp)
for attempt in $(seq 1 12); do
  if supabase start -x "$services" 2>&1 | tee "$log"; then
    exit 0
  fi
  image=$(grep -oE 'Retrying after [0-9]+s: [^ ]+' "$log" | tail -1 | awk '{print $NF}')
  supabase stop --no-backup || true
  if [ -n "$image" ]; then
    echo "Pulling $image with the registry login"
    docker pull "$image" || sleep $((attempt * 10))
  else
    sleep $((attempt * 10))
  fi
done
exit 1
