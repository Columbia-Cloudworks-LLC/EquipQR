# In-App Bug Reporting System

This document describes the in-app bug reporting feature that allows authenticated users to submit issue reports directly from EquipQR. Reports are stored in the `tickets` database table and automatically synced to GitHub Issues for developer tracking.

## Overview

Users can access the bug reporting form from the **Support** page in the dashboard. Submitting a report:

1. Creates a GitHub Issue in `Columbia-Cloudworks-LLC/EquipQR`, assigned to `viralarchitect` with the `user-reported` label
2. Inserts a record in the `tickets` Supabase table, linking the GitHub issue number
3. Shows a success confirmation to the user

## User Flow

1. Navigate to **Support** from the sidebar user dropdown menu
2. Click the **"Report an Issue"** button in the contact section
3. Fill in a **Title** and **Description / Steps to Reproduce**
4. Click **Submit Report**
5. A success toast is shown; the dialog closes automatically

## Privacy

The GitHub issue body contains **only the user's UUID** -- no personal information (name, email) is included. Debug context is limited to:

- Browser/OS (`navigator.userAgent`)
- Current route/URL path
- Timestamp

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
| `metadata` | JSONB | Debug context (userAgent, route, timestamp, etc.) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

**RLS Policies:**
- Users can SELECT their own tickets (`user_id = auth.uid()`)
- Users can INSERT their own tickets (`user_id = auth.uid()`)
- Service role can INSERT and UPDATE (used by the edge function)
- No DELETE policy -- intentional. Tickets are an audit trail and cannot be deleted by users.

### Edge Function: `create-ticket`

**Location:** `supabase/functions/create-ticket/index.ts`

**Auth pattern:** User-scoped auth (`requireUser()`) + admin client for DB insert

**Security hardening:**
- **Markdown injection prevention:** All user content is sanitized before being interpolated into the GitHub issue body. `@` mentions are neutralized (zero-width space inserted), HTML tags are stripped, pipe characters are escaped, and markdown link syntax is escaped. The description is wrapped in a fenced code block.
- **Rate limiting:** Users are limited to 3 ticket submissions per hour. The check queries the `tickets` table count before calling the GitHub API.
- **Metadata validation:** Only whitelisted metadata fields (`userAgent`, `currentUrl`, `timestamp`) are accepted. All values are type-checked and length-capped (500 chars). Unknown keys are discarded.
- **Response sanitization:** The GitHub issue number is not returned to the client to avoid leaking repository information.

**Flow:**
1. Authenticates user via JWT
2. Validates title (5-200 chars) and description (10-5000 chars)
3. Sanitizes metadata (whitelist fields, cap lengths)
4. Checks per-user rate limit (max 3/hour)
5. Sanitizes user content for markdown injection
6. Calls GitHub REST API to create an issue
7. Inserts ticket record with the `github_issue_number`
8. Returns `{ success, ticketId }`

**GitHub issue body template:**

```markdown
## User-Reported Issue

**Reported by:** User UUID `<uuid>`

### Description
<user-provided description>

### Debug Context
| Field | Value |
|-------|-------|
| **Browser/OS** | <userAgent> |
| **Route** | <route> |
| **Timestamp** | <ISO timestamp> |
```

### Frontend Components

| File | Purpose |
|------|---------|
| `src/features/tickets/components/SubmitTicketDialog.tsx` | Dialog form for submitting bug reports |
| `src/features/tickets/hooks/useSubmitTicket.ts` | TanStack Query mutation hook |
| `src/pages/Support.tsx` | Support page with "Report an Issue" button |

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

#### Where to Configure

| Environment | Location | Notes |
|-------------|----------|-------|
| **Local dev** | `supabase/functions/.env` | Add `GITHUB_PAT=github_pat_...` |
| **Preview branch** | Supabase Dashboard > Project Settings > Edge Functions > Secrets | Set `GITHUB_PAT` |
| **Production** | Supabase Dashboard > Project Settings > Edge Functions > Secrets | Set `GITHUB_PAT` |

For complete secrets documentation, see [Supabase Branch Secrets](../ops/supabase-branch-secrets.md).

## Troubleshooting

### "An unexpected error occurred" when submitting

1. **Check `GITHUB_PAT` is set:** The edge function requires this environment variable. Check function logs for "GITHUB_PAT environment variable not set"
2. **Check token permissions:** The token must have Issues Read/Write permission on `Columbia-Cloudworks-LLC/EquipQR`
3. **Check token expiration:** Fine-grained tokens expire. Regenerate if needed

### "Failed to create GitHub issue"

1. **Check GitHub API rate limits:** Authenticated requests are limited to 5,000/hour. Check response headers
2. **Check the `user-reported` label exists:** The function tries to apply this label. If it doesn't exist in the repo, the issue is still created but without the label
3. **Check function logs:** Navigate to Supabase Dashboard > Edge Functions > `create-ticket` > Logs

### "Failed to create ticket record"

1. **Check database connectivity:** The admin client may fail if `SUPABASE_SERVICE_ROLE_KEY` is missing or incorrect
2. **Check the `tickets` table exists:** Run the migration if it hasn't been applied

### Button not visible

The "Report an Issue" button is on the **Support** page (accessible from the sidebar user dropdown > Support). It is only available in the authenticated dashboard, not the public support page.
