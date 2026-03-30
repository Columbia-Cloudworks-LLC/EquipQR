# Data Subject Request (DSR) Compliance Runbook

## Overview

This runbook covers the operational procedures for handling CCPA/CPRA Data Subject Requests in EquipQR. All DSR handling must follow these procedures to ensure lawful compliance and produce auditable evidence.

## Ownership

| Role | Responsibility |
|------|---------------|
| **Privacy Owner** | Final authority on DSR decisions. Reviews denials and extensions. |
| **Engineering Owner** | Maintains the DSR system, fulfillment engine, and evidence infrastructure. |
| **Legal Approver** | Signs off on denial reasons and exception classifications. |
| **Incident Contact** | Escalation point for SLA breaches or system failures during fulfillment. |

## Request Types

| Type | CCPA/CPRA Right | Description |
|------|----------------|-------------|
| `access` | Right to Know | Provide the consumer with their personal data |
| `deletion` | Right to Delete | Delete personal data, subject to legal exceptions |
| `correction` | Right to Correct | Fix inaccurate personal information |
| `opt_out` | Right to Opt-Out | Opt out of sale/sharing of PI (EquipQR does not sell PI) |
| `limit_use` | Right to Limit | Limit use of sensitive personal information |

## Intake

1. Consumer submits via `/privacy-request` form or emails `privacy@equipqr.app`.
2. The `submit-privacy-request` edge function validates input, verifies hCaptcha, checks rate limits, and inserts into `dsr_requests`.
3. An `intake_received` event is automatically logged in `dsr_request_events`.
4. The request starts in `received` (unauthenticated) or `verifying` (authenticated) status.
5. `due_at` is set to 45 calendar days from receipt.

### Abuse Controls

- hCaptcha required when `HCAPTCHA_SECRET_KEY` is configured
- Maximum 3 requests per email address per 24 hours
- Duplicate suppression: same email + type within 1 hour is rejected

## Identity Verification

### Authenticated Users

If the submitter was signed in, the system auto-links their `user_id`. Verify that the email on the request matches the authenticated user's email.

**Verification method:** `authenticated_match`

### Unauthenticated Users

1. Send a verification email to the address on the request with a time-limited confirmation link.
2. Upon confirmation, update via the `manage-dsr-request` function with action `verify` and method `email_challenge`.

### Authorized Agents

If a third party submits on behalf of a consumer:

1. Require signed authorization from the consumer.
2. Verify the agent's identity separately.
3. Use verification method `authorized_agent`.

### Manual Review

For ambiguous cases, an admin reviews and verifies using `manual_review`.

## Processing

Once verified, move the request to `processing` status. The system logs a `processing_started` event.

### Deletion Requests

Use the `fulfill_deletion` action in `manage-dsr-request` which calls `fulfill_dsr_deletion()`:

1. Anonymize audit log entries (actor_name, actor_email, changes JSONB)
2. Delete scan records linked to the user
3. Delete export log records for the email
4. Delete notification records for the user
5. Delete push subscription records for the user
6. Delete organization invitations sent to the email
7. Anonymize the user profile (name, avatar)

Each step records a `fulfillment_step_completed` event with row counts.

**Legal exceptions (retain, do not delete):**
- Records required for ongoing legal proceedings
- Records needed to complete a transaction already in progress
- Records required for security incident investigation
- Records subject to regulatory retention requirements

Document any retained data and the exception basis in the event ledger.

### Access Requests

1. Export the consumer's data across all domains.
2. Package into a secure, human-readable format.
3. Deliver via secure channel (authenticated download or encrypted email).
4. Record `fulfillment_step_completed` with delivery method and data categories.

### Correction Requests

1. Identify the specific data to correct.
2. Apply the correction.
3. Record the old and new values in the event ledger.
4. Verify the correction was applied.

### Opt-Out Requests

EquipQR does not sell or share personal information. Acknowledge receipt, confirm no action required, and close with a note explaining the basis.

### Limit-Use Requests

1. Set `profiles.limit_sensitive_pi = true` for the user.
2. Confirm the `enforce_scan_location_privacy` trigger will respect the setting.
3. Record the action in the event ledger.

## Extensions

CPRA allows one 45-day extension (90 days total) when reasonably necessary.

