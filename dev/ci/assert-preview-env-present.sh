#!/usr/bin/env bash
# Fails when the preview GitHub environment did not inject configuration.
# Prints only set/empty. Never prints values.
set -euo pipefail
if [ -z "${RESEND_API_KEY:-}" ]; then
  echo "::error::preview RESEND_API_KEY is empty."
  exit 1
fi
if [ -z "${SUPABASE_URL:-}" ]; then
  echo "::error::preview SUPABASE_URL is empty."
  exit 1
fi
echo "Preview environment injected a secret and a variable. Values were not printed."
