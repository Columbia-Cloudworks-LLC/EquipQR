---
name: billing-simulator
description: Simulates Stripe subscription lifecycle events against a local Supabase instance and validates the resulting database state. Use when testing billing webhooks, simulating subscription changes (create, renew, cancel, pause, resume), verifying entitlement updates, or when the user mentions "billing test", "simulate webhook", "subscription lifecycle", or "validate entitlements".
---

# Billing Simulator

Simulate Stripe webhook events locally and verify that the `stripe-license-webhook` Edge Function correctly updates subscription state in the database.

## Prerequisites

- **Stripe CLI** installed and authenticated (`stripe login`)
- **Supabase CLI** running locally (`npx supabase start`)
- **Deno** available (bundled with Supabase CLI)
- Edge Functions served: `npx supabase functions serve`
- Stripe CLI forwarding active (see Quick Start)

## Quick Start

### 1. Forward Stripe events to local Supabase

```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-license-webhook
```

Copy the webhook signing secret (`whsec_...`) that Stripe CLI prints and set it:

```bash
# In a .env.local or pass to supabase functions serve
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Trigger an event

Use the helper script to fire a Stripe CLI event:

```bash
bash .cursor/skills/billing-simulator/scripts/trigger-webhook.sh customer.subscription.created
```

### 3. Validate entitlements

After the webhook processes, verify the database updated correctly:

```bash
deno run --allow-net --allow-env .cursor/skills/billing-simulator/scripts/validate-entitlements.ts
```

## Supported Events

The `stripe-license-webhook` Edge Function handles these events:

| Stripe Event | DB Effect |
|---|---|
| `checkout.session.completed` | Inserts into `user_license_subscriptions`, syncs `organization_slots` |
| `invoice.payment_succeeded` | Updates subscription status and period dates |
| `invoice.payment_failed` | Sets status to `past_due` |
| `customer.subscription.updated` | Updates status/quantity/period, cleans up excess members |
| `customer.subscription.deleted` | Sets status to `cancelled`, deactivates non-owner members |
| `customer.subscription.paused` | Sets status to `paused`, deactivates non-owner members |
| `customer.subscription.resumed` | Sets status to `active`, reactivates members up to limit |
| `customer.subscription.trial_will_end` | Creates `notifications` record for org owner |

## Simulation Workflows

### Happy-path lifecycle

```
1. trigger checkout.session.completed
2. validate → user_license_subscriptions.status = 'active'
3. trigger invoice.payment_succeeded
4. validate → period dates advanced
5. trigger customer.subscription.deleted
6. validate → status = 'cancelled', non-owner members inactive
```

### Payment failure → recovery

```
1. trigger invoice.payment_failed
2. validate → status = 'past_due'
3. trigger invoice.payment_succeeded
4. validate → status = 'active'
```

### Pause / resume

```
1. trigger customer.subscription.paused
2. validate → status = 'paused', non-owner members inactive
3. trigger customer.subscription.resumed
4. validate → status = 'active', members reactivated
```

## Key Tables

| Table | Purpose |
|---|---|
| `user_license_subscriptions` | Per-org subscription record (status, quantity, period) |
| `organization_slots` | Purchased vs used license slots per billing period |
| `organization_members` | Member status (`active`/`inactive`) affected by sub changes |
| `webhook_events` | Idempotency — stores processed `event_id` values |
| `stripe_event_logs` | Audit trail of all processed webhook payloads |
| `notifications` | Trial-ending warnings sent to org owners |

## Environment Variables

| Variable | Source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Output of `stripe listen` (local) or Dashboard → Webhooks (remote) |
| `SUPABASE_URL` | `http://localhost:54321` for local |
| `SUPABASE_SERVICE_ROLE_KEY` | Output of `npx supabase status` |

## Troubleshooting

- **"Event already processed"** — The `webhook_events` table enforces idempotency. Delete the row for the event ID or use `--force` in `trigger-webhook.sh` to clear it first.
- **Signature mismatch** — Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from `stripe listen`.
- **Edge Function not running** — Run `npx supabase functions serve` in a separate terminal.
- **No subscription record found** — `checkout.session.completed` must run first to create the `user_license_subscriptions` row.