1. Use the `extend` action before the original deadline.
2. Provide a reason (stored in `extension_reason`).
3. `extended_due_at` is set to 90 days from receipt.
4. **Notify the consumer** of the extension before the original deadline.

## Denials

Some requests may be lawfully denied. Valid bases include:

- Identity could not be verified
- Request falls under a legal exception (e.g., legal claims, security)
- Request is manifestly unfounded or excessive

1. Use the `deny` action with a specific `reason`.
2. The system logs a `denial_issued` event.
3. **Notify the consumer** of the denial and the basis.

## SLA Monitoring

| Metric | Threshold | Action |
|--------|-----------|--------|
| Time since receipt | 35 days | Warning: deadline approaching |
| Time since receipt | 43 days | Critical: 2 days remaining |
| Past `due_at` | Overdue | Escalate to Privacy Owner immediately |

Query for at-risk requests:

```sql
SELECT id, requester_email, request_type, status, due_at,
       COALESCE(extended_due_at, due_at) AS effective_due,
       COALESCE(extended_due_at, due_at) - now() AS time_remaining
FROM public.dsr_requests
WHERE status NOT IN ('completed', 'denied')
ORDER BY COALESCE(extended_due_at, due_at) ASC;
```

## Evidence Packet

For each completed request, the compliance evidence packet consists of:

1. **DSR record** (`dsr_requests` row) with all timestamps and metadata
2. **Event ledger** (`dsr_request_events` rows) with immutable lifecycle history
3. **Fulfillment receipts** (per-step row counts and domain coverage)

### Generating a Packet

```sql
SELECT
  r.*,
  jsonb_agg(
    jsonb_build_object(
      'event_type', e.event_type,
      'summary', e.summary,
      'details', e.details,
      'actor_email', e.actor_email,
      'created_at', e.created_at
    ) ORDER BY e.created_at
  ) AS events
FROM public.dsr_requests r
LEFT JOIN public.dsr_request_events e ON e.dsr_request_id = r.id
WHERE r.id = '<DSR_REQUEST_ID>'
GROUP BY r.id;
```

## Subprocessor Obligations

If personal data is shared with subprocessors (e.g., Stripe, Google), deletion requests may require:

1. Contacting the subprocessor with the deletion request.
2. Recording the subprocessor's acknowledgment in the event ledger.
3. Documenting any data the subprocessor retains under their own legal basis.

## Retention of DSR Evidence

- DSR request records and event ledger entries should be retained for a minimum of **24 months** after closure.
- The event ledger is append-only and cannot be modified or deleted by any role.
- After the retention period, consider archiving rather than deleting for long-term compliance proof.

## Cockpit v1 Operating Notes

### Role Access

- Cockpit routes (`/dashboard/dsr`, `/dashboard/dsr/:requestId`) are available only to org `owner` and `admin`.
- Requests are tenant-scoped via `dsr_requests.organization_id`; cross-org reads and mutations are masked as not found.

### Queue and Case Workflow

1. Open queue and prioritize by SLA buckets (`overdue`, `due_soon`, `on_track`).
2. Claim and progress checklist steps in-case (`verify_identity`, `search_systems`, `fulfill_request`).
3. Use lifecycle actions (`deny`, `extend`, `complete`) with reason fields where required.
4. For stale-tab conflicts, refresh the case and retry with the latest version.

### Evidence Export Contract

- Export metadata is stored on `dsr_requests.export_artifacts`.
- Expected fields: `version`, `status`, `requested_by`, `requested_at`, `generated_at`, `checksum_sha256`, `retry_count`, `last_error`.
- Status values: `pending`, `ready`, `failed`.
- Retry ceiling is **3**; after ceiling is reached, escalate to Engineering Owner using incident path.

### Notice Delivery Outcomes

- Lifecycle notices log immutable events:
  - `notice_sent`
  - `notice_failed`
- If notice send fails, lifecycle state remains authoritative; operator retries with `resend_notice`.

### Rollout Blockers (Must Be Green)

- Cross-org denial regression test remains passing.
- Tenant-scoped auth checks remain enforced for all DSR case actions.
- Export metadata integrity verified in test suite (`pending|ready|failed` contract).
- Two unassisted operator observation sessions completed with findings documented.
