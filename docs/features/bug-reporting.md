# In-App Bug Reporting System

This document describes the in-app bug reporting feature that allows authenticated users to submit issue reports directly from EquipQR. Reports are stored in the `tickets` database table, automatically synced to GitHub Issues for developer tracking, and users can track status and responses in real time.

## Overview

Users can access the bug reporting form from the **Support** page in the dashboard. Submitting a report:

1. Captures anonymized session diagnostics (app version, browser, errors, performance)
2. Creates a GitHub Issue in `Columbia-Cloudworks-LLC/EquipQR`, assigned to `viralarchitect` with the `user-reported` label
3. Inserts a record in the `tickets` Supabase table, linking the GitHub issue number
4. Shows a success confirmation to the user

Users can then track their tickets in the **My Reported Issues** section, which updates in real time as developers respond on GitHub.

## User Flow

### Submitting a Report

1. Navigate to **Support** from the sidebar user dropdown menu
2. Click the **"Report an Issue"** button in the contact section
3. Fill in a **Title** and **Description / Steps to Reproduce**
4. Click **Submit Report**
5. Session diagnostics are automatically collected (no action needed from user)
6. A success toast is shown; the dialog closes automatically

### Tracking Reports

1. Navigate to **Support** from the sidebar
2. The **My Reported Issues** section shows all submitted tickets
3. Each ticket displays status (Open / In Progress / Closed) and response count
4. Click a ticket to expand it and see the description, session diagnostics, and team responses
5. Updates happen in real time via Supabase Realtime broadcasts

## Privacy

The GitHub issue body contains **only the user's UUID** -- no personal information (name, email) is included. Session diagnostics are anonymized:

- **Collected:** App version, browser/OS, screen size, current route, timezone, online status, org plan tier, user role, recent console errors (message only), failed query keys, page load time, memory usage
- **NOT collected:** User name, email, organization name, team names, session tokens, or any other PII

## Architecture

### Database: `tickets` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated primary key |
| `user_id` | UUID (FK -> auth.users) | The reporting user's ID |
| `title` | TEXT | Issue title/subject |
| `description` | TEXT | Issue description/steps to reproduce |
| `status` | TEXT | `open`, `closed`, or `in_progress` |
| `github_issue_number` | INT (nullable) | Linked GitHub issue number |
| `github_issue_url` | TEXT (nullable) | Full URL to the GitHub issue |
| `metadata` | JSONB | Session diagnostics (app version, errors, perf metrics, etc.) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last activity timestamp |
| `closed_at` | TIMESTAMPTZ (nullable) | When the issue was closed |

### Database: `ticket_comments` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated primary key |
| `ticket_id` | UUID (FK -> tickets) | Parent ticket |
| `github_comment_id` | BIGINT (UNIQUE) | GitHub comment ID for idempotency |
| `author` | TEXT | GitHub username of commenter |
| `body` | TEXT | Sanitized comment text |
| `is_from_team` | BOOLEAN | Whether the comment is from a team member |
| `created_at` | TIMESTAMPTZ | When the comment was posted |

**RLS Policies:**
- Users can SELECT their own tickets and comments on their own tickets
- Service role can INSERT and UPDATE (used by edge functions)
- No DELETE policy -- intentional audit trail

### Edge Function: `create-ticket`

**Location:** `supabase/functions/create-ticket/index.ts`

**Auth pattern:** User-scoped auth (`requireUser()`) + admin client for DB insert

**Security hardening:**
- **Markdown injection prevention:** All user content is sanitized before interpolation
- **Rate limiting:** 3 submissions per hour per user
- **Metadata validation:** Whitelisted diagnostic fields, type-checked and length-capped
- **Response sanitization:** GitHub issue number is not returned to client

**Flow:**
1. Authenticates user via JWT
2. Validates title (5-200 chars) and description (10-5000 chars)
3. Sanitizes and validates session diagnostics metadata
4. Checks per-user rate limit (max 3/hour)
5. Sanitizes user content for markdown injection
6. Calls GitHub REST API to create an issue with diagnostics in a collapsible section
7. Inserts ticket record with `github_issue_number` and `github_issue_url`
8. Returns `{ success, ticketId }`

### Edge Function: `github-issue-webhook`

**Location:** `supabase/functions/github-issue-webhook/index.ts`

**Auth pattern:** No JWT -- uses HMAC-SHA256 signature verification via `X-Hub-Signature-256` header

**Events handled:**
- **`issues` (closed/reopened):** Updates `tickets.status`, sets `closed_at` and `updated_at`
- **`issue_comment` (created):** Inserts into `ticket_comments` with sanitized body

**Security:** Only processes issues with the `user-reported` label. Comment bodies are sanitized (no @mentions, no HTML). Idempotent via `github_comment_id` UNIQUE constraint.

### Session Diagnostics

When a user submits a bug report, the following anonymized data is automatically captured:

