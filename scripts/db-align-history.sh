#!/usr/bin/env bash
# One-off alignment of the hosted project's migration history with supabase/migrations/.
# Migrations 1 to 26 were applied by hand (connector and SQL editor), so the hosted history holds
# other version numbers. This marks those as reverted and migrations 1 to 26 as applied, so that
# `supabase db push` only runs migrations added after them. Safe to run again: with nothing left to
# align it does nothing. Needs a linked project (supabase link) and SUPABASE_ACCESS_TOKEN.
set -euo pipefail

LAST_HAND_APPLIED=20261022000026   # newest migration applied by hand
HAND_APPLIED_BEFORE=20261023000000 # hosted-only versions older than this came from the hand-applied era

list="$(supabase migration list | sed 's/│/|/g')"
echo "$list"

remote_only=()
local_only=()
while IFS='|' read -r local remote _; do
  local="$(echo "$local" | tr -d '[:space:]')"
  remote="$(echo "$remote" | tr -d '[:space:]')"
  [[ "$local" =~ ^[0-9]+$ || "$remote" =~ ^[0-9]+$ ]] || continue
  if [[ -z "$local" && "$remote" < "$HAND_APPLIED_BEFORE" ]]; then
    remote_only+=("$remote")
  elif [[ -z "$remote" && ! "$local" > "$LAST_HAND_APPLIED" ]]; then
    local_only+=("$local")
  fi
done <<< "$list"

if (( ${#remote_only[@]} )); then
  supabase migration repair --status reverted "${remote_only[@]}"
fi
if (( ${#local_only[@]} )); then
  supabase migration repair --status applied "${local_only[@]}"
fi
echo "aligned: ${#remote_only[@]} hosted-only reverted, ${#local_only[@]} local marked applied"
