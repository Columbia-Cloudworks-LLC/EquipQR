-- =============================================================================
-- Migration: fix_tickets_security_and_integrity
-- Description: Addresses PR #547 review findings:
--   1. Removes direct user INSERT policy on tickets (force through edge function)
--   2. Adds partial UNIQUE index on tickets.github_issue_number
--   3. Makes ticket_comments.github_comment_id NOT NULL for reliable idempotency
--   4. Adds realtime.messages authorization policy for ticket broadcast topics
-- =============================================================================

-- 1. Remove the user INSERT policy on tickets.
--    Ticket creation must go through the create-ticket edge function (which
--    uses the service_role client) to enforce validation, sanitization, and
--    rate limiting. Allowing direct authenticated INSERT bypasses these controls.
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.tickets;

-- 2. Add a partial UNIQUE index on github_issue_number.
--    The webhook handler uses .maybeSingle() to look up tickets by issue number;
--    duplicate values would cause errors or incorrect updates.
--    Partial index excludes NULLs (rows where the GitHub issue hasn't been created yet).
CREATE UNIQUE INDEX IF NOT EXISTS uq_tickets_github_issue_number
  ON public.tickets (github_issue_number)
  WHERE github_issue_number IS NOT NULL;

-- 3. Make github_comment_id NOT NULL on ticket_comments.
--    All comments are synced from GitHub via the webhook, so this column must
--    always be populated. Without NOT NULL, PostgreSQL's UNIQUE allows multiple
--    NULL rows, breaking the idempotency guarantee of ON CONFLICT upserts.
--    First, remove any orphaned NULL rows (should not exist, but safety first).
DELETE FROM public.ticket_comments WHERE github_comment_id IS NULL;
ALTER TABLE public.ticket_comments ALTER COLUMN github_comment_id SET NOT NULL;

-- 4. Add realtime.messages authorization for ticket broadcast topics.
--    The existing policy only allows 'notifications:user:<uuid>' topics.
--    Ticket broadcasts use 'tickets:user:<uuid>' topics and need their own policy.
DROP POLICY IF EXISTS "users_receive_own_ticket_updates" ON "realtime"."messages";
CREATE POLICY "users_receive_own_ticket_updates"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'tickets:user:' || auth.uid()::text
);

COMMENT ON POLICY "users_receive_own_ticket_updates" ON "realtime"."messages" IS
  'Allows authenticated users to receive broadcasts only on their own ticket channel (tickets:user:<user_id>).';
