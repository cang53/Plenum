#!/usr/bin/env bash
# Starts the local Supabase stack for e2e. Image pulls are rate limited per registry on shared runners,
# so each attempt uses the next registry; layers already downloaded stay, so every attempt gets further.
set -uo pipefail
services=studio,imgproxy,edge-runtime,vector,logflare,realtime,storage-api,postgres-meta,supavisor
registries=(ghcr.io public.ecr.aws docker.io)
for attempt in 1 2 3 4 5 6 7 8 9; do
  registry=${registries[$(((attempt - 1) % ${#registries[@]}))]}
  echo "::group::supabase start, attempt $attempt from $registry"
  SUPABASE_INTERNAL_IMAGE_REGISTRY=$registry timeout 150 supabase start -x "$services"
  status=$?
  echo "::endgroup::"
  [ "$status" = 0 ] && exit 0
  supabase stop --no-backup || true
  sleep 20
done
exit 1
