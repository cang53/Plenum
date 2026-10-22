#!/usr/bin/env bash
# Starts the local Supabase stack for e2e. Image pulls are rate limited per registry on shared runners,
# so each attempt uses the next registry; layers already downloaded stay, so every attempt gets further.
set -uo pipefail
services=studio,imgproxy,edge-runtime,vector,logflare,realtime,storage-api,postgres-meta,supavisor
registries=(ghcr.io public.ecr.aws docker.io)
cache=$HOME/supabase-cache
mkdir -p "$cache"
# A restored image cache was saved under one registry's names; try that registry first.
if [ -s "$cache/registry" ]; then registries=("$(cat "$cache/registry")" "${registries[@]}"); fi
for attempt in 1 2 3 4 5 6 7 8 9; do
  registry=${registries[$(((attempt - 1) % ${#registries[@]}))]}
  echo "::group::supabase start, attempt $attempt from $registry"
  SUPABASE_INTERNAL_IMAGE_REGISTRY=$registry timeout 150 supabase start -x "$services"
  status=$?
  echo "::endgroup::"
  if [ "$status" = 0 ]; then echo "$registry" > "$cache/registry.used"; exit 0; fi
  supabase stop --no-backup || true
  sleep 20
done
exit 1
