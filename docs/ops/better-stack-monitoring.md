# Better Stack Monitoring & Status Page

> Operational reference for the EquipQR uptime monitors and public status page hosted by Better Stack.

## Overview

Better Stack provides two uptime monitors and a public status page for EquipQR:

| Component | Purpose |
|---|---|
| **Web Availability Monitor** | Proves the production SPA at `https://equipqr.app/` responds with HTTP 200 |
| **Deep Health Monitor** | Proves the Supabase backend and database are reachable via the healthcheck edge function |
| **Public Status Page** | Customer-facing uptime dashboard at `https://status.equipqr.app` |

## Monitors

### Web Availability

| Field | Value |
|---|---|
| Monitor name | `EquipQR Web` |
| Target URL | `https://equipqr.app/` |
| Check type | HTTP(S) keyword / status code |
| Expected status | 200 |
| Check interval | 3 minutes |
| Regions | US East, US West (or Better Stack default multi-region) |

### Deep Health (Backend + Database)

| Field | Value |
|---|---|
| Monitor name | `EquipQR API Health` |
| Target URL | `https://ymxkzronkhwxzcdcbnwq.supabase.co/functions/v1/healthcheck` |
| Check type | HTTP(S) keyword |
| Expected status | 200 |
| Expected keyword | `"ok":true` |
| Check interval | 3 minutes |
| Regions | US East, US West (or Better Stack default multi-region) |

The healthcheck endpoint returns JSON with the following contract:

```json
{
  "ok": true,
  "service": "healthcheck",
  "environment": "production",
  "checked_at": "2026-04-04T12:00:00.000Z",
  "checks": {
    "db": {
      "ok": true,
      "latency_ms": 12
    }
  }
}
```

When the database check fails or times out, the endpoint returns HTTP 503 with `"ok": false` and an `error_code` field in `checks.db`.

## Public Status Page

| Field | Value |
|---|---|
| Status page title | EquipQR Status |
| Status page URL | `https://status.equipqr.app` |
| Better Stack subdomain | `equipqr.betteruptime.com` |
| Components shown | EquipQR Web, EquipQR API Health |
| History / uptime chart | Enabled (90-day history) |

## DNS / Custom Domain Setup

`status.equipqr.app` points to the Better Stack-hosted status page via a CNAME record.

### Steps

1. In the Better Stack status page settings, enable the custom domain and note the **CNAME target** provided.
2. In the **Vercel dashboard** (where `equipqr.app` DNS is managed):
   - Navigate to the domain `equipqr.app` > DNS Records.
   - Add a CNAME record:
     - **Name:** `status`
     - **Value:** `statuspage.betteruptime.com`
     - **TTL:** Auto / 300
3. Wait for DNS propagation (typically < 5 minutes on Vercel).
4. Verify: `https://status.equipqr.app` should load the Better Stack status page.

| DNS Record | Type | Name | Value |
|---|---|---|---|
| Status page CNAME | CNAME | `status` | `statuspage.betteruptime.com` |

## Alert Policy

| Setting | Value |
|---|---|
| Alert recipients | Managed in Better Stack (on-call team member email) |
| Escalation policy | Email immediately on incident confirmation |
| Incident confirmation | Confirmed after 2 consecutive failures |
| Recovery notification | Enabled |

## Healthcheck Edge Function Details

- **Source:** `supabase/functions/healthcheck/index.ts`
- **Database RPC:** `public.monitoring_healthcheck()` (migration `20260404120000`)
- **JWT required:** No (`verify_jwt = false` in `supabase/config.toml`)
- **Timeout:** 5 seconds (returns `503` with `error_code: "timeout"` if exceeded)
- **Methods:** `GET` only (returns `405` for other methods, `OPTIONS` for CORS preflight)

## Maintenance

- If the healthcheck endpoint changes its response contract, update the Better Stack keyword monitor to match.
- If the Supabase project is migrated to a new ref, update the deep health monitor URL.
- If `equipqr.app` DNS moves away from Vercel, recreate the `status` CNAME at the new provider.
