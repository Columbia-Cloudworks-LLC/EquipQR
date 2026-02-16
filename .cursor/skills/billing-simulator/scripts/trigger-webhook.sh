#!/usr/bin/env bash
# trigger-webhook.sh — Fire a Stripe CLI test event at the local Supabase webhook endpoint
#
# Usage:
#   bash .cursor/skills/billing-simulator/scripts/trigger-webhook.sh <event_type> [--force]
#
# Examples:
#   bash .cursor/skills/billing-simulator/scripts/trigger-webhook.sh customer.subscription.created
#   bash .cursor/skills/billing-simulator/scripts/trigger-webhook.sh invoice.payment_failed --force
#
# Options:
#   --force   Clear the idempotency record for the last triggered event before sending

set -euo pipefail

WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:54321/functions/v1/stripe-license-webhook}"
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

# ---------------------------------------------------------------------------
# Supported event types (mapped to stripe trigger fixture names)
# See: https://docs.stripe.com/cli/trigger#supported-events
# ---------------------------------------------------------------------------
SUPPORTED_EVENTS=(
  "checkout.session.completed"
  "customer.subscription.created"
  "customer.subscription.updated"
  "customer.subscription.deleted"
  "customer.subscription.paused"
  "customer.subscription.resumed"
  "customer.subscription.trial_will_end"
  "invoice.payment_succeeded"
  "invoice.payment_failed"
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
usage() {
  echo "Usage: $0 <event_type> [--force]"
  echo ""
  echo "Supported events:"
  for evt in "${SUPPORTED_EVENTS[@]}"; do
    echo "  - $evt"
  done
  exit 1
}

is_supported() {
  local target="$1"
  for evt in "${SUPPORTED_EVENTS[@]}"; do
    [[ "$evt" == "$target" ]] && return 0
  done
  return 1
}

# ---------------------------------------------------------------------------
# Parse args
# ---------------------------------------------------------------------------
EVENT_TYPE="${1:-}"
FORCE=false

if [[ -z "$EVENT_TYPE" ]]; then
  usage
fi

shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true; shift ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if ! is_supported "$EVENT_TYPE"; then
  echo "Error: Unsupported event type '$EVENT_TYPE'"
  usage
fi

# ---------------------------------------------------------------------------
# Ensure stripe CLI is available
# ---------------------------------------------------------------------------
if ! command -v stripe &>/dev/null; then
  echo "Error: Stripe CLI not found. Install it: https://docs.stripe.com/stripe-cli"
  exit 1
fi

# ---------------------------------------------------------------------------
# Optional: clear idempotency record (--force)
# ---------------------------------------------------------------------------
if [[ "$FORCE" == "true" ]]; then
  if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo "Warning: --force requires SUPABASE_SERVICE_ROLE_KEY to clear webhook_events."
    echo "         Set it via: export SUPABASE_SERVICE_ROLE_KEY=\$(npx supabase status -o json | jq -r '.SERVICE_ROLE_KEY')"
    echo "         Skipping idempotency clear."
  else
    echo "Clearing recent webhook_events for idempotency reset..."
    curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/execute_sql" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"query": "DELETE FROM webhook_events WHERE processed_at > now() - interval '\''5 minutes'\''"}' \
      > /dev/null 2>&1 || echo "  (Could not clear webhook_events — this is non-fatal)"
  fi
fi

# ---------------------------------------------------------------------------
# Trigger the event
# ---------------------------------------------------------------------------
echo ""
echo "Triggering: $EVENT_TYPE"
echo "Endpoint:   $WEBHOOK_URL"
echo "---"

stripe trigger "$EVENT_TYPE" 2>&1

EXIT_CODE=$?

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "Event triggered successfully."
  echo ""
  echo "Next steps:"
  echo "  1. Check Edge Function logs:  npx supabase functions logs stripe-license-webhook"
  echo "  2. Validate entitlements:     deno run --allow-net --allow-env .cursor/skills/billing-simulator/scripts/validate-entitlements.ts"
else
  echo "Error: stripe trigger exited with code $EXIT_CODE"
  echo "Make sure 'stripe listen --forward-to $WEBHOOK_URL' is running in another terminal."
fi

exit $EXIT_CODE