| Field | Source | Privacy |
|-------|--------|---------|
| App version | Build constant | Safe -- public |
| Browser/OS | `navigator.userAgent` | Safe |
| Route | `location.pathname` | Safe -- app route |
| Screen size | Viewport dimensions | Safe |
| Online status | `navigator.onLine` | Safe |
| Timezone | `Intl.DateTimeFormat` | Safe |
| Org plan | Context (tier only) | Safe -- no name |
| User role | Context (label only) | Safe |
| Console errors | Last 5 messages (truncated) | Safe -- no stack traces |
| Failed queries | React Query keys in error | Safe -- key names only |
| Page load time | Navigation API | Safe -- numeric |
| Memory usage | Chrome performance API | Safe -- numeric |
| Session duration | `performance.now()` | Safe -- numeric |

This data appears in GitHub issues inside a collapsible `<details>` section and is stored in `tickets.metadata` JSONB.

### Realtime Updates

Database triggers on `ticket_comments` INSERT and `tickets` UPDATE broadcast to private Supabase Realtime channels (`tickets:user:<userId>`). The frontend subscribes to these channels and automatically refetches ticket data when updates arrive.

### Frontend Components

| File | Purpose |
|------|---------|
| `src/features/tickets/components/SubmitTicketDialog.tsx` | Dialog form for submitting bug reports |
| `src/features/tickets/components/MyTickets.tsx` | List of user's submitted tickets with status |
| `src/features/tickets/components/TicketDetail.tsx` | Expandable detail with description, diagnostics, and comments |
| `src/features/tickets/hooks/useSubmitTicket.ts` | TanStack Query mutation hook |
| `src/features/tickets/hooks/useMyTickets.ts` | Query hook for fetching user's tickets with comments |
| `src/features/tickets/hooks/useTicketRealtime.ts` | Realtime subscription hook for live updates |
| `src/features/tickets/utils/sessionDiagnostics.ts` | Collects anonymized session context |
| `src/features/tickets/utils/consoleErrorBuffer.ts` | Ring buffer for recent console errors |
| `src/pages/Support.tsx` | Support page integrating all ticket components |

## Environment Setup

### Required Secret: `GITHUB_PAT`

A GitHub Personal Access Token is required for the `create-ticket` edge function to create GitHub Issues.

#### How to Generate

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token**
3. Set the following:
   - **Token name:** `EquipQR Bug Reporter` (or similar)
   - **Expiration:** Choose an appropriate expiration (recommended: 90 days, then rotate)
   - **Repository access:** Select **Only select repositories** > `Columbia-Cloudworks-LLC/EquipQR`
   - **Permissions:** Under **Repository permissions**, set **Issues** to **Read and write**
4. Click **Generate token** and copy the value

### Required Secret: `GITHUB_WEBHOOK_SECRET`

A shared secret for verifying GitHub webhook signatures (HMAC-SHA256).

#### How to Generate

```bash
openssl rand -hex 32
```

#### How to Configure the Webhook

1. Go to [GitHub repo Settings > Webhooks](https://github.com/Columbia-Cloudworks-LLC/EquipQR/settings/hooks)
2. Click **Add webhook**
3. Set:
   - **Payload URL:** `https://<supabase-url>/functions/v1/github-issue-webhook`
   - **Content type:** `application/json`
   - **Secret:** The value generated above
   - **Events:** Select **Let me select individual events** > check **Issues** and **Issue comments**
4. Click **Add webhook**

#### Where to Configure Secrets

| Environment | Location | Secrets |
|-------------|----------|---------|
| **Local dev** | `supabase/functions/.env` | `GITHUB_PAT=...` and `GITHUB_WEBHOOK_SECRET=...` |
| **Preview branch** | Supabase Dashboard > Edge Functions > Secrets | Both secrets |
| **Production** | Supabase Dashboard > Edge Functions > Secrets | Both secrets |

For complete secrets documentation, see [Supabase Branch Secrets](../ops/supabase-branch-secrets.md).

## Troubleshooting

### "An unexpected error occurred" when submitting

1. **Check `GITHUB_PAT` is set:** Check function logs for "GITHUB_PAT environment variable not set"
2. **Check token permissions:** The token must have Issues Read/Write permission
3. **Check token expiration:** Fine-grained tokens expire. Regenerate if needed

### "Failed to create GitHub issue"

1. **Check GitHub API rate limits:** Authenticated requests are limited to 5,000/hour
2. **Check the `user-reported` label exists:** If it doesn't exist, the issue is created without the label
3. **Check function logs:** Supabase Dashboard > Edge Functions > `create-ticket` > Logs

### "Failed to create ticket record"

1. **Check database connectivity:** The admin client may fail if `SUPABASE_SERVICE_ROLE_KEY` is missing
2. **Check the `tickets` table exists:** Run the migration if it hasn't been applied

### My Tickets not showing updates

1. **Check the webhook is configured:** GitHub repo Settings > Webhooks should show recent deliveries
2. **Check `GITHUB_WEBHOOK_SECRET` matches:** The secret in Supabase must match the one in GitHub
3. **Check function logs:** Supabase Dashboard > Edge Functions > `github-issue-webhook` > Logs
4. **Check Supabase Realtime:** The broadcast triggers require `realtime.send()` function to be available

### Button not visible

The "Report an Issue" button is on the **Support** page (accessible from the sidebar user dropdown > Support). It is only available in the authenticated dashboard, not the public support page.
